# C-Tuner — Project Knowledge Document
> Consolidated foundation for all future development sessions.
> Last updated from conversation history: July 2026.

---

## 1. What the App Does

C-Tuner is an internal AI-powered HP Tuners calibration planning tool. A technician enters vehicle details and hardware modifications, then clicks individual section buttons to generate calibration plans for each of 12 sections. Each section is an independent API call to Claude claude-sonnet-4-6 with a dedicated 8,192-token budget. Output streams to the UI token-by-token in real time. Completed sections can be exported to HP Tuners-compatible CSV files via an AWS Step Functions pipeline.

The tool is internal — customers never see it. It is the fulfillment backend for the three-brand business (Shift Forge, Apex Bureau, Clearpath Auto).

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite 5, plain inline styles (no Tailwind), lucide-react icons |
| Hosting | Netlify (static site + Edge Functions) |
| AI backend | Netlify Edge Function → Anthropic claude-sonnet-4-6 via `@anthropic-ai/sdk` |
| CSV export | AWS Step Functions pipeline (existing integration) |
| Local dev | Node/Express `server.js` + Vite dev server via `concurrently` |
| Repo | github.com/JChiusolo/c2-tune |
| Deploy URL | c2tune.netlify.app |

---

## 3. Repository File Structure

```
c2-tune/
├── netlify.toml                          # Build config + edge function routing
├── package.json                          # type: "module", scripts: dev/build/start
├── vite.config.js                        # React plugin, dev proxy /api → localhost:3001
├── server.js                             # Local dev Express server (mirrors edge function)
├── env.example                           # ANTHROPIC_API_KEY=your_key_here (placeholder only)
│
├── netlify/
│   └── edge-functions/
│       └── tune-section.js               # THE production AI endpoint (Edge Function)
│
├── public/
│   └── index.html
│
└── src/
    ├── main.jsx                          # React entry point
    ├── index.css                         # Design tokens + global styles
    │
    ├── api/
    │   ├── tuner.js                      # streamSection() — fetch + ReadableStream client
    │   └── aws.js                        # submitCsvJob() + pollCsvStatus() for CSV export
    │
    └── components/
        ├── Header.jsx                    # Top bar: logo, "C-Tuner High Performance", hptuners.com link
        ├── VehicleForm.jsx               # Sidebar form + 12 section buttons (SECTION_BUTTONS exported)
        ├── CalibrationReport.jsx         # Main panel: per-section output cards + ExportCsvButton
        ├── HistoryPanel.jsx              # localStorage history list in sidebar
        └── Icons.jsx                     # Custom icon wrappers (IconCopy, IconCheck, etc.)
```

---

## 4. The 12 Sections (SECTION_BUTTONS — single source of truth in VehicleForm.jsx)

```js
export const SECTION_BUTTONS = [
  { key: 'vehicle-assessment', label: 'Vehicle Assessment' },
  { key: 'tuning-order',       label: 'Tuning Order of Operations' },
  { key: 'fuel-system',        label: '1. Fuel System Calibration' },
  { key: 've-table',           label: '2. Volumetric Efficiency (VE) Table' },
  { key: 'spark-timing',       label: '3. Spark Timing' },
  { key: 'afr-targets',        label: '4. Air/Fuel Ratio Targets' },
  { key: 'maf-sd',             label: '5. MAF / Speed Density' },
  { key: 'boost-control',      label: '6. Boost Control' },
  { key: 'rpm-cam-vvt',        label: '7. RPM & Cam/VVT Parameters' },
  { key: 'transmission',       label: '8. Transmission' },
  { key: 'safety-knock',       label: '9. Safety & Knock Protection' },
  { key: 'data-logging',       label: '10. Data Logging Checklist' },
];
```

`SECTION_BUTTONS` is exported from `VehicleForm.jsx` and imported in both `App.jsx` and `CalibrationReport.jsx`. It is the single source of truth — never duplicate this list.

---

## 5. Data Flow

```
User fills form → clicks section button
  ↓
App.jsx: handleRunSection(key)
  → sets sectionResults[key].status = 'running'
  → calls streamSection(formData, key, onChunk) from src/api/tuner.js
      ↓
      POST /api/tune-section  { ...formData, section: key }
          ↓
          netlify/edge-functions/tune-section.js
          → validates fields + section key
          → Netlify.env.get('ANTHROPIC_API_KEY')
          → client.messages.stream({ model, max_tokens: 8192, system: sectionDef.prompt, ... })
          → ReadableStream pipes text_delta chunks to response
          → appends \n\n__USAGE__{...} sentinel at end
          ↓
      tuner.js ReadableStream reader
      → calls onChunk(chunk) for each text fragment
      → detects __USAGE__ sentinel, parses token counts
      → returns { inputTokens, outputTokens }
  ↓
App.jsx onChunk: accumulates in resultRefs.current[key], calls setSectionResults(...)
  → CalibrationReport re-renders with live text
  ↓
On completion: sectionResults[key].status = 'done', usage saved
  → persisted to localStorage history
```

---

## 6. State Shape (App.jsx)

```js
// sectionResults — one entry per section key
{
  'vehicle-assessment': { status: 'idle'|'running'|'done'|'error', result: '', error: '', usage: null },
  'tuning-order':       { ... },
  // ... all 12 keys always present, never undefined
}

// runningKey — which section is currently streaming (only one at a time)
runningKey: string | null

// formData
{ year: '', make: '', model: '', miles: '', mods: '', goal: '' }

// history — array of session objects in localStorage
[{
  id: string,
  timestamp: number,
  year, make, model, miles, mods, goal,
  sections: {
    [key]: { result: string, usage: { inputTokens, outputTokens } }
  }
}]
```

---

## 7. Edge Function — Critical Details

**File:** `netlify/edge-functions/tune-section.js`

**Three things that must never change or the function crashes with 502:**

1. **Import:** `import Anthropic from '@anthropic-ai/sdk';`
   — bare specifier, resolved by Netlify's bundler from node_modules
   — NOT `npm:@anthropic-ai/sdk` (raw Deno, not supported by Netlify edge runtime)
   — NOT `https://esm.sh/...` (Node ESM loader rejects https: protocol)

2. **Env var:** `const apiKey = Netlify.env.get('ANTHROPIC_API_KEY');`
   — NOT `process.env.ANTHROPIC_API_KEY`
   — NOT `Deno.env.get()`

3. **Config export:** `export const config = { path: '/api/tune-section' };`
   — must be at the bottom of the file
   — must match the `[[edge_functions]]` path in netlify.toml

**netlify.toml must have:**
```toml
[[edge_functions]]
  path     = "/api/tune-section"
  function = "tune-section"
```

**Model config:**
- Model: `claude-sonnet-4-6`
- max_tokens: `8192` (hard limit for Sonnet 4.6, never lower this)
- Each section has its own system prompt focused exclusively on that domain

**Stream sentinel protocol:**
- Text chunks flow as raw text
- After stream ends, function appends: `\n\n__USAGE__{"inputTokens":N,"outputTokens":N}`
- Error case appends: `\n\n__ERROR__{"error":"message"}`
- `tuner.js` watches for these sentinels in the buffer

---

## 8. netlify.toml

```toml
[build]
  command  = "npm run build"
  publish  = "dist"

[functions]
  node_bundler = "esbuild"

[[edge_functions]]
  path     = "/api/tune-section"
  function = "tune-section"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

---

## 9. Local Dev

```bash
npm run dev
# Starts: vite --port 5173  +  node server.js (port 3001)
```

`vite.config.js` proxies `/api` → `http://localhost:3001` in dev only.

`server.js` mirrors the edge function exactly: same 12 section keys, same system prompts, same streaming protocol with `__USAGE__` sentinel. When updating section prompts, update both files.

---

## 10. CalibrationReport.jsx — Prop Contract

```jsx
// CORRECT — what App.jsx passes
<CalibrationReport
  vehicle={formData}           // { year, make, model, miles, mods, goal }
  sectionResults={sectionResults}  // { [key]: { status, result, error, usage } }
  SECTION_BUTTONS={SECTION_BUTTONS}  // imported from VehicleForm.jsx
/>

// WRONG — old single-report API (caused blank screen after AWS integration)
<CalibrationReport report={string} vehicle={...} usage={...} />
```

CalibrationReport renders only sections where `status !== 'idle'`. The AWS `ExportCsvButton` appears below all sections once `combinedReport` (concatenated done sections) is non-empty.

---

## 11. VehicleForm.jsx — Prop Contract

```jsx
<VehicleForm
  data={formData}               // form field values
  onChange={setFormData}        // (newData) => void
  onRunSection={handleRunSection} // (key) => void — called when a section button is clicked
  runningKey={runningKey}       // string|null — which key is running (greys out others)
  sectionResults={sectionResults} // for button status coloring (idle/running/done/error)
/>
```

There is NO `onSubmit` prop. There is NO "Generate Calibration Plan" button. The 12 section buttons ARE the submit mechanism.

---

## 12. AWS CSV Export

The `ExportCsvButton` component in `CalibrationReport.jsx` uses:
- `submitCsvJob({ calibrationText, pcmFamily, vehicleInfo })` from `src/api/aws.js`
- `pollCsvStatus(jobId, onProgress)` from `src/api/aws.js`

It receives `report` (combined string of all done sections) and `vehicle` (formData).

PCM families supported: NGC4, E38, E67, Ford PCM.

The AWS pipeline: Extract → CSV gen → Nav guide → Validate → email with download links (72hr expiry).

---

## 13. Bugs Fixed in This Conversation (Do Not Reintroduce)

| Bug | Symptom | Fix |
|---|---|---|
| Missing `netlify.toml` | Blank screen on deploy | Added with build command, publish dir, redirects |
| Real API key in `env.example` | Netlify secrets scan failed build | Replace with placeholder text only |
| Express syntax in edge function (`res.json()`) | 502 immediately | Edge functions return `new Response(...)`, not Express res |
| `client` not instantiated in edge function | 502 | Instantiate inside handler, not at module level |
| `max_tokens: 4096` | Truncated at section 2 | Raised to 8192 (Sonnet 4.6 hard max) |
| Single API call for all 12 sections | Always truncated | Restructured to one call per section with full 8192 budget |
| `npm:@anthropic-ai/sdk` import | 502, ERR_UNSUPPORTED_ESM_URL_SCHEME | Use bare specifier `@anthropic-ai/sdk` |
| `Deno.env.get()` | Runtime crash | Use `Netlify.env.get()` |
| `https://esm.sh/...` import | 502, Node ESM loader rejects https: | Use bare specifier |
| CalibrationReport expecting `report` string | Blank screen after AWS integration | Updated to accept `sectionResults` + `SECTION_BUTTONS` props |
| `app.get('*')` and `app.listen()` inside try/catch in server.js | Server never started | Moved outside the route handler |

---

## 14. Design Tokens (index.css)

```css
--bg: #09090D        /* page background */
--surface: #111117   /* sidebar */
--surface-2: #18181F /* cards */
--surface-3: #1F1F28 /* inline code bg */
--border: rgba(255,255,255,0.07)
--border-2: rgba(255,255,255,0.13)
--text: #EAEAF2
--text-2: #8888A6
--text-3: #525268
--accent: #F59E0B    /* amber — primary action color */
--accent-2: #FBBF24
--accent-dim: rgba(245,158,11,0.12)
--accent-ring: rgba(245,158,11,0.35)
--success: #10B981
--success-dim: rgba(16,185,129,0.12)
--danger: #F87171
--danger-dim: rgba(248,113,113,0.12)
--font: 'Inter', system-ui, sans-serif
--mono: 'JetBrains Mono', 'Fira Code', monospace
--sidebar-w: 380px
--header-h: 56px
```

Section accent colors (by index, matching SECTION_BUTTONS order):
`#8888A6, #8888A6, #60A5FA, #34D399, #F59E0B, #F87171, #A78BFA, #F97316, #2DD4BF, #94A3B8, #F87171, #34D399`

---

## 15. Env Vars Required in Netlify

| Variable | Where set | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Netlify → Site → Environment variables | Never commit to repo. Accessed via `Netlify.env.get()` in edge function |

---

## 16. Cost Reference

- Model: claude-sonnet-4-6
- Input: ~1,500 tokens per section call (system prompt + vehicle context)
- Output: up to 8,192 tokens per section
- Typical full output: ~4,000–6,000 tokens per section
- Estimated cost per section: ~$0.06–$0.10
- Estimated cost for all 12 sections: ~$0.75–$1.20
