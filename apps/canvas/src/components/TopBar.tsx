export default function TopBar() {
  return (
    <div style={{
      height: 52, background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 12, flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #6c63ff, #f72585)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color: 'white'
        }}>R</div>
        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>RA1</span>
        <span style={{ color: 'var(--border-bright)', fontSize: 14 }}>·</span>
        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Chat Workspace</span>
      </div>

      <div style={{ flex: 1 }} />

      <button
        style={{
          height: 32, padding: '0 14px', borderRadius: 7,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
          fontFamily: 'var(--font)', transition: 'all 0.15s'
        }}
        onMouseEnter={e => { (e.target as HTMLElement).style.borderColor = 'var(--border-bright)'; (e.target as HTMLElement).style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.borderColor = 'var(--border)'; (e.target as HTMLElement).style.color = 'var(--text-secondary)' }}
        onClick={() => window.location.reload()}
      >
        Reset
      </button>

      <button
        onClick={() => window.open('http://localhost:3080', '_blank')}
        style={{
          height: 32, padding: '0 16px', borderRadius: 7,
          background: 'var(--accent)', border: 'none',
          color: 'white', fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'var(--font)',
          display: 'flex', alignItems: 'center', gap: 6,
          transition: 'opacity 0.15s'
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        <span>▶</span> Open Chat
      </button>
    </div>
  )
}