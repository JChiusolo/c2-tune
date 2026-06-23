import { Zap, ExternalLink } from 'lucide-react';

const styles = {
  header: {
    height: 'var(--header-h)',
    background: 'var(--surface)',
    borderBottom: '1px solid var(--border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    flexShrink: 0,
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  iconWrap: {
    width: '30px',
    height: '30px',
    background: 'var(--accent-dim)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(245, 158, 11, 0.25)',
  },
  title: {
    fontSize: '15px',
    fontWeight: '600',
    color: 'var(--text)',
    letterSpacing: '-0.01em',
  },
  badge: {
    fontSize: '11px',
    fontWeight: '500',
    background: 'var(--surface-3)',
    color: 'var(--text-3)',
    padding: '2px 7px',
    borderRadius: '20px',
    border: '1px solid var(--border)',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  link: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: 'var(--text-3)',
    textDecoration: 'none',
    padding: '5px 10px',
    borderRadius: 'var(--r)',
    border: '1px solid transparent',
    transition: 'all 0.15s',
    fontWeight: '500',
  },
};

export default function Header() {
  return (
    <header style={styles.header}>
      <div style={styles.left}>
        <div style={styles.iconWrap}>
          <Zap size={16} color="var(--accent)" strokeWidth={2.5} />
        </div>
        <span style={styles.title}>HP Tuners Calibration Agent</span>
        <span style={styles.badge}>mpvi4</span>
      </div>

      <div style={styles.right}>
        <a
          href="https://www.hptuners.com"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--surface-2)';
            e.currentTarget.style.borderColor = 'var(--border-2)';
            e.currentTarget.style.color = 'var(--text-2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-3)';
          }}
        >
          hptuners.com
          <ExternalLink size={11} />
        </a>
      </div>
    </header>
  );
}
