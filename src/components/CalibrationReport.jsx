import { useState } from 'react';
import {
  Car, ListOrdered, Droplets, BarChart2, Zap, Target,
  Wind, Gauge, RotateCcw, ArrowLeftRight, Shield, ClipboardList,
  Copy, Check, Printer, AlertTriangle,
} from 'lucide-react';

// ─── Section metadata ──────────────────────────────────────────────────────────
const SECTION_META = {
  'Vehicle Assessment':                  { icon: Car,            color: '#8888A6' },
  'Tuning Order of Operations':          { icon: ListOrdered,    color: '#8888A6' },
  '1. Fuel System Calibration':          { icon: Droplets,       color: '#60A5FA' },
  '2. Volumetric Efficiency (VE) Table': { icon: BarChart2,      color: '#34D399' },
  '3. Spark Timing':                     { icon: Zap,            color: '#F59E0B' },
  '4. Air/Fuel Ratio Targets':           { icon: Target,         color: '#F87171' },
  '5. MAF / Speed Density':              { icon: Wind,           color: '#A78BFA' },
  '6. Boost Control':                    { icon: Gauge,          color: '#F97316' },
  '7. RPM & Cam/VVT Parameters':         { icon: RotateCcw,      color: '#2DD4BF' },
  '8. Transmission':                     { icon: ArrowLeftRight, color: '#94A3B8' },
  '9. Safety & Knock Protection':        { icon: Shield,         color: '#F87171' },
  '10. Data Logging Checklist':          { icon: ClipboardList,  color: '#34D399' },
};

function getSectionMeta(title) {
  for (const [key, meta] of Object.entries(SECTION_META)) {
    if (title.includes(key) || key.includes(title)) return meta;
  }
  return { icon: Zap, color: 'var(--text-3)' };
}

// ─── Inline markdown formatter ─────────────────────────────────────────────────
function FormatInline({ text }) {
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
  if (!line.trim()) return null;

  const isWarning = line.startsWith('⚠️');
  const isDanger  = /(HARDWARE CONCERN|ADDITIONAL PARTS|DO NOT|CRITICAL)/i.test(line);

  if (isWarning) {
    const bg    = isDanger ? 'var(--danger-dim)'            : 'var(--warning-dim)';
    const bdr   = isDanger ? 'rgba(248,113,113,0.3)'        : 'rgba(245,158,11,0.3)';
    const color = isDanger ? 'var(--danger)'                : 'var(--warning)';
    return (
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: '9px',
        background: bg, border: `1px solid ${bdr}`,
        borderRadius: 'var(--r)', padding: '9px 12px', margin: '8px 0',
      }}>
        <AlertTriangle size={14} color={color} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span style={{ fontSize: '13px', color, lineHeight: '1.6', fontWeight: '500' }}>
          <FormatInline text={line.replace('⚠️', '').trim()} />
        </span>
      </div>
    );
  }

  if (line.match(/^[-*•]\s/)) {
    const content = line.replace(/^[-*•]\s/, '');
    return (
      <div style={{ display: 'flex', gap: '10px', margin: '5px 0', alignItems: 'flex-start' }}>
        <span style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '3px', fontSize: '10px' }}>▶</span>
        <span style={{ fontSize: '13.5px', color: 'var(--text-2)', lineHeight: '1.65' }}>
          <FormatInline text={content} />
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

// ─── Section output card ───────────────────────────────────────────────────────
function SectionOutputCard({ sectionKey, label, status, result, error, usage, streaming }) {
  const meta     = getSectionMeta(label);
  const IconComp = meta.icon;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(result); setCopied(true); setTimeout(() => setCopied(false), 2000); }
    catch { /* ignore */ }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    const lines = (result || '').split('\n');
    w.document.write(`<!DOCTYPE html><html><head>
<meta charset="UTF-8"><title>${label}</title>
<style>
  body { font-family: system-ui, sans-serif; font-size: 13px; line-height: 1.7; color: #111; padding: 32px; max-width: 800px; margin: 0 auto; }
  h2 { font-size: 15px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 0 0 12px; }
  p, li { font-size: 13px; margin: 4px 0; }
  ul { padding-left: 18px; }
  .warn { background: #FFF8E1; border: 1px solid #FFC107; border-radius: 4px; padding: 6px 10px; margin: 6px 0; font-weight: 500; }
  @media print { body { padding: 16px; } }
</style></head><body>
<h2>${label}</h2>
${lines.map(l => {
  if (!l.trim() || l.startsWith('## ')) return '';
  if (l.startsWith('⚠️')) return `<div class="warn">${l}</div>`;
  if (l.match(/^[-*•]\s/)) return `<li>${l.replace(/^[-*•]\s/,'').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')}</li>`;
  return `<p>${l.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')}</p>`;
}).join('')}
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  };

  // Parse lines — strip the leading ## header line since we show it in the card header
  const lines = (result || '').split('\n').filter(l => !l.startsWith('## '));

  return (
    <div
      id={`section-${sectionKey}`}
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${
          status === 'running' ? 'var(--accent-ring)' :
          status === 'done'    ? 'rgba(16,185,129,0.2)' :
          status === 'error'   ? 'rgba(248,113,113,0.2)' :
          'var(--border)'
        }`,
        borderRadius: 'var(--r-lg)',
        marginBottom: '12px',
        overflow: 'hidden',
        transition: 'border-color 0.2s',
      }}
    >
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        padding: '12px 16px',
        borderBottom: (result || status === 'error') ? '1px solid var(--border)' : 'none',
        background: status === 'running' ? 'var(--accent-dim)' : 'transparent',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: `${meta.color}18`, border: `1px solid ${meta.color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={14} color={meta.color} strokeWidth={2} />
        </div>

        <h3 style={{ flex: 1, fontSize: '14px', fontWeight: '600', color: status === 'running' ? 'var(--accent)' : 'var(--text)', margin: 0 }}>
          {label}
        </h3>

        {/* Streaming indicator */}
        {status === 'running' && (
          <span style={{ fontSize: '11px', color: 'var(--accent)', animation: 'pulse 1.2s ease-in-out infinite' }}>
            Generating…
          </span>
        )}

        {/* Token count */}
        {status === 'done' && usage && (
          <span style={{
            fontSize: '11px', color: 'var(--text-3)',
            background: 'var(--surface-3)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '2px 8px',
          }}>
            {usage.outputTokens.toLocaleString()} tokens
          </span>
        )}

        {/* Copy / Print — only when done */}
        {status === 'done' && (
          <>
            <button className="btn-ghost" onClick={handleCopy} style={{ padding: '4px 8px', fontSize: '12px' }}>
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button className="btn-ghost" onClick={handlePrint} style={{ padding: '4px 8px', fontSize: '12px' }}>
              <Printer size={12} /> Print
            </button>
          </>
        )}
      </div>

      {/* Content */}
      {(result || status === 'error') && (
        <div style={{ padding: '14px 18px' }}>
          {status === 'error' ? (
            <p style={{ color: 'var(--danger)', fontSize: '13px', margin: 0 }}>{error}</p>
          ) : (
            lines.map((line, i) => <ReportLine key={i} line={line} />)
          )}
          {status === 'running' && (
            <span style={{
              display: 'inline-block', width: '8px', height: '14px',
              background: 'var(--accent)', marginLeft: '2px',
              animation: 'blink 0.8s step-end infinite',
              verticalAlign: 'text-bottom',
            }} />
          )}
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
        @keyframes blink { 0%,100% { opacity:1; } 50% { opacity:0; } }
      `}</style>
    </div>
  );
}

// ─── Main export ───────────────────────────────────────────────────────────────
// Renders all sections that have been run (have a status other than 'idle')
export default function CalibrationReport({ vehicle, sectionResults, SECTION_BUTTONS }) {
  const activeKeys = SECTION_BUTTONS.filter(({ key }) => sectionResults[key]?.status !== 'idle');

  if (activeKeys.length === 0) return null;

  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');

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
            {vehicle.miles && (
              <span style={{
                fontSize: '11px', background: 'var(--surface-3)', color: 'var(--text-3)',
                padding: '2px 7px', borderRadius: '20px', border: '1px solid var(--border)',
              }}>
                {Number(vehicle.miles).toLocaleString()} mi
              </span>
            )}
          </div>
        </div>
      )}

      {/* One card per section that has been run */}
      {activeKeys.map(({ key, label }) => (
        <SectionOutputCard
          key={key}
          sectionKey={key}
          label={label}
          status={sectionResults[key]?.status}
          result={sectionResults[key]?.result}
          error={sectionResults[key]?.error}
          usage={sectionResults[key]?.usage}
        />
      ))}

      <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '20px' }}>
        Always validate calibration changes on a properly equipped dyno with a calibrated wideband O₂.
        This plan is a starting framework — on-engine data logging is required to finalize all tables.
      </p>
    </div>
  );
}
