import { Clock, Trash2, ChevronRight } from 'lucide-react';

export default function HistoryPanel({ history, activeId, onLoad, onDelete, onClearAll }) {
  if (history.length === 0) return null;

  return (
    <div style={{ marginTop: '20px' }}>
      {/* Header row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <Clock size={13} color="var(--text-3)" />
          <span style={{
            fontSize: '11px', fontWeight: '600', color: 'var(--text-3)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
          }}>
            Recent Tunes ({history.length})
          </span>
        </div>
        <button
          className="btn-icon"
          onClick={onClearAll}
          title="Clear all history"
          style={{ fontSize: '11px', color: 'var(--text-3)', padding: '3px 7px' }}
        >
          Clear
        </button>
      </div>

      {/* History list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {history.map((item) => (
          <div
            key={item.id}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: activeId === item.id ? 'var(--accent-dim)' : 'var(--surface-2)',
              border: `1px solid ${activeId === item.id ? 'rgba(245,158,11,0.25)' : 'var(--border)'}`,
              borderRadius: 'var(--r)',
              padding: '8px 10px',
              cursor: 'pointer',
              transition: 'all 0.12s',
            }}
            onClick={() => onLoad(item.id)}
            onMouseEnter={(e) => {
              if (activeId !== item.id) {
                e.currentTarget.style.background = 'var(--surface-3)';
                e.currentTarget.style.borderColor = 'var(--border-2)';
              }
            }}
            onMouseLeave={(e) => {
              if (activeId !== item.id) {
                e.currentTarget.style.background = 'var(--surface-2)';
                e.currentTarget.style.borderColor = 'var(--border)';
              }
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <p style={{
                fontSize: '13px', fontWeight: '500',
                color: activeId === item.id ? 'var(--accent-2)' : 'var(--text)',
                margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {item.year} {item.make} {item.model}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', margin: '2px 0 0' }}>
                {new Date(item.timestamp).toLocaleDateString(undefined, {
                  month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              <button
                className="btn-icon"
                style={{ padding: '4px' }}
                title="Delete this entry"
                onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
              >
                <Trash2 size={12} />
              </button>
              <ChevronRight size={13} color="var(--text-3)" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
