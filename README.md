# HP Tuners Calibration Agent ⚡

An AI-powered software calibration recommendation tool for HP Tuners mpvi4 / VCM Suite. Built with React + Express + Anthropic Claude Sonnet.

Enter a vehicle's year/make/model, mileage, hardware modifications, and client goal — the agent produces a detailed, platform-specific calibration plan covering VE tables, spark timing, fueling strategy, MAF/SD selection, boost control, transmission calibration, knock protection, and a dyno/street data logging checklist.

---

## Screenshots

> Dark theme, two-panel layout: form sidebar on the left, structured calibration report on the right.
> All sections rendered as cards with icons. Warnings highlighted. Copy + Print buttons.

---

## Prerequisites

- **Node.js ≥ 18** — [nodejs.org](https://nodejs.org)
- **npm ≥ 9** (bundled with Node)
- **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)

---

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/hp-tuners-calibration-agent.git
cd hp-tuners-calibration-agent

# 2. Install all dependencies
npm install

# 3. Create your environment file
cp .env.example .env

# 4. Add your Anthropic API key to .env
#    Open .env and set:  ANTHROPIC_API_KEY=sk-ant-...

# 5. Start both the API server and the React dev server
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Project Structure

```
hp-tuners-calibration-agent/
├── server.js                  # Express API server (keeps API key server-side)
├── vite.config.js             # Vite config — proxies /api to Express
├── index.html                 # HTML shell
├── .env.example               # Copy to .env and fill in your key
├── src/
│   ├── main.jsx               # React entry point
│   ├── App.jsx                # Root component, state management, layout
│   ├── index.css              # Global dark theme styles
│   ├── api/
│   │   └── tuner.js           # fetch() wrapper for /api/tune
│   └── components/
│       ├── Header.jsx         # Top navigation bar
│       ├── VehicleForm.jsx    # Input form with goal presets
│       ├── CalibrationReport.jsx  # Parsed report with section cards + print
│       └── HistoryPanel.jsx   # localStorage tune history
```

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start React (port 5173) + Express (port 3001) concurrently |
| `npm run build` | Build the React frontend to `dist/` |
| `npm start` | Run Express in production (serves the built `dist/`) |
| `npm run server` | Run Express alone |
| `npm run client` | Run Vite dev server alone |

---

## Production Deployment

### Build and serve locally

```bash
npm run build
npm start
# App is available on http://localhost:3001
```

### Deploy to Railway, Render, or Fly.io

1. Set the `ANTHROPIC_API_KEY` environment variable in your host's dashboard
2. Set the build command to `npm run build`
3. Set the start command to `npm start`

### Deploy to Vercel (frontend only)

If you want to run just the frontend on Vercel, you'll need to either:
- Add a Vercel serverless function at `api/tune.js`, or
- Point `src/api/tuner.js` at your own hosted Express backend

---

## How It Works

```
User fills form → React (VehicleForm)
                → POST /api/tune (Express server)
                → Anthropic Claude Sonnet 4.6
                → Structured calibration plan (markdown)
                → CalibrationReport (parsed + rendered)
                → Saved to localStorage history
```

The Express server holds the `ANTHROPIC_API_KEY`. The browser **never** sees the key — it only talks to your own `/api/tune` endpoint. This is the correct pattern for production use.

---

## Calibration Plan Sections

Each generated plan covers:

1. **Vehicle Assessment** — platform baseline and how hardware changes affect the ECU
2. **Tuning Order of Operations** — safe sequence of calibration steps
3. **Fuel System Calibration** — injector scaling, STFT/LTFT, PE targets
4. **VE Table** — volumetric efficiency strategy by RPM/load region
5. **Spark Timing** — MBT targets, detonation margin, knock sensor calibration
6. **Air/Fuel Ratio Targets** — cruise and WOT lambda/AFR targets
7. **MAF / Speed Density** — MAF vs. SD vs. hybrid decision
8. **Boost Control** — wastegate, boost targets, overboost protection (FI builds)
9. **RPM & Cam/VVT** — rev limiter, cam phasing, AFM/DOD disable
10. **Transmission** — shift points, TCC lockup, line pressure
11. **Safety & Knock Protection** — knock retard, temperature protection, lean protection
12. **Data Logging Checklist** — channels, target values, red-flag thresholds

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | *(required)* | Your Anthropic API key |
| `PORT` | `3001` | Express server port |
| `NODE_ENV` | `development` | Set to `production` when deploying |

---

## Customizing the System Prompt

The expert tuner persona and response structure live in **`server.js`** in the `SYSTEM_PROMPT` constant. Edit it to:
- Add platform-specific expertise
- Change the response structure
- Tune the tone (more conservative, more aggressive, etc.)
- Add shop-specific notes (preferred brands, in-house procedures, etc.)

---

## Security Notes

- **Never commit your `.env` file** — it's in `.gitignore`
- The API key is server-side only; client JS never touches it
- For multi-user shop deployments, consider adding auth (e.g., HTTP Basic Auth via Express middleware) so the endpoint isn't open to the network
- Rate limit the `/api/tune` endpoint in production to prevent abuse

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite |
| Backend | Node.js + Express |
| AI | Anthropic Claude Sonnet 4.6 via `@anthropic-ai/sdk` |
| Icons | Lucide React |
| Fonts | Inter + JetBrains Mono (Google Fonts) |
| History | Browser localStorage |

---

## License

MIT — use freely in your shop, modify as needed. If you build something cool, a star on the repo is appreciated.
