import Anthropic from '@anthropic-ai/sdk';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// ─── Expert persona (shared across all sections) ──────────────────────────────
const PERSONA = `You are a master automotive calibration engineer with 20+ years of professional HP Tuners VCM Suite mpvi4 experience across GM LS/LT, Ford Coyote/EcoBoost/Modular, Chrysler HEMI Gen III, and major import platforms.

Always:
- Reference actual HP Tuners VCM Editor table and parameter names
- Bold (**text**) every HP Tuners table name and critical numeric value
- Use bullet points (- ) for all items
- Include specific numeric targets (degrees, AFR, psi, %, RPM) wherever applicable
- Flag ⚠️ WIDEBAND REQUIRED or ⚠️ DYNO RECOMMENDED when genuinely necessary
- Be direct and technically precise — no generic advice`;

// ─── Section-specific focused prompts ─────────────────────────────────────────
const SECTION_PROMPTS = {
  'vehicle-assessment': `${PERSONA}

For the vehicle and hardware build below, generate a Vehicle Assessment covering:
- Stock ECU platform identification: PCM type, OS, and baseline calibration strategy
- How each hardware modification changes airflow capacity, combustion, and fueling demand
- Top calibration challenges this build presents
- Recommended fuel control strategy: MAF / Speed Density / MAF+SD hybrid, with reasoning
- Any hardware concerns or missing components that must be resolved before calibration begins`,

  'tuning-order': `${PERSONA}

For the vehicle and hardware build below, generate a Tuning Order of Operations covering:
- Numbered sequence of calibration steps in correct dependency order
- For each step: what to do, what data logging must confirm before advancing, dyno vs. street suitability
- Clear go/no-go criteria between each phase
- Which steps can be parallelised vs. strictly sequential`,

  'fuel-system': `${PERSONA}

For the vehicle and hardware build below, generate Fuel System Calibration recommendations covering:
- **Injector Flow Rate Scalar**: target cc/min based on injector specs, direction from stock
- **Injector Latency Table**: short pulse width offset values at 12V, 13V, 14V
- **Base Fuel Pressure**: target and return vs. returnless notes
- **Power Enrichment (PE) Table**: WOT AFR/lambda targets by RPM band, TPS% enable threshold
- **Short Term Fuel Trim (STFT) / Long Term Fuel Trim (LTFT)**: acceptable window (±%), concern threshold
- **Accel Enrichment Tables**: tip-in enrichment direction for this build
- **Closed Loop Enable/Disable**: appropriate thresholds`,

  've-table': `${PERSONA}

For the vehicle and hardware build below, generate VE Table calibration recommendations covering:
- **Volumetric Efficiency Table**: how hardware changes the VE curve shape and magnitude
- Cell regions most impacted and expected % change direction:
  - Idle cells (< 1 500 RPM, low load)
  - Cruise cells (1 500–3 500 RPM, part load)
  - Torque peak cells (3 500–5 500 RPM, high load)
  - WOT cells (full load across RPM range)
- **Commanded Equivalence Ratio** vs. **Measured Airflow** approach recommendation
- VE autotune vs. manual cell entry recommendation for this build
- Overall expected VE change magnitude and which axis bins to focus on first`,

  'spark-timing': `${PERSONA}

For the vehicle and hardware build below, generate Spark Timing calibration recommendations covering:
- **Spark Advance Table**: MBT timing targets by RPM range with specific degree (BTDC) values:
  - Idle
  - 1 500–3 000 RPM cruise
  - 3 000–5 000 RPM
  - 5 000+ RPM WOT
- Detonation safety margin for this octane, build, and compression ratio
- **High Load Minimum Spark Advance**: timing floor at WOT
- **Knock Sensor Calibration**: threshold adjustment for aftermarket cam/header mechanical noise
- Cylinder-specific timing offsets if applicable`,

  'afr-targets': `${PERSONA}

For the vehicle and hardware build below, generate Air/Fuel Ratio Target recommendations covering:
- Idle AFR/lambda target with rationale
- Steady-state cruise AFR targets (stoich vs. lean cruise strategy)
- **Power Enrichment (PE) Table** WOT lambda/AFR targets by RPM:
  - 2 500–4 000 RPM
  - 4 000–6 000 RPM
  - 6 000+ RPM
- Fuel type adjustments (91 oct / 93 oct / E30 / E85 targets)
- **Closed Loop Fuel Control** authority limits and WOT disable threshold
- Catalyst protection enrichment threshold
⚠️ WIDEBAND REQUIRED`,

  'maf-sd': `${PERSONA}

For the vehicle and hardware build below, generate MAF vs. Speed Density strategy recommendations covering:
- Decision with reasoning: retain stock MAF / full Speed Density / MAF+SD hybrid
- If retaining MAF:
  - **MAF Transfer Function**: which voltage/frequency breakpoints to adjust, correction direction and magnitude
  - MAF housing diameter sizing if upgrading
- If converting to Speed Density:
  - MAP sensor selection (1-bar / 2-bar / 3-bar) with rationale
  - **Speed Density Airflow Table** setup approach
  - **IAT Correction Table** setup for this sensor location
  - **Barometric Pressure Correction** setup
- If hybrid: blend percentage rationale and transition threshold
- **IAT Sensor** placement recommendation`,

  'boost-control': `${PERSONA}

For the vehicle and hardware build below, generate Boost Control recommendations.
If naturally aspirated, state "N/A — naturally aspirated build" briefly and provide high-load spark and fuel management guidance instead.
For forced induction, cover:
- **Boost Target Table**: target boost pressure by RPM in psi/kPa
- **Wastegate Duty Cycle Base Table**: starting DC% by RPM
- Open loop vs. closed loop boost control recommendation
- Overboost cut threshold (psi above target)
- **IAT-Based Boost Reduction Table**: psi pulled per °F/°C of IAT rise
- **Boost Solenoid**: type and frequency (Hz)
- Transient boost spike management`,

  'rpm-cam-vvt': `${PERSONA}

For the vehicle and hardware build below, generate RPM and Cam/VVT calibration recommendations covering:
- **Rev Limiter**: appropriate RPM ceiling for this hardware with reasoning (valve float, rods, bearings)
- Spark-cut vs. fuel-cut rev limit strategy
- If VVT/variable cam timing is present:
  - **Cam Phasing Table**: advance targets by RPM and MAP in degrees
  - Idle, part-throttle economy, and WOT cam position targets
- **AFM/DOD/MDS Cylinder Deactivation Disable**: procedure if applicable to this platform
- **Idle Speed Target**: appropriate RPM for this cam profile
- **Idle Spark Table** and **Idle Fuel Table** targets
- **IAC Steps** adjustment if IAC motor platform`,

  'transmission': `${PERSONA}

For the vehicle and hardware build below, generate Transmission calibration recommendations.
If manual transmission, state that briefly and note any relevant outputs (rev limit, launch control if applicable).
For automatic transmissions, cover:
- Transmission model identification and calibration approach
- **Upshift Points Table**: recommended shift RPM per gear — performance mode vs. street mode
- **Downshift Points Table**: kickdown thresholds
- **Torque Converter Clutch (TCC) Lockup Map**: engage/disengage thresholds, slip target (RPM)
- **Line Pressure Table**: base pressure increase for this torque level (psi above stock)
- **Shift Firmness / Accumulator Settings**: recommendation for this build
- Torque management during shifts: enable/disable recommendation`,

  'safety-knock': `${PERSONA}

For the vehicle and hardware build below, generate Safety and Knock Protection calibration recommendations covering:
- **Knock Sensor Gain Table**: sensitivity setting for this engine's mechanical noise signature — tighten or loosen, by how much
- **Knock Retard Per Event**: degrees to pull per detected knock event
- **Maximum Cumulative Knock Retard**: total retard ceiling for this build
- **Knock Retard Recovery Rate**: degrees per second to recover after knock clears
- **Lean AFR Protection**: threshold AFR/lambda that triggers spark retard or fuel cut
- **Coolant Over-Temperature Spark Retard Table**: retard vs. ECT in °F
- **Oil Pressure Protection**: minimum threshold if platform-supported
- Wideband monitoring requirements during WOT pulls`,

  'data-logging': `${PERSONA}

For the vehicle and hardware build below, generate a Data Logging Checklist for HP Tuners VCM Scanner.
Format each item as: Channel | Target value | Red-flag threshold (abort run).

Include:
- Engine RPM, MAP (kPa), MAF (g/s), TPS (%), Injector Pulse Width (ms)
- STFT Bank 1 & 2, LTFT Bank 1 & 2
- Knock Retard per cylinder and total, Spark Advance (actual)
- IAT (°F), ECT (°F), Wideband O2 AFR/lambda
- Fuel Trim Cell (RPM × MAP cell currently targeted)
- For boosted builds: Boost Pressure, Boost Target, Wastegate DC%
- For VVT builds: Cam Phasing Actual vs. Commanded B1/B2
- Recommended log rate (samples/sec)
- Pre-pull checklist (minimum temperatures, fuel level)
- Key data patterns that indicate a problem on a WOT pull`,
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) }; }

  const { year, make, model, miles, mods, goal, section } = body;

  if (!make?.trim() || !model?.trim() || !year || !mods?.trim() || !goal?.trim()) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields: year, make, model, mods, goal' }) };
  }
  if (!section || !SECTION_PROMPTS[section]) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: `Unknown section key: "${section}"` }) };
  }

  const systemPrompt = SECTION_PROMPTS[section];

  const userMessage =
`Vehicle: ${year} ${make} ${model}
Mileage: ${miles ? Number(miles).toLocaleString() + ' miles' : 'Not specified'}

Hardware Modifications:
${mods.trim()}

Client Goal:
${goal.trim()}`;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,   // Focused per-section output — keeps calls well inside the 26s Netlify timeout
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    });

    const text = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        result: text,
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
      }),
    };
  } catch (err) {
    console.error('[tune-section error]', err.message);
    return {
      statusCode: err.status || 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Failed to generate section.' }),
    };
  }
};
