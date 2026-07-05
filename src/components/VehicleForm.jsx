import { IconWrench, IconTarget } from './Icons.jsx';

const GOAL_PRESETS = [
  { label: 'Max street — 93 oct',       value: 'Maximum reliable street performance on 93 octane pump gas. Daily driver — must idle cleanly and pass emissions.' },
  { label: 'Street/strip — E85',        value: 'Maximum power on E85 ethanol. Street-driven but track use on weekends. No emissions requirement.' },
  { label: 'Tow/haul — torque + economy', value: 'Maximize low-end torque and towing capacity. Optimize fuel economy at cruise. Prioritize reliability and transmission longevity.' },
  { label: 'Race only',                 value: 'Maximum race power — no street or emissions requirement. Aggressive timing, target max power band, no drivability concern.' },
];

// ─── Section buttons — keys match server-side SECTION_PROMPTS ─────────────────
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

function LoadingSpinner() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation:'spin 0.8s linear infinite', flexShrink:0 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

export default function VehicleForm({ data, onChange, onRunSection, runningKey, sectionResults }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });

  // Guard: sectionResults must always be a plain object — never undefined
  const results = (sectionResults && typeof sectionResults === 'object') ? sectionResults : {};

  const formValid  = !!(data.year && data.make && data.model && data.mods && data.goal);
  const anyRunning = !!runningKey;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

      {/* ── Vehicle ─────────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'14px' }}>
        <IconWrench size={14} color="var(--text-3)" />
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Vehicle</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'84px 1fr 1fr', gap:'10px', marginBottom:'14px' }}>
        <div>
          <label htmlFor="year">Year</label>
          <input id="year" type="number" min="1980" max="2030" placeholder="2022" value={data.year} onChange={set('year')} />
        </div>
        <div>
          <label htmlFor="make">Make</label>
          <input id="make" type="text" placeholder="Chevrolet" value={data.make} onChange={set('make')} />
        </div>
        <div>
          <label htmlFor="model">Model / Engine</label>
          <input id="model" type="text" placeholder="Camaro SS (LT1)" value={data.model} onChange={set('model')} />
        </div>
      </div>

      <div style={{ marginBottom:'14px' }}>
        <label htmlFor="miles">Mileage</label>
        <input id="miles" type="number" min="0" placeholder="45000" value={data.miles} onChange={set('miles')} />
      </div>

      <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0 14px' }} />

      {/* ── Hardware Mods ────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'14px' }}>
        <IconWrench size={14} color="var(--text-3)" />
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Hardware Modifications</span>
      </div>

      <div style={{ marginBottom:'14px' }}>
        <label htmlFor="mods">List all hardware mods with specs</label>
        <textarea id="mods" rows={5} value={data.mods} onChange={set('mods')} style={{ minHeight:'130px' }}
          placeholder={'• Stage 2 cam: 228/236 dur, .595/.598 lift, 114+2 LSA\n• LT headers 1-7/8" with high-flow cats\n• Cold air intake\n• 60lb Delphi injectors\n• Magnuson TVS2300 SC @ 9 psi\n• Walbro 255lph fuel pump'} />
      </div>

      <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0 14px' }} />

      {/* ── Client Goal ──────────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'14px' }}>
        <IconTarget size={14} color="var(--text-3)" />
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Client Goal</span>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'10px' }}>
        {GOAL_PRESETS.map(p => (
          <button key={p.label} type="button" className="btn-ghost"
            style={{ fontSize:'12px', padding:'4px 9px' }}
            onClick={() => onChange({ ...data, goal: p.value })}>
            {p.label}
          </button>
        ))}
      </div>

      <div style={{ marginBottom:'14px' }}>
        <label htmlFor="goal">Describe the build goal</label>
        <textarea id="goal" rows={3} value={data.goal} onChange={set('goal')} style={{ minHeight:'80px' }}
          placeholder="e.g. Max reliable street/strip power on 93 oct. Daily driver — must pass OBDII emissions. Target 550whp." />
      </div>

      <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0 18px' }} />

      {/* ── Section buttons ──────────────────────────────────────────────── */}
      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'12px' }}>
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
          Generate Sections
        </span>
        {!formValid && (
          <span style={{ fontSize:'11px', color:'var(--text-3)', marginLeft:'auto' }}>fill form above</span>
        )}
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
        {SECTION_BUTTONS.map(({ key, label }) => {
          const isRunning  = runningKey === key;
          const isDone     = results[key]?.status === 'done';
          const isError    = results[key]?.status === 'error';

          return (
            <button
              key={key}
              type="button"
              onClick={() => onRunSection(key)}
              disabled={!formValid || anyRunning}
              style={{
                width:'100%', textAlign:'left', padding:'9px 12px',
                borderRadius:'var(--r)', fontFamily:'var(--font)',
                fontSize:'13px', fontWeight: isRunning ? '600' : '500',
                cursor: (!formValid || anyRunning) ? 'not-allowed' : 'pointer',
                opacity: (!formValid || (anyRunning && !isRunning)) ? 0.45 : 1,
                display:'flex', alignItems:'center', gap:'8px',
                transition:'all 0.15s',
                border:`1px solid ${
                  isRunning ? 'rgba(245,158,11,0.35)' :
                  isDone    ? 'rgba(16,185,129,0.3)'  :
                  isError   ? 'rgba(248,113,113,0.3)' :
                  'var(--border-2)'
                }`,
                background:
                  isRunning ? 'var(--accent-dim)'  :
                  isDone    ? 'var(--success-dim)'  :
                  isError   ? 'var(--danger-dim)'   :
                  'var(--surface-2)',
                color:
                  isRunning ? 'var(--accent)'  :
                  isDone    ? 'var(--success)'  :
                  isError   ? 'var(--danger)'   :
                  'var(--text)',
              }}
            >
              {/* Status icon — inline SVG only, no lucide */}
              {isRunning && <LoadingSpinner />}
              {!isRunning && isDone && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {!isRunning && isError && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="var(--danger)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              )}
              {!isRunning && !isDone && !isError && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0, opacity:0.4 }}>
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              )}

              <span style={{ flex:1 }}>{label}</span>

              {isDone && results[key]?.usage && (
                <span style={{ fontSize:'10px', color:'var(--success)', opacity:0.8, flexShrink:0 }}>
                  {results[key].usage.outputTokens?.toLocaleString?.()}t
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
