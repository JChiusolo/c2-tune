import { IconClock, IconTrash, IconChevronRight } from './Icons.jsx';

export default function HistoryPanel({ history, activeId, onLoad, onDelete, onClearAll }) {
  if (!history || history.length === 0) return null;

  return (
    <div style={{ marginTop:'20px' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
          <IconClock size={13} color="var(--text-3)" />
          <span style={{ fontSize:'11px', fontWeight:'600', color:'var(--text-3)', textTransform:'uppercase', letterSpacing:'0.07em' }}>
            Recent Tunes ({history.length})
          </span>
        </div>
        <button className="btn-icon" onClick={onClearAll} title="Clear all history"
          style={{ fontSize:'11px', color:'var(--text-3)', padding:'3px 7px', background:'transparent', border:'none', cursor:'pointer' }}>
          Clear
        </button>
      </div>

      <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
        {history.map((item) => {
          const isActive = activeId === item.id;
          return (
            <div key={item.id}
              style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background: isActive ? 'var(--accent-dim)' : 'var(--surface-2)', border:`1px solid ${isActive ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`, borderRadius:'var(--r)', padding:'8px 10px', cursor:'pointer', transition:'all 0.12s' }}
              onClick={() => onLoad(item.id)}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background='var(--surface-3)'; e.currentTarget.style.borderColor='var(--border-2)'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background='var(--surface-2)'; e.currentTarget.style.borderColor='var(--border)'; } }}>
              <div style={{ minWidth:0, flex:1 }}>
                <p style={{ fontSize:'13px', fontWeight:'500', color: isActive ? 'var(--accent-2)' : 'var(--text)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  {item.year} {item.make} {item.model}
                </p>
                <p style={{ fontSize:'11px', color:'var(--text-3)', margin:'2px 0 0' }}>
                  {item.timestamp ? new Date(item.timestamp).toLocaleDateString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—'}
                </p>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'4px', flexShrink:0 }}>
                <button onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                  title="Delete" style={{ padding:'4px', background:'transparent', border:'none', cursor:'pointer', color:'var(--text-3)', display:'flex', lineHeight:0 }}>
                  <IconTrash size={12} />
                </button>
                <IconChevronRight size={13} color="var(--text-3)" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
