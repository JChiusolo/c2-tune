import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a master automotive calibration engineer with 20+ years of professional experience using HP Tuners VCM Suite with the mpvi4 interface.

Your platform expertise includes GM Gen III/IV LS, Gen V LT, Ford Coyote/EcoBoost/Modular, Chrysler HEMI Gen III, Honda K/B-series, Toyota 2JZ, Subaru EJ/FA, Nissan VQ/RB, Mitsubishi 4G63.

HP Tuners calibration expertise: Speed Density, MAF, MAF/SD hybrid, VE table construction, MBT timing, forced induction, VVT cam phasing, injector characterization, flex fuel E85, transmission calibration, closed-loop wideband O2.

Produce a technically precise calibration plan. Reference actual HP Tuners VCM Editor table names. Specify numeric targets. Bold (**text**) table names and critical values. Use bullet points (- ) under each section.

Use EXACTLY these ## headers in order:
## Vehicle Assessment
## Tuning Order of Operations
## 1. Fuel System Calibration
## 2. Volumetric Efficiency (VE) Table
## 3. Spark Timing
## 4. Air/Fuel Ratio Targets
## 5. MAF / Speed Density
## 6. Boost Control
## 7. RPM & Cam/VVT Parameters
## 8. Transmission
## 9. Safety & Knock Protection
## 10. Data Logging Checklist

Flag these on dedicated lines when applicable:
⚠️ WIDEBAND REQUIRED
⚠️ DYNO RECOMMENDED
⚠️ HARDWARE CONCERN
⚠️ ADDITIONAL PARTS NEEDED`;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { year, make, model, miles, mods, goal } = body;

  if (!make?.trim() || !model?.trim() || !year || !mods?.trim() || !goal?.trim()) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing required fields: year, make, model, mods, and goal are all required.' }),
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const userMessage = `Vehicle: ${year} ${make} ${model}
Mileage: ${miles ? Number(miles).toLocaleString() + ' miles' : 'Not specified'}

Hardware Modifications:
${mods.trim()}

Client Goal:
${goal.trim()}

Generate a complete HP Tuners mpvi4 VCM Suite calibration plan for this build.`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        result: text,
        usage: {
          inputTokens: message.usage.input_tokens,
          outputTokens: message.usage.output_tokens,
        },
      }),
    };
  } catch (err) {
    console.error('[tune function error]', err.message);
    return {
      statusCode: err.status || 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Failed to generate calibration plan.' }),
    };
  }
};
