import { useState } from 'react';
import { IconCopy, IconCheck, IconPrinter, IconAlertTriangle, IconDownload, IconRefreshCw, IconMail } from './Icons.jsx';
import { submitCsvJob, pollCsvStatus } from '../api/aws.js';

// ─── Section accent colours (one per section, in order) ───────────────────────
const SECTION_COLORS = [
  '#8888A6', // Vehicle Assessment
  '#8888A6', // Tuning Order
  '#60A5FA', // 1. Fuel System
  '#34D399', // 2. VE Table
  '#F59E0B', // 3. Spark Timing
  '#F87171', // 4. AFR Targets
  '#A78BFA', // 5. MAF / SD
  '#F97316', // 6. Boost Control
  '#2DD4BF', // 7. RPM & Cam/VVT
  '#94A3B8', // 8. Transmission
  '#F87171', // 9. Safety & Knock
  '#34D399', // 10. Data Logging
];

const PCM_FAMILIES = [
  { value: 'NGC4', label: 'NGC4 / JTEC — Chrysler HEMI (5.7L / 6.1L / 6.4L)' },
  { value: 'E38',  label: 'E38 — GM Gen IV LS2/LS3/LS9' },
  { value: 'E67',  label: 'E67 — GM Gen V LT1/LT4/LT5' },
  { value: 'PCM',  label: 'Ford PCM — Coyote / EcoBoost / Modular' },
];

// ─── Markdown parsers ──────────────────────────────────────────────────────────
function parseSection(text) {
  if (!text || typeof text !== 'string') return [];
  // Strip the leading ## header line — the card header already shows it
  return text.split('\n').filter(l => !l.startsWith('## '));
}

function FormatInline({ text }) {
  if (!text || typeof text !== 'string') return null;
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
        if (p.startsWith('**') && p.endsWith('**'))
          return <strong key={i} style={{ color: 'var(--text)', fontWeight: '500' }}>{p.slice(2, -2)}</strong>;
        if (p.startsWith('`') && p.endsWith('`'))
          return <code key={i}>{p.slice(1, -1)}</code>;
        return p;
      })}
    </>
  );
}

function ReportLine({ line }) {
  if (!line || !line.trim()) return null;
  const isWarn   = line.startsWith('⚠️');
  const isDanger = /(HARDWARE CONCERN|ADDITIONAL PARTS|DO NOT|CRITICAL)/i.test(line);

  if (isWarn) {
    const color = isDanger ? 'var(--danger)'     : 'var(--warning)';
    const bg    = isDanger ? 'var(--danger-dim)' : 'var(--warning-dim)';
    const bdr   = isDanger ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)';
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', background: bg, border: `1px solid ${bdr}`, borderRadius: 'var(--r)', padding: '9px 12px', margin: '8px 0' }}>
        <IconAlertTriangle size={14} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '13px', color, lineHeight: '1.6', fontWeight: '500' }}>
          <FormatInline text={line.replace('⚠️', '').trim()} />
        </span>
      </div>
    );
  }

  if (line.match(/^[-*•]\s/)) {
    return (
      <div style={{ display: 'flex', gap: '10px', margin: '5px 0', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '3px', fontSize: '10px' }}>▶</span>
        <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.65' }}>
          <FormatInline text={line.replace(/^[-*•]\s/, '')} />
        </span>
      </div>
    );
  }

  if (line.startsWith('### ')) {
    return (
      <p style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text)', margin: '10px 0 4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {line.slice(4)}
      </p>
    );
  }

  return (
    <p style={{ fontSize: '13.5px', color: 'var(--text-2)', margin: '5px 0', lineHeight: '1.65' }}>
      <FormatInline text={line} />
    </p>
  );
}

// ─── Per-section output card ───────────────────────────────────────────────────
function SectionCard({ sectionKey, label, status, result, error, usage, colorIndex }) {
  const [copied, setCopied] = useState(false);
  const color    = SECTION_COLORS[colorIndex] || '#8888A6';
  const badge    = (label.match(/^(\d+)\./) || [])[1] || label.slice(0, 1);
  const isRunning = status === 'running';
  const isDone    = status === 'done';
  const isError   = status === 'error';
  const lines     = parseSection(result || '');

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(result || ''); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank'); if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${label}</title>
<style>body{font-family:system-ui,sans-serif;font-size:13px;line-height:1.7;color:#111;padding:32px;max-width:800px;margin:0 auto}h2{font-size:15px;border-bottom:1px solid #ddd;padding-bottom:6px;margin:0 0 12px}p,li{font-size:13px;margin:4px 0}.warn{background:#FFF8E1;border:1px solid #FFC107;border-radius:4px;padding:6px 10px;margin:6px 0;font-weight:500}@media print{body{padding:16px}}</style>
</head><body><h2>${label}</h2>
${(result || '').split('\n').filter(l => !l.startsWith('## ')).map(l => {
  if (!l.trim()) return '';
  if (l.startsWith('⚠️')) return `<div class="warn">${l}</div>`;
  if (l.match(/^[-*•]\s/)) return `<li>${l.replace(/^[-*•]\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`;
  return `<p>${l.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`;
}).join('')}
</body></html>`);
    w.document.close(); setTimeout(() => w.print(), 400);
  };

  return (
    <div
      id={`section-${sectionKey}`}
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${isRunning ? 'var(--accent-ring)' : isDone ? 'rgba(16,185,129,0.2)' : isError ? 'rgba(248,113,113,0.2)' : 'var(--border)'}`,
        borderRadius: 'var(--r-lg)',
        marginBottom: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* ── Card header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px',
        background: isRunning ? 'var(--accent-dim)' : 'transparent',
        borderBottom: (result || isError) ? '1px solid var(--border)' : 'none',
        transition: 'background 0.2s',
      }}>
        {/* Badge */}
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '700', color, fontFamily: 'var(--mono)',
        }}>
          {badge}
        </div>

        {/* Label */}
        <h3 style={{
          flex: 1, fontSize: '14px', fontWeight: '600', margin: 0,
          color: isRunning ? 'var(--accent)' : 'var(--text)',
        }}>
          {label}
        </h3>

        {/* Streaming pulse */}
        {isRunning && (
          <span style={{ fontSize: '11px', color: 'var(--accent)', animation: 'pulse 1.2s ease-in-out infinite' }}>
            Generating…
          </span>
        )}

        {/* Token count */}
        {isDone && usage && (
          <span style={{ fontSize: '11px', color: 'var(--text-3)', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '20px', padding: '2px 8px' }}>
            {usage.outputTokens.toLocaleString()} tokens
          </span>
        )}

        {/* Copy / Print */}
        {isDone && (
          <>
            <button className="btn-ghost" onClick={handleCopy} style={{ padding: '4px 8px', fontSize: '12px' }}>
              {copied ? <IconCheck size={12} /> : <IconCopy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn-ghost" onClick={handlePrint} style={{ padding: '4px 8px', fontSize: '12px' }}>
              <IconPrinter size={12} /> Print
            </button>
          </>
        )}
      </div>

      {/* ── Content ── */}
      {(result || isError) && (
        <div style={{ padding: '14px 18px' }}>
          {isError
            ? <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>{error}</p>
            : lines.map((line, i) => <ReportLine key={i} line={line} />)
          }
          {/* Blinking cursor while streaming */}
          {isRunning && (
            <span style={{
              display: 'inline-block', width: '8px', height: '14px',
              background: 'var(--accent)', marginLeft: '2px',
              animation: 'blink 0.8s step-end infinite',
              verticalAlign: 'text-bottom',
            }} />
          )}
        </div>
      )}
    </div>
  );
}

// ─── AWS CSV export block (unchanged from your version) ───────────────────────
function ExportCsvButton({ report, vehicle }) {
  const [state,   setState]   = useState('idle');
  const [pcm,     setPcm]     = useState('NGC4');
  const [jobId,   setJobId]   = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [errMsg,  setErrMsg]  = useState('');

  const run = async () => {
    setState('submitting'); setErrMsg(''); setElapsed(0);
    try {
      const { jobId: id } = await submitCsvJob({ calibrationText: report, pcmFamily: pcm, vehicleInfo: vehicle });
      setJobId(id); setState('processing');
      await pollCsvStatus(id, ({ elapsedMs }) => setElapsed(Math.floor(elapsedMs / 1000)));
      setState('done');
    } catch (e) { setState('error'); setErrMsg(e.message); }
  };
  const reset = () => { setState('idle'); setErrMsg(''); setJobId(null); setElapsed(0); };

  const spin = { animation: 'spin 0.8s linear infinite', flexShrink: 0 };
  const box  = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: '10px' };
  const hd   = { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' };

  return (
    <div style={box}>
      <div style={hd}>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <IconDownload size={14} color="var(--accent)" />
        </div>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>Export to VCM Editor</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>Generate HP Tuners-compatible CSV files via the AWS pipeline</p>
        </div>
      </div>

      {state === 'idle' && <>
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>PCM Family</label>
          <select value={pcm} onChange={e => setPcm(e.target.value)}
            style={{ width: '100%', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', padding: '8px 10px', outline: 'none' }}>
            {PCM_FAMILIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '12px', lineHeight: '1.6' }}>
          Submits this plan to the AWS Step Functions pipeline. You'll receive an email with download links for CSV files and a validation report.
        </p>
        <button className="btn-primary" onClick={run}><IconDownload size={14} /> Generate VCM Editor CSV Files</button>
      </>}

      {state === 'submitting' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-2)', fontSize: '13px' }}>
          <IconRefreshCw size={15} color="var(--accent)" style={spin} />Submitting to AWS pipeline…
        </div>
      )}

      {state === 'processing' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <IconRefreshCw size={15} color="var(--accent)" style={spin} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>Generating CSV files…</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>{elapsed > 0 ? `${elapsed}s elapsed` : 'Starting…'} — typically 5–8 seconds</p>
            </div>
          </div>
          {[['λ Extract', 'Claude API → structured JSON'], ['λ CSV gen', 'Spline → VCM Editor files'], ['λ Nav guide', 'PCM navigation steps'], ['λ Validate', 'Range + safety checks']].map(([n, d], i) => (
            <div key={n} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '6px 0', opacity: elapsed >= i * 2 ? 1 : 0.35, transition: 'opacity 0.3s' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: elapsed >= i * 2 ? 'var(--accent)' : 'var(--border-2)', flexShrink: 0, marginTop: '4px', transition: 'background 0.3s' }} />
              <span style={{ fontSize: '12px', color: 'var(--text-3)' }}><strong style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{n}</strong> — {d}</span>
            </div>
          ))}
          {jobId && <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', fontFamily: 'var(--mono)' }}>Job: {jobId}</p>}
        </div>
      )}

      {state === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--r)', padding: '12px', marginBottom: '12px' }}>
            <IconCheck size={16} color="var(--success)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--success)', margin: 0 }}>CSV files generated</p>
              <p style={{ fontSize: '12px', color: 'var(--success)', margin: '2px 0 0', opacity: 0.8 }}>Check your email for download links (valid 72 hours)</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--r)', marginBottom: '10px' }}>
            <IconMail size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: 0 }}>Review <strong style={{ color: 'var(--text)' }}>validation_report.json</strong> before writing any table to the PCM.</p>
          </div>
          <button className="btn-ghost" onClick={reset} style={{ fontSize: '12px' }}><IconRefreshCw size={12} /> Export another job</button>
        </div>
      )}

      {state === 'error' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--r)', padding: '10px 12px', marginBottom: '12px' }}>
            <IconAlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--danger)', margin: 0 }}>Export failed</p>
              <p style={{ fontSize: '12px', color: 'var(--danger)', margin: '3px 0 0', opacity: 0.85, lineHeight: 1.5 }}>{errMsg}</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={reset} style={{ fontSize: '12px' }}><IconRefreshCw size={12} /> Try again</button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
// Props: vehicle, sectionResults, SECTION_BUTTONS
// sectionResults: { [key]: { status, result, error, usage } }
// SECTION_BUTTONS: [{ key, label }, ...]
export default function CalibrationReport({ vehicle, sectionResults, SECTION_BUTTONS }) {
  // Only render sections that have been run (status !== 'idle')
  const activeButtons = (SECTION_BUTTONS || []).filter(
    ({ key }) => sectionResults?.[key]?.status && sectionResults[key].status !== 'idle'
  );

  if (activeButtons.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
        Select a section on the left to generate its calibration plan.
      </div>
    );
  }

  const vehicleLabel = vehicle
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : '';

  // Build a single combined report string for the AWS CSV export
  const combinedReport = activeButtons
    .map(({ key, label }) => {
      const r = sectionResults[key];
      return r?.status === 'done' && r.result ? r.result : '';
    })
    .filter(Boolean)
    .join('\n\n');

  return (
    <div>
      {/* Report header */}
      {vehicleLabel && (
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '3px' }}>
            {vehicleLabel}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>HP Tuners mpvi4 Calibration Plan</span>
            {vehicle?.miles && (
              <span style={{ fontSize: '11px', background: 'var(--surface-3)', color: 'var(--text-3)', padding: '2px 7px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {Number(vehicle.miles).toLocaleString()} mi
              </span>
            )}
          </div>
        </div>
      )}

      {/* One card per active section */}
      {activeButtons.map(({ key, label }, i) => {
        const colorIndex = (SECTION_BUTTONS || []).findIndex(b => b.key === key);
        const sr = sectionResults[key];
        return (
          <SectionCard
            key={key}
            sectionKey={key}
            label={label}
            status={sr.status}
            result={sr.result}
            error={sr.error}
            usage={sr.usage}
            colorIndex={colorIndex}
          />
        );
      })}

      {/* AWS export — only shown when at least one section is fully done */}
      {combinedReport && (
        <ExportCsvButton report={combinedReport} vehicle={vehicle} />
      )}

      <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '20px' }}>
        Always validate on a dyno with a calibrated wideband O₂. Review <code>validation_report.json</code> before writing to any PCM.
      </p>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes blink  { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}
