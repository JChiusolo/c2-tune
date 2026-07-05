import { IconZap, IconExternalLink } from './Icons.jsx';

export default function Header() {
  return (
    <header style={{ height:'var(--header-h)', background:'var(--surface)', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 20px', flexShrink:0, position:'sticky', top:0, zIndex:100 }}>
      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
        <div style={{ width:'30px', height:'30px', background:'var(--accent-dim)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', border:'1px solid rgba(245,158,11,0.25)' }}>
          <IconZap size={16} color="var(--accent)" />
        </div>
        <span style={{ fontSize:'15px', fontWeight:'600', color:'var(--text)', letterSpacing:'-0.01em' }}>HP Tuners Calibration Agent</span>
        <span style={{ fontSize:'11px', fontWeight:'500', background:'var(--surface-3)', color:'var(--text-3)', padding:'2px 7px', borderRadius:'20px', border:'1px solid var(--border)' }}>mpvi4</span>
      </div>
      <a href="https://www.hptuners.com" target="_blank" rel="noopener noreferrer"
        style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'12px', color:'var(--text-3)', textDecoration:'none', padding:'5px 10px', borderRadius:'var(--r)', transition:'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background='var(--surface-2)'; e.currentTarget.style.color='var(--text-2)'; }}
        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='var(--text-3)'; }}>
        hptuners.com <IconExternalLink size={11} />
      </a>
    </header>
  );
}
