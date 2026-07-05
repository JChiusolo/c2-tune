import { IconWrench, IconTarget, IconAlertCircle } from './Icons.jsx';

const GOAL_PRESETS = [
  { label: 'Max street — 93 oct', value: 'Maximum reliable street performance on 93 octane pump gas. Daily driver — must idle cleanly and pass emissions.' },
  { label: 'Street/strip — E85',  value: 'Maximum power on E85 ethanol. Street-driven but track use on weekends. No emissions requirement.' },
  { label: 'Tow/haul — torque',   value: 'Maximize low-end torque and towing capacity. Optimize fuel economy at cruise. Prioritize reliability and transmission longevity.' },
  { label: 'Race only',           value: 'Maximum race power — no street or emissions requirement. Aggressive timing, target max power band, no drivability concern.' },
];

const fieldStyle = { marginBottom:'14px' };

export default function VehicleForm({ data, onChange, onSubmit, loading, error }) {
  const set = (key) => (e) => onChange({ ...data, [key]: e.target.value });
  return (
    <form onSubmit={e => { e.preventDefault(); onSubmit(); }} style={{ display:'flex', flexDirection:'column', gap:0 }}>

      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'14px' }}>
        <IconWrench size={14} color="var(--text-3)" />
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Vehicle</span>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'84px 1fr 1fr', gap:'10px', marginBottom:'14px' }}>
        {[['year','Year','2022','number'],['make','Make','Chevrolet','text'],['model','Model / Engine','Camaro SS (LT1)','text']].map(([k,lbl,ph,type]) => (
          <div key={k}>
            <label htmlFor={k}>{lbl}</label>
            <input id={k} type={type} placeholder={ph} value={data[k]} onChange={set(k)}
              min={k==='year'?'1980':undefined} max={k==='year'?'2030':undefined} required />
          </div>
        ))}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="miles">Mileage</label>
        <input id="miles" type="number" min="0" placeholder="45000" value={data.miles} onChange={set('miles')} />
      </div>

      <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0 14px' }} />

      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'14px' }}>
        <IconWrench size={14} color="var(--text-3)" />
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Hardware Modifications</span>
      </div>

      <div style={fieldStyle}>
        <label htmlFor="mods">List all hardware mods with specs</label>
        <textarea id="mods" rows={5} value={data.mods} onChange={set('mods')} required style={{ minHeight:'130px' }}
          placeholder={'• Stage 2 cam: 228/236 dur, .595/.598 lift, 114+2 LSA\n• LT headers 1-7/8" with high-flow cats\n• Cold air intake\n• 60lb Delphi injectors\n• Magnuson TVS2300 SC @ 9 psi\n• Walbro 255lph fuel pump'} />
      </div>

      <div style={{ borderTop:'1px solid var(--border)', margin:'4px 0 14px' }} />

      <div style={{ display:'flex', alignItems:'center', gap:'7px', marginBottom:'14px' }}>
        <IconTarget size={14} color="var(--text-3)" />
        <span style={{ fontSize:'12px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>Client Goal</span>
      </div>

      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'10px' }}>
        {GOAL_PRESETS.map(p => (
          <button key={p.label} type="button" className="btn-ghost" style={{ fontSize:'12px', padding:'4px 9px' }}
            onClick={() => onChange({ ...data, goal: p.value })}>{p.label}</button>
        ))}
      </div>

      <div style={fieldStyle}>
        <label htmlFor="goal">Describe the goal</label>
        <textarea id="goal" rows={3} value={data.goal} onChange={set('goal')} required style={{ minHeight:'80px' }}
          placeholder="e.g. Max reliable street/strip power on 93 oct. Daily driver — must pass OBDII emissions. Target 550whp." />
      </div>

      {error && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:'8px', background:'var(--danger-dim)', border:'1px solid rgba(248,113,113,0.25)', borderRadius:'var(--r)', padding:'10px 12px', marginBottom:'12px' }}>
          <IconAlertCircle size={15} color="var(--danger)" style={{ flexShrink:0, marginTop:'1px' }} />
          <span style={{ fontSize:'13px', color:'var(--danger)', lineHeight:'1.5' }}>{error}</span>
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? <><Spinner /> Analyzing build…</> : 'Generate Calibration Plan'}
      </button>
    </form>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation:'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
