import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { FlowNodeDef } from '../data/flowNodes'
import { useCanvasStore } from '../store/canvasStore'

function ConfigFields({ def, nodeId }: { def: FlowNodeDef; nodeId: string }) {
  const { configValues, setConfigValue } = useCanvasStore()
  const vals = configValues[nodeId] || {}
  const [showPw, setShowPw] = useState<Record<string, boolean>>({})

  if (def.fixed && def.configFields.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 8 }}>
        System node — managed by RA1
      </p>
    )
  }
  if (def.configFields.length === 0) {
    return (
      <p style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 8 }}>
        No configuration required
      </p>
    )
  }

  return (
    <div style={{ marginTop: 8 }}>
      {def.configFields.map(field => {
        const val = vals[field.key] ?? field.default ?? ''
        if (field.type === 'toggle') {
          const on = val === true || val === 'true'
          return (
            <div key={field.key} className="ra1-toggle">
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{field.label}</span>
              <div
                className={`ra1-toggle-track ${on ? 'on' : ''}`}
                style={{ '--color': def.color } as any}
                onClick={() => setConfigValue(nodeId, field.key, !on)}
              >
                <div className="ra1-toggle-knob" />
              </div>
            </div>
          )
        }
        if (field.type === 'select') {
          return (
            <div key={field.key}>
              <label className="ra1-label">{field.label}</label>
              <select
                className="ra1-select"
                value={val as string}
                onChange={e => setConfigValue(nodeId, field.key, e.target.value)}
              >
                {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
          )
        }
        if (field.type === 'textarea') {
          return (
            <div key={field.key}>
              <label className="ra1-label">{field.label}</label>
              <textarea
                className="ra1-input"
                rows={3}
                style={{ resize: 'none' }}
                value={val as string}
                placeholder={field.placeholder}
                onChange={e => setConfigValue(nodeId, field.key, e.target.value)}
              />
            </div>
          )
        }
        return (
          <div key={field.key} style={{ position: 'relative' }}>
            <label className="ra1-label">{field.label}</label>
            <input
              className="ra1-input"
              type={field.type === 'password' && !showPw[field.key] ? 'password' : 'text'}
              value={val as string}
              placeholder={field.placeholder}
              onChange={e => setConfigValue(nodeId, field.key, e.target.value)}
            />
            {field.type === 'password' && (
              <button
                onClick={() => setShowPw(p => ({ ...p, [field.key]: !p[field.key] }))}
                style={{
                  position: 'absolute', right: 8, bottom: 7,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 10, padding: 0
                }}
              >
                {showPw[field.key] ? 'hide' : 'show'}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Ra1Node({ id, data, selected }: NodeProps<FlowNodeDef>) {
  const { expandedIds, toggleExpand } = useCanvasStore()
  const expanded = expandedIds.has(id)

  return (
    <div
      className="ra1-node"
      onClick={() => toggleExpand(id)}
      style={{
        width: 240,
        background: 'var(--bg-node)',
        border: `1px solid ${selected ? data.color : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: selected
          ? `0 0 0 1px ${data.color}44, 0 8px 32px rgba(0,0,0,0.5)`
          : '0 4px 16px rgba(0,0,0,0.4)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <div style={{ height: 3, background: data.color, borderRadius: '10px 10px 0 0' }} />

      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: expanded ? '10px 12px 8px' : '0 12px',
        height: expanded ? 'auto' : 56,
        minHeight: 56,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7, flexShrink: 0,
          background: `${data.color}22`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, color: data.color
        }}>
          {data.label[0]}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.2 }}>
            {data.label}
          </div>
          {expanded && (
            <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.3 }}>
              {data.description}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {data.fixed && (
            <span style={{
              fontSize: 8, fontWeight: 700, color: data.color,
              background: `${data.color}18`, padding: '2px 5px',
              borderRadius: 4, letterSpacing: '0.05em', textTransform: 'uppercase'
            }}>FIXED</span>
          )}
          <span style={{
            fontSize: 10, color: 'var(--text-muted)',
            transition: 'transform 0.2s',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
          }}>▾</span>
        </div>
      </div>

      {expanded && (
        <div
          className="node-body"
          style={{ padding: '0 12px 12px' }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          <ConfigFields def={data} nodeId={id} />
        </div>
      )}

      <Handle type="target" position={Position.Top} style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
    </div>
  )
}

export default memo(Ra1Node)