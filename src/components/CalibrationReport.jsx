import { useState } from 'react';
import {
  Car, ListOrdered, Droplets, BarChart2, Zap, Target,
  Wind, Gauge, RotateCcw, ArrowLeftRight, Shield, ClipboardList,
  Copy, Check, Printer, AlertTriangle,
} from 'lucide-react';

// ─── Section metadata ──────────────────────────────────────────────────────────
const SECTION_META = {
  'Vehicle Assessment':        { icon: Car,            color: '#8888A6' },
  'Tuning Order of Operations':{ icon: ListOrdered,    color: '#8888A6' },
  '1. Fuel System Calibration':{ icon: Droplets,       color: '#60A5FA' },
  '2. Volumetric Efficiency (VE) Table': { icon: BarChart2, color: '#34D399' },
  '3. Spark Timing':           { icon: Zap,            color: '#F59E0B' },
  '4. Air/Fuel Ratio Targets': { icon: Target,         color: '#F87171' },
  '5. MAF / Speed Density':    { icon: Wind,           color: '#A78BFA' },
  '6. Boost Control':          { icon: Gauge,          color: '#F97316' },
  '7. RPM & Cam/VVT':          { icon: RotateCcw,      color: '#2DD4BF' },
  '8. Transmission':           { icon: ArrowLeftRight, color: '#94A3B8' },
  '9. Safety & Knock Protection':{ icon: Shield,       color: '#F87171' },
  '10. Data Logging Checklist':{ icon: ClipboardList,  color: '#34D399' },
};

function getSectionMeta(title) {
  for (const [key, meta] of Object.entries(SECTION_META)) {
    if (title.includes(key) || key.includes(title)) return meta;
  }
  return { icon: Zap, color: 'var(--text-3)' };
}

// ─── Parse raw markdown into sections ─────────────────────────────────────────
function parseReport(text) {
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

// ─── Inline markdown formatter ─────────────────────────────────────────────────
function FormatInline({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} style={{ color: 'var(--text)', fontWeight: '500' }}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={i}>{part.slice(1, -1)}</code>;
        }
        return part;
      })}
    </>
  );
}

// ─── Render a single line ──────────────────────────────────────────────────────
function ReportLine({ line }) {
  if (!line.trim()) return null;

  const isWarning = line.startsWith('⚠️');
  const isDanger  = /(HARDWARE CONCERN|ADDITIONAL PARTS|DO NOT|CRITICAL)/i.test(line);

  if (isWarning) {
    const bg    = isDanger ? 'var(--danger-dim)' : 'var(--warning-dim)';
    const bdr   = isDanger ? 'rgba(248,113,113,0.3)' : 'rgba(245,158,11,0.3)';
    const color = isDanger ? 'var(--danger)' : 'var(--warning)';
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

// ─── Single report section card ────────────────────────────────────────────────
function SectionCard({ section }) {
  const meta = getSectionMeta(section.title);
  const IconComp = meta.icon;

  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)',
      padding: '16px 18px',
      marginBottom: '10px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '10px',
        marginBottom: '12px', paddingBottom: '10px',
        borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          width: '28px', height: '28px', borderRadius: '7px', flexShrink: 0,
          background: `${meta.color}18`,
          border: `1px solid ${meta.color}35`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <IconComp size={14} color={meta.color} strokeWidth={2} />
        </div>
        <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)', margin: 0 }}>
          {section.title}
        </h3>
      </div>

      <div>
        {section.lines.map((line, i) => (
          <ReportLine key={i} line={line} />
        ))}
      </div>
    </div>
  );
}

// ─── Main CalibrationReport component ─────────────────────────────────────────
export default function CalibrationReport({ vehicle, report, usage }) {
  const [copied, setCopied] = useState(false);
  const sections = parseReport(report);

  const vehicleLabel = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handlePrint = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html>
<html><head>
<meta charset="UTF-8">
<title>Calibration Plan — ${vehicleLabel}</title>
<style>
  body { font-family: 'Inter', system-ui, sans-serif; font-size: 13px; line-height: 1.7; color: #111; padding: 32px; max-width: 800px; margin: 0 auto; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .sub { color: #666; font-size: 13px; margin-bottom: 24px; }
  h2 { font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 6px; margin: 20px 0 8px; }
  p, li { font-size: 13px; margin: 4px 0; }
  ul { padding-left: 18px; }
  .warn { background: #FFF8E1; border: 1px solid #FFC107; border-radius: 4px; padding: 6px 10px; margin: 6px 0; font-weight: 500; }
  @media print { body { padding: 16px; } }
</style>
</head><body>
<h1>${vehicleLabel} — HP Tuners Calibration Plan</h1>
<p class="sub">Generated by HP Tuners Calibration Agent &bull; ${new Date().toLocaleDateString()}</p>
<hr>
${sections.map(s => `
  <h2>${s.title}</h2>
  ${s.lines.map(l => {
    if (!l.trim()) return '';
    if (l.startsWith('⚠️')) return `<div class="warn">${l}</div>`;
    if (l.match(/^[-*•]\s/)) return `<li>${l.replace(/^[-*•]\s/, '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</li>`;
    return `<p>${l.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>')}</p>`;
  }).join('')}
`).join('')}
</body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 500);
  };

  return (
    <div>
      {/* Report header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
      }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '3px' }}>
            {vehicleLabel}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>
              HP Tuners mpvi4 Calibration Plan
            </span>
            {vehicle.miles && (
              <span style={{
                fontSize: '11px', background: 'var(--surface-3)',
                color: 'var(--text-3)', padding: '2px 7px',
                borderRadius: '20px', border: '1px solid var(--border)',
              }}>
                {Number(vehicle.miles).toLocaleString()} mi
              </span>
            )}
            {usage && (
              <span style={{
                fontSize: '11px', background: 'var(--surface-3)',
                color: 'var(--text-3)', padding: '2px 7px',
                borderRadius: '20px', border: '1px solid var(--border)',
              }}>
                {usage.outputTokens.toLocaleString()} tokens
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-ghost" onClick={handleCopy} title="Copy plain text">
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button className="btn-ghost" onClick={handlePrint} title="Print / save as PDF">
            <Printer size={13} />
            Print
          </button>
        </div>
      </div>

      {/* Sections */}
      {sections.map((section, i) => (
        <SectionCard key={i} section={section} />
      ))}

      <p style={{ fontSize: '12px', color: 'var(--text-3)', textAlign: 'center', marginTop: '20px' }}>
        Always validate calibration changes on a properly equipped dyno with a calibrated wideband O₂. This plan is a starting framework — on-engine data logging is required to finalize all tables.
      </p>
    </div>
  );
}
