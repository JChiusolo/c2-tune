import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

// ─── Startup validation ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['ANTHROPIC_API_KEY'];
const MISSING = REQUIRED_ENV.filter((k) => !process.env[k]);
if (MISSING.length) {
  console.error(`[FATAL] Missing required environment variables: ${MISSING.join(', ')}`);
  process.exit(1);
}

const AWS_CONFIGURED =
  process.env.AWS_STATE_MACHINE_ARN &&
  process.env.AWS_REGION &&
  process.env.AWS_DYNAMODB_TABLE;

if (!AWS_CONFIGURED) {
  console.warn('[WARN] AWS env vars not set — "Export to VCM Editor" feature will be disabled.');
}

// ─── Setup ─────────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '50kb' }));

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const tuneLimiter = rateLimit({
  windowMs: 60 * 1000,       // 1 minute
  max: 10,                    // 10 tune requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please wait a moment before generating another plan.' },
});

const csvLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,                     // 5 CSV exports per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many export requests — please wait before submitting another job.' },
});

// ─── Serve built frontend in production ───────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(join(__dirname, 'dist')));
}

// ─── Anthropic client ──────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── AWS clients (only initialised when env vars are present) ─────────────────
let sfnClient = null;
let ddbDocClient = null;

if (AWS_CONFIGURED) {
  sfnClient = new SFNClient({ region: process.env.AWS_REGION });

  const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
  ddbDocClient = DynamoDBDocumentClient.from(ddbClient, {
    marshallOptions: { removeUndefinedValues: true },
  });
}

// ─── Expert HP Tuners System Prompt ───────────────────────────────────────────
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

When given a vehicle's hardware build and client goals, produce a detailed, technically precise calibration plan. Reference actual HP Tuners VCM Editor table names and navigation paths. Specify numeric targets where applicable. Think systematically: safety first, then performance.

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

Flag any of these on a dedicated line when applicable:
⚠️ WIDEBAND REQUIRED — mandatory before operating the vehicle under load
⚠️ DYNO RECOMMENDED — street tuning alone is insufficient and unsafe for this build
⚠️ HARDWARE CONCERN — a hardware mismatch or deficiency that software cannot safely resolve
⚠️ ADDITIONAL PARTS NEEDED — hardware additions required before calibration can proceed`;

// ─── Helper: validate job ID format (prevent path traversal) ──────────────────
function isValidJobId(id) {
  return typeof id === 'string' && /^[0-9]{13}-[a-f0-9]{8}$/.test(id);
}

// ─── POST /api/tune ────────────────────────────────────────────────────────────
app.post('/api/tune', tuneLimiter, async (req, res) => {
  const { year, make, model, miles, mods, goal } = req.body;

  if (!make?.trim() || !model?.trim() || !year || !mods?.trim() || !goal?.trim()) {
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

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = message.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n');

    res.json({
      result: text,
      usage: {
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      },
    });
  } catch (err) {
    console.error('[/api/tune error]', err.message);
    res.status(err.status || 500).json({ error: err.message || 'Failed to generate calibration plan.' });
  }
});

// ─── POST /api/generate-csv ────────────────────────────────────────────────────
// Submits a calibration plan to the AWS Step Functions pipeline for CSV generation.
app.post('/api/generate-csv', csvLimiter, async (req, res) => {
  if (!AWS_CONFIGURED) {
    return res.status(503).json({
      error: 'AWS pipeline is not configured. Add AWS environment variables to enable CSV export.',
    });
  }

  const { calibrationText, pcmFamily, vehicleInfo } = req.body;

  if (!calibrationText?.trim()) {
    return res.status(400).json({ error: 'calibrationText is required.' });
  }
  if (calibrationText.length > 30000) {
    return res.status(400).json({ error: 'calibrationText exceeds maximum allowed length.' });
  }

  const timestamp = Date.now();
  const randomHex = crypto.randomBytes(4).toString('hex');
  const jobId = `${timestamp}-${randomHex}`;

  const executionInput = {
    job_id: jobId,
    table_type: 've_table',
    notification_email: process.env.NOTIFICATION_EMAIL,
    vehicle_info: vehicleInfo || {},
    extract_output: {
      pcm_family: pcmFamily || 'NGC4',
      calibration_text: calibrationText.trim(),
    },
  };

  try {
    const command = new StartExecutionCommand({
      stateMachineArn: process.env.AWS_STATE_MACHINE_ARN,
      name: jobId,
      input: JSON.stringify(executionInput),
    });

    await sfnClient.send(command);

    console.log(`[/api/generate-csv] Job submitted: ${jobId} | PCM: ${pcmFamily || 'NGC4'}`);

    res.json({ jobId, status: 'submitted' });
  } catch (err) {
    console.error('[/api/generate-csv error]', err.message);
    res.status(500).json({ error: 'Failed to submit CSV generation job. Check AWS configuration.' });
  }
});

// ─── GET /api/csv-status/:jobId ───────────────────────────────────────────────
// Polls DynamoDB for job status. Returns status + download URLs when complete.
app.get('/api/csv-status/:jobId', async (req, res) => {
  if (!AWS_CONFIGURED) {
    return res.status(503).json({ error: 'AWS pipeline is not configured.' });
  }

  const { jobId } = req.params;

  if (!isValidJobId(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID format.' });
  }

  try {
    const result = await ddbDocClient.send(
      new GetCommand({
        TableName: process.env.AWS_DYNAMODB_TABLE,
        Key: { job_id: jobId },
      })
    );

    if (!result.Item) {
      // Job not yet written to DynamoDB — still initialising
      return res.json({ status: 'processing', jobId });
    }

    const { status, download_urls, error_message, created_at, completed_at } = result.Item;

    res.json({
      jobId,
      status: status?.toLowerCase() || 'processing',
      downloadUrls: download_urls || null,
      errorMessage: error_message || null,
      createdAt: created_at || null,
      completedAt: completed_at || null,
    });
  } catch (err) {
    console.error('[/api/csv-status error]', err.message);
    res.status(500).json({ error: 'Failed to retrieve job status.' });
  }
});

// ─── GET /api/health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '2.0.0',
    awsPipeline: AWS_CONFIGURED ? 'configured' : 'not configured',
    timestamp: new Date().toISOString(),
  });
});

// ─── Catch-all: serve React app in production ─────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  app.get('*', (_req, res) => {
    res.sendFile(join(__dirname, 'dist', 'index.html'));
  });
}

// ─── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n⚡ HP Tuners Calibration Agent v2.0`);
  console.log(`   Server      → http://localhost:${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   App         → http://localhost:5173`);
  }
  console.log(`   AWS Pipeline → ${AWS_CONFIGURED ? 'enabled' : 'disabled (set AWS env vars to enable)'}`);
  console.log(`   Mode         → ${process.env.NODE_ENV || 'development'}\n`);
});
