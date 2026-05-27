import { useState } from 'react'
import { FLOW_NODES } from '../data/flowNodes'

const CATEGORIES = ['IO', 'System', 'Models', 'Memory', 'Security', 'Agents', 'Connectors', 'Skills']
const CAT_COLORS: Record<string, string> = {
  IO: '#7bed9f', System: '#ff6b6b', Models: '#6c63ff',
  Memory: '#00b4d8', Security: '#f8961e',
  Agents: '#f72585', Connectors: '#4cc9f0', Skills: '#7bed9f'
}

export default function Sidebar() {
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const filtered = FLOW_NODES.filter(n =>
    n.label.toLowerCase().includes(search.toLowerCase()) ||
    n.description.toLowerCase().includes(search.toLowerCase())
  )

  const byCategory = CATEGORIES.reduce((acc, cat) => {
    const nodes = filtered.filter(n => n.category === cat)
    if (nodes.length > 0) acc[cat] = nodes
    return acc
  }, {} as Record<string, typeof FLOW_NODES>)

  return (
    <div style={{
      width: 220, background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, overflow: 'hidden'
    }}>
      <div style={{ padding: '12px 12px 8px' }}>
        <input
          className="ra1-input"
          placeholder="Search nodes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ fontSize: 12 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 12px' }}>
        {Object.entries(byCategory).map(([cat, nodes]) => {
          const color = CAT_COLORS[cat] || '#8888aa'
          const isCollapsed = collapsed.has(cat)
          return (
            <div key={cat} style={{ marginBottom: 4 }}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '6px 4px', cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={() => setCollapsed(s => {
                  const n = new Set(s)
                  n.has(cat) ? n.delete(cat) : n.add(cat)
                  return n
                })}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', flex: 1 }}>
                  {cat}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0)', transition: 'transform 0.15s' }}>▾</span>
              </div>

              {!isCollapsed && nodes.map(node => (
                <div
                  key={node.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '7px 8px', marginBottom: 2,
                    background: 'var(--bg-node)', borderRadius: 7,
                    border: '1px solid var(--border)',
                    borderLeft: `3px solid ${color}`,
                    cursor: 'default', transition: 'border-color 0.15s'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = color)}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{node.label}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{node.description}</div>
                  </div>
                  {node.fixed && (
                    <span style={{ fontSize: 8, color, background: `${color}18`, padding: '1px 4px', borderRadius: 3, fontWeight: 700, flexShrink: 0 }}>SYS</span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}