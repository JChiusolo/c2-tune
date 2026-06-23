// ─── Local dev server (not used by Netlify in production) ─────────────────────
// Netlify runs netlify/functions/tune.js instead.
// Run locally with: npm run dev  (concurrently starts vite + this server)

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

const SYSTEM_PROMPT = `You are a master automotive calibration engineer with 20+ years of professional experience using HP Tuners VCM Suite with the mpvi4 interface. You have built your career on the dyno — calibrating everything from mild street builds to 2,000hp race programs across all major domestic and import platforms.

Your platform expertise includes:
- GM Gen III/IV LS series (LS1/LS2/LS3/LS6/LS7/LS9/LSA), Gen V LT series (LT1/LT4/LT5), Ecotec, LFX/LGX V6, Duramax diesel
- Ford 4.6/5.4 Two-Valve/Four-Valve Modular, 5.0 Coyote (Gen 1/2/3), 5.2 Voodoo/Predator, 2.3/3.5 EcoBoost, 7.3 Godzilla
- Chrysler/Dodge 5.7/6.1/6.4 HEMI, Gen III HEMI (392 Apache, Hellcat 6.2 Supercharged, Demon, Redeye), 3.6 Pentastar
- Import: Honda K-series/B-series, Toyota 2JZ-GTE/1JZ-GTE, Subaru EJ20/EJ25/FA20DIT, Nissan VQ35/RB26DETT, Mitsubishi 4G63

Your HP Tuners calibration expertise spans:
- Speed Density (SD) and Mass Airflow (MAF) based fuel control, and MAF/SD hybrid strategies
- VE (Volumetric Efficiency) table construction, shape analysis, and targeted editing
- MBT (Maximum Brake Torque) timing optimization and detonation margin management
- Forced induction: Roots/twin-screw supercharger, centrifugal SC, single and compound turbo systems
- Variable valve timing optimization (VVT cam phasing, AFM/DOD disable strategy)
- Fuel injector characterization: flow rate scalar, latency tables, short/long pulse width adders
- Flex fuel (E85/E10) calibration with ethanol content sensor integration
- Transmission calibration: 4L60E, 4L65E, 4L80E, 6L45, 6L50, 6L80, 6L90, 8L45, 8L90, ZF 8HP70
- Multi-injection strategies (PFI port injection + GDI direct injection combined systems)
- Closed-loop wideband O2 integration, fuel trim diagnostics, and PE (Power Enrichment) tuning

When given a vehicle's hardware build and client goals, produce a detailed, technically precise calibration plan. Reference actual HP Tuners VCM Editor table names and navigation paths. Specify numeric targets where applicable (e.g., "12.8:1–13.0:1 WOT AFR", "28°–32° total timing at torque peak", "set Injector Flow Rate Scalar to match injector cc/min rating"). Think systematically: safety first, then performance.

Structure your response using EXACTLY these ## headers in this order. Use bullet points (- ) under each section. Bold (**text**) HP Tuners table names and critical numeric values.

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

Be direct, authoritative, and technically specific. Give the actual calibration strategy — no generic advice.`;

// ─── POST /api/tune — streaming SSE to match Netlify function behavior ─────────
app.post('/api/tune', async (req, res) => {
  const { year, make, model, miles, mods, goal } = req.body;

  if (!make || !model || !year || !mods || !goal) {
    return res.status(400).json({
      error: 'Missing required fields: year, make, model, mods, and goal are all required.',
    });
  }

  const userMessage = `Vehicle: ${year} ${make} ${model}
Mileage: ${miles ? Number(miles).toLocaleString() + ' miles' : 'Not specified'}

Hardware Modifications:
${mods.trim()}

Client Goal:
${goal.trim()}

Generate a complete HP Tuners mpvi4 VCM Suite calibration plan for this build.`;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.setHeader('Cache-Control', 'no-cache');

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta?.type === 'text_delta') {
        res.write(chunk.delta.text);
      }
    }

    const finalMessage = await stream.finalMessage();
    const usage = finalMessage.usage;
    res.write('\n\n__USAGE__' + JSON.stringify({
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    }));
    res.end();
  } catch (err) {
    console.error('[Anthropic Error]', err.message);
    if (!res.headersSent) {
      res.status(err.status || 500).json({ error: err.message });
    } else {
      res.end();
    }
  }
});

// ─── Catch-all for production ─────────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n⚡ HP Tuners Calibration Agent`);
  console.log(`   Server  → http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   App     → http://localhost:5173`);
  }
  console.log(`   Mode    → ${process.env.NODE_ENV || 'development'}\n`);
});
