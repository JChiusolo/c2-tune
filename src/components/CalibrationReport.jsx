import { useState } from 'react';
import { Copy, Check, Printer, AlertTriangle, Download, RefreshCw, Mail } from 'lucide-react';
import { submitCsvJob, pollCsvStatus } from '../api/aws.js';

// ─── PCM family options ────────────────────────────────────────────────────────
const PCM_FAMILIES = [
  { value: 'NGC4', label: 'NGC4 / JTEC — Chrysler HEMI (5.7L / 6.1L / 6.4L)' },
  { value: 'E38',  label: 'E38 — GM Gen IV LS2/LS3/LS9' },
  { value: 'E67',  label: 'E67 — GM Gen V LT1/LT4/LT5' },
  { value: 'PCM',  label: 'Ford PCM — Coyote / EcoBoost / Modular' },
];

// ─── Section accent colors (by position / title keyword, no icon refs) ─────────
const SECTION_COLORS = [
  '#8888A6', // Vehicle Assessment
  '#8888A6', // Tuning Order
  '#60A5FA', // 1. Fuel
  '#34D399', // 2. VE Table
  '#F59E0B', // 3. Spark
  '#F87171', // 4. AFR
  '#A78BFA', // 5. MAF/SD
  '#F97316', // 6. Boost
  '#2DD4BF', // 7. RPM/Cam
  '#94A3B8', // 8. Trans
  '#F87171', // 9. Safety
  '#34D399', // 10. Data Log
];

function getSectionColor(index) {
  return SECTION_COLORS[index] || '#8888A6';
}

// ─── Inline markdown formatter ─────────────────────────────────────────────────
function FormatInline({ text }) {
  if (!text || typeof text !== 'string') return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} style={{ color: 'var(--text)', fontWeight: '500' }}>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i}>{part.slice(1, -1)}</code>;
        return part;
      })}
    </>
  );
}

// ─── Single line renderer ──────────────────────────────────────────────────────
function ReportLine({ line }) {
  if (!line || !line.trim()) return null;

  const isWarning = line.startsWith('⚠️');
  const isDanger  = /(HARDWARE CONCERN|ADDITIONAL PARTS|DO NOT|CRITICAL)/i.test(line);

  if (isWarning) {
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '9px',
        background: isDanger ? 'var(--danger-dim)' : 'var(--warning-dim)',
        border: `1px solid ${isDanger ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)'}`,
        borderRadius: 'var(--r)', padding: '9px 12px', margin: '8px 0',
      }}>
        <AlertTriangle size={14} color={isDanger ? 'var(--danger)' : 'var(--warning)'} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '13px', color: isDanger ? 'var(--danger)' : 'var(--warning)', lineHeight: '1.6', fontWeight: '500' }}>
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

// ─── Section card — uses color + number badge, no Lucide icon dependency ───────
function SectionCard({ section, index }) {
  const color = getSectionColor(index);
  const numMatch = section.title.match(/^(\d+)\./);
  const badge = numMatch ? numMatch[1] : section.title.slice(0, 1);

  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: '10px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: `${color}18`, border: `1px solid ${color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: '700', color, fontFamily: 'var(--mono)',
        }}>
          {badge}
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>{section.title}</h3>
      </div>
      <div>
        {section.lines.map((line, i) => <ReportLine key={i} line={line} />)}
      </div>
    </div>
  );
}

// ─── Parse report markdown into sections ──────────────────────────────────────
function parseReport(text) {
  if (!text || typeof text !== 'string' || text.trim().length === 0) return [];
  const lines = text.split('\n');
  const sections = [];
  let current = null;
  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { title: line.slice(3).trim(), lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

// ─── ExportCsvButton ──────────────────────────────────────────────────────────
function ExportCsvButton({ report, vehicle }) {
  const [exportState, setExportState] = useState('idle');
  const [pcmFamily,   setPcmFamily]   = useState('NGC4');
  const [jobId,       setJobId]       = useState(null);
  const [elapsed,     setElapsed]     = useState(0);
  const [errorMsg,    setErrorMsg]    = useState('');

  const handleExport = async () => {
    setExportState('submitting');
    setErrorMsg('');
    setElapsed(0);
    try {
      const { jobId: id } = await submitCsvJob({ calibrationText: report, pcmFamily, vehicleInfo: vehicle });
      setJobId(id);
      setExportState('processing');
      await pollCsvStatus(id, ({ elapsedMs }) => setElapsed(Math.floor(elapsedMs / 1000)));
      setExportState('done');
    } catch (err) {
      setExportState('error');
      setErrorMsg(err.message);
    }
  };

  const reset = () => { setExportState('idle'); setErrorMsg(''); setJobId(null); setElapsed(0); };

  const box = {
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 'var(--r-lg)', padding: '16px 18px', marginBottom: '10px',
  };
  const head = {
    display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px',
    paddingBottom: '10px', borderBottom: '1px solid var(--border)',
  };

  return (
    <div style={box}>
      <div style={head}>
        <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Download size={14} color="var(--accent)" strokeWidth={2} />
        </div>
        <div>
          <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>Export to VCM Editor</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>Generate HP Tuners-compatible CSV files via the AWS pipeline</p>
        </div>
      </div>

      {exportState === 'idle' && (
        <>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '5px' }}>PCM Family</label>
            <select value={pcmFamily} onChange={(e) => setPcmFamily(e.target.value)}
              style={{ width: '100%', fontSize: '13px', color: 'var(--text)', background: 'var(--surface)', border: '1px solid var(--border-2)', borderRadius: 'var(--r)', padding: '8px 10px', outline: 'none' }}>
              {PCM_FAMILIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-2)', marginBottom: '12px', lineHeight: '1.6' }}>
            Submits this plan to the AWS Step Functions pipeline. You'll receive an email with download links for{' '}
            <code>ve_table.csv</code>, <code>spark_advance.csv</code>, <code>knock_gain.csv</code>, and a validation report.
          </p>
          <button className="btn-primary" onClick={handleExport}>
            <Download size={14} /> Generate VCM Editor CSV Files
          </button>
        </>
      )}

      {exportState === 'submitting' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-2)', fontSize: '13px' }}>
          <RefreshCw size={15} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
          Submitting job to AWS pipeline…
        </div>
      )}

      {exportState === 'processing' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <RefreshCw size={15} color="var(--accent)" style={{ animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>Generating CSV files…</p>
              <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '2px 0 0' }}>{elapsed > 0 ? `${elapsed}s elapsed` : 'Starting pipeline…'} — typically 5–8 seconds</p>
            </div>
          </div>
          {[['λ Extract', 'Claude API → structured JSON'], ['λ CSV gen', 'Spline interpolation → CSV files'], ['λ Nav guide', 'SSM lookup → navigation steps'], ['λ Validate', 'Range + safety checks']].map(([name, desc], i) => (
            <div key={name} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '6px 0', opacity: elapsed >= i * 2 ? 1 : 0.35, transition: 'opacity 0.3s' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: elapsed >= i * 2 ? 'var(--accent)' : 'var(--border-2)', flexShrink: 0, marginTop: '4px', transition: 'background 0.3s' }} />
              <div>
                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{name}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-3)', marginLeft: '6px' }}>{desc}</span>
              </div>
            </div>
          ))}
          {jobId && <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '10px', fontFamily: 'var(--mono)' }}>Job ID: {jobId}</p>}
        </div>
      )}

      {exportState === 'done' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--success-dim)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 'var(--r)', padding: '12px', marginBottom: '12px' }}>
            <Check size={16} color="var(--success)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--success)', margin: 0 }}>CSV files generated successfully</p>
              <p style={{ fontSize: '12px', color: 'var(--success)', margin: '2px 0 0', opacity: 0.8 }}>Check your email for download links (valid 72 hours)</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 'var(--r)', marginBottom: '10px' }}>
            <Mail size={13} color="var(--text-3)" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '12px', color: 'var(--text-2)', margin: 0, lineHeight: '1.6' }}>
              Review <strong style={{ color: 'var(--text)' }}>validation_report.json</strong> before writing any table to the PCM.
            </p>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '0 0 10px', lineHeight: '1.6' }}>
            Files: <code>ve_table.csv</code> · <code>spark_advance.csv</code> · <code>knock_gain.csv</code> · <code>nav_guide.md</code> · <code>validation_report.json</code>
          </p>
          <button className="btn-ghost" onClick={reset} style={{ fontSize: '12px' }}>
            <RefreshCw size={12} /> Export another job
          </button>
        </div>
      )}

      {exportState === 'error' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', background: 'var(--danger-dim)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 'var(--r)', padding: '10px 12px', marginBottom: '12px' }}>
            <AlertTriangle size={14} color="var(--danger)" style={{ flexShrink: 0, marginTop: '1px' }} />
            <div>
              <p style={{ fontSize: '13px', fontWeight: '500', color: 'var(--danger)', margin: 0 }}>Export failed</p>
              <p style={{ fontSize: '12px', color: 'var(--danger)', margin: '3px 0 0', opacity: 0.85, lineHeight: '1.5' }}>{errorMsg}</p>
            </div>
          </div>
          <button className="btn-ghost" onClick={reset} style={{ fontSize: '12px' }}>
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Main CalibrationReport ────────────────────────────────────────────────────
export default function CalibrationReport({ vehicle, report, usage }) {
  const [copied, setCopied] = useState(false);

  // Hard guard — if report is not a valid string, show a safe fallback
  if (!report || typeof report !== 'string' || report.trim().length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', fontSize: '14px' }}>
        No calibration report available. Please generate a new plan.
      </div>
    );
  }

  const sections = parseReport(report);
  const vehicleLabel = vehicle
    ? `${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}`.trim()
    : 'Vehicle';

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(report); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Calibration Plan — ${vehicleLabel}</title>
<style>
  body{font-family:system-ui,sans-serif;font-size:13px;line-height:1.7;color:#111;padding:32px;max-width:800px;margin:0 auto}
  h1{font-size:18px;margin-bottom:4px}
  .sub{color:#666;font-size:12px;margin-bottom:24px}
  h2{font-size:14px;border-bottom:1px solid #ddd;padding-bottom:6px;margin:20px 0 8px}
  p,li{font-size:13px;margin:4px 0}ul{padding-left:18px}
  .warn{background:#FFF8E1;border:1px solid #FFC107;border-radius:4px;padding:6px 10px;margin:6px 0;font-weight:500}
  @media print{body{padding:16px}}
</style></head><body>
<h1>${vehicleLabel} — HP Tuners Calibration Plan</h1>
<p class="sub">Generated by HP Tuners Calibration Agent · ${new Date().toLocaleDateString()}</p><hr>
${sections.map((s) => `
<h2>${s.title}</h2>
${s.lines.map((l) => {
  if (!l.trim()) return '';
  if (l.startsWith('⚠️')) return `<div class="warn">${l}</div>`;
  if (l.match(/^[-*•]\s/)) return `<li>${l.replace(/^[-*•]\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`;
  return `<p>${l.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`;
}).join('')}`).join('')}
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 500);
  };

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '3px' }}>{vehicleLabel}</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>HP Tuners mpvi4 Calibration Plan</span>
            {vehicle?.miles && (
              <span style={{ fontSize: '11px', background: 'var(--surface-3)', color: 'var(--text-3)', padding: '2px 7px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {Number(vehicle.miles).toLocaleString()} mi
              </span>
            )}
            {usage && (
              <span style={{ fontSize: '11px', background: 'var(--surface-3)', color: 'var(--text-3)', padding: '2px 7px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                {usage.outputTokens?.toLocaleString?.()} tokens
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-ghost" onClick={handleCopy}>
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn-ghost" onClick={handlePrint}>
            <Printer size={13} /> Print
          </button>
        </div>
      </div>

      {/* Calibration sections */}
      {sections.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px' }}>
          No sections found in this report. The plan may be incomplete — try generating again.
        </div>
      )}
      {sections.map((section, i) => (
        <SectionCard key={i} section={section} index={i} />
      ))}

      {/* AWS export panel */}
      {typeof report === 'string' && report.length > 0 && (
        <ExportCsvButton report={report} vehicle={vehicle} />
      )}

      <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '20px' }}>
        Always validate on a properly equipped dyno with a calibrated wideband O₂.
        Review <code>validation_report.json</code> before writing any table to a PCM.
      </p>
    </div>
  );
}
