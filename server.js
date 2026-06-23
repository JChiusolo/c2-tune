// ─── Local dev server — mirrors netlify/functions/tune.js behavior ─────────────
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10kb' }));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Section definitions (must stay in sync with netlify/functions/tune.js) ───
const BASE_IDENTITY = `You are a master automotive calibration engineer with 20+ years of professional experience using HP Tuners VCM Suite with the mpvi4 interface. You have built your career on the dyno — calibrating everything from mild street builds to 2,000hp race programs across all major domestic and import platforms.

Your platform expertise includes GM Gen III/IV LS, Gen V LT, Ecotec, Duramax; Ford Modular, Coyote, EcoBoost, Godzilla; Chrysler HEMI (including Hellcat/Demon); and imports including K-series, 2JZ-GTE, EJ/FA Subaru, VQ35, RB26, 4G63.

Reference actual HP Tuners VCM Editor table names and navigation paths. Specify numeric targets where applicable. Be direct, authoritative, and technically specific — no generic advice.`;

const SECTIONS = {
  'vehicle-assessment': { header: '## Vehicle Assessment',               systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY the ## Vehicle Assessment section. Use bullet points. Bold HP Tuners table names and critical numeric values. Analyze the stock ECU baseline, how listed mods alter airflow/combustion/fueling, which tables are most impacted, and platform-specific quirks.` },
  'tuning-order':       { header: '## Tuning Order of Operations',        systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY the ## Tuning Order of Operations section. Number each step. For each: what you are doing, why it happens at this point, and what data logging must confirm before advancing.` },
  'fuel-system':        { header: '## 1. Fuel System Calibration',        systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 1. Fuel System Calibration. Cover: injector scalar, latency tables, base fuel pressure, OL/CL boundaries, STFT/LTFT targets, PE table AFR targets, accel enrichment.` },
  've-table':           { header: '## 2. Volumetric Efficiency (VE) Table', systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 2. Volumetric Efficiency (VE) Table. Cover: VE curve shape changes vs stock, % magnitude by RPM range, low/mid/high RPM strategy, CEQ vs measured airflow choice, autotune vs manual entry.` },
  'spark-timing':       { header: '## 3. Spark Timing',                   systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 3. Spark Timing. Cover: MBT targets by RPM range, light vs high load advance, detonation margin, knock sensor gain, minimum timing limit, cylinder offsets if applicable.` },
  'afr-targets':        { header: '## 4. Air/Fuel Ratio Targets',         systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 4. Air/Fuel Ratio Targets. Cover: idle lambda, cruise targets, WOT lambda by octane/compression, FI WOT targets if boosted, catalyst protection, CL authority limits.` },
  'maf-sd':             { header: '## 5. MAF / Speed Density',            systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 5. MAF / Speed Density. Make a definitive MAF/SD/hybrid recommendation and justify it. Cover transfer function editing or SD MAP sensor selection, IAT/Baro correction, HP Tuners steps to enable chosen mode.` },
  'boost-control':      { header: '## 6. Boost Control',                  systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 6. Boost Control. If NA, state so. If boosted: wastegate DC table, boost targets by RPM/gear, overboost cut, IAT-based reduction, knock-retard integration, solenoid frequency, transient management.` },
  'rpm-cam-vvt':        { header: '## 7. RPM & Cam/VVT Parameters',       systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 7. RPM & Cam/VVT Parameters. Cover: rev limiter RPM, spark vs fuel cut strategy, VVT cam advance table targets by RPM/load, AFM/DOD/MDS disable steps, idle speed/spark/fuel tables.` },
  'transmission':       { header: '## 8. Transmission',                   systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 8. Transmission. If manual, state so. If auto: identify unit, shift points, TCC lockup map, line pressure increases, shift firmness, torque management strategy, WOT hold.` },
  'safety-knock':       { header: '## 9. Safety & Knock Protection',      systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 9. Safety & Knock Protection. Cover: knock sensor gain, per-event retard amount, max cumulative retard, recovery rate, lean protection thresholds, coolant over-temp retard, oil pressure protection, fuel cut safeguards.` },
  'data-logging':       { header: '## 10. Data Logging Checklist',        systemPrompt: `${BASE_IDENTITY}\n\nGenerate ONLY ## 10. Data Logging Checklist. For each channel: VCM Scanner name, target value, abort threshold. Cover: load/airflow, fuel trims, spark/knock, temps, boost if applicable, transmission if applicable, wideband setup, sample rate, platform PIDs. End with applicable ⚠️ flags.` },
};

// ─── POST /api/tune ────────────────────────────────────────────────────────────
app.post('/api/tune', async (req, res) => {
  const { year, make, model, miles, mods, goal, section } = req.body;

  if (!make || !model || !year || !mods || !goal) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  const sectionDef = SECTIONS[section];
  if (!sectionDef) {
    return res.status(400).json({ error: `Unknown section: "${section}"` });
  }

  const userMessage = `Vehicle: ${year} ${make} ${model}
Mileage: ${miles ? Number(miles).toLocaleString() + ' miles' : 'Not specified'}

Hardware Modifications:
${mods.trim()}

Client Goal:
${goal.trim()}

Generate the "${sectionDef.header}" section. Start your response directly with the ## header. Be thorough — you have the full token budget for this section alone.`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: sectionDef.systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(chunk.delta.text);
      }
    }

    const final = await stream.finalMessage();
    res.write('\n\n__USAGE__' + JSON.stringify({
      inputTokens: final.usage.input_tokens,
      outputTokens: final.usage.output_tokens,
    }));
    res.end();
  } catch (err) {
    console.error('[Anthropic Error]', err.message);
    if (!res.headersSent) res.status(err.status || 500).json({ error: err.message });
    else res.end();
  }
});

if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')));
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n⚡ HP Tuners Calibration Agent`);
  console.log(`   Server  → http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') console.log(`   App     → http://localhost:5173`);
  console.log(`   Mode    → ${process.env.NODE_ENV || 'development'}\n`);
});
