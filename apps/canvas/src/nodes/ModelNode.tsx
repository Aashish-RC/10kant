import { memo } from 'react'
import { NodeProps } from 'reactflow'
import { useModelStore } from '../store/model.store'
import { useVaultStore } from '../store/vault.store'
import { PROVIDER_REGISTRY } from '../data/providers'

function StatusDot({ status }: { status: string }) {
  const c = status === 'healthy' ? '#22c55e' : status === 'degraded' ? '#f59e0b' : status === 'error' ? '#ef4444' : '#6b7280'
  return <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
}

function OverviewTab() {
  const { providers } = useModelStore()
  const { entries: vaultEntries } = useVaultStore()
  const list = Object.values(providers)

  if (list.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 24, marginBottom: 8 }}>🧩</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>No providers linked</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Drag a provider from the sidebar onto the canvas to get started.</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 360 }}>
      {list.map(p => {
        const def = PROVIDER_REGISTRY[p.providerId]
        const enabledModels = p.models.filter(m => m.enabled).length
        const hasKey = vaultEntries[p.providerId]?.isValid !== false && (def.requiresKey ? !!vaultEntries[p.providerId] : true)
        return (
          <div key={p.id} style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '8px 10px', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusDot status={p.status} />
            <span style={{ fontSize: 14 }}>{def.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{def.name}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{enabledModels} model{enabledModels !== 1 ? 's' : ''} enabled{def.requiresKey ? (hasKey ? ' · key stored' : ' · no key') : ' · local'}</div>
            </div>
            <div style={{ fontSize: 10, color: p.status === 'healthy' ? '#22c55e' : 'var(--text-muted)' }}>{p.status}</div>
          </div>
        )
      })}
    </div>
  )
}

function DeprecationsTab() {
  const { providers } = useModelStore()
  const deprecated = Object.values(providers).flatMap(p =>
    p.models.filter(m => m.deprecated).map(m => ({ ...m, providerName: PROVIDER_REGISTRY[p.providerId].name }))
  )

  if (deprecated.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>No deprecated models in your active providers.</div>
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 360 }}>
      {deprecated.map(m => (
        <div key={m.id} style={{ background: 'var(--bg-base)', borderRadius: 6, padding: '8px 10px', border: '1px solid #ef444433' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
            <span style={{ fontSize: 9, background: '#ef444422', color: '#ef4444', padding: '1px 6px', borderRadius: 3 }}>DEPRECATED</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
            {m.providerName} · Retires {m.deprecatedAt}
            {m.successor && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>→ use {m.successor}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

function ModelNodeExpanded() {
  const { providers, activeTab, setActiveTab, setModelExpanded } = useModelStore()
  const providerCount = Object.keys(providers).length
  const totalModels = Object.values(providers).reduce((s, p) => s + p.models.filter(m => m.enabled).length, 0)
  const statuses = Object.values(providers).map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : statuses.includes('degraded') ? 'degraded' : statuses.every(s => s === 'healthy') && statuses.length > 0 ? 'healthy' : 'unknown'

  return (
    <div style={{ width: 340, background: 'var(--bg-node)', border: '1px solid #6c63ff', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 0 0 1px #6c63ff33, 0 8px 32px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column' }}
      onClick={e => e.stopPropagation()}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onClick={() => setModelExpanded(false)}>
        <div style={{ width: 32, height: 32, borderRadius: 7, background: '#6c63ff22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧠</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Model</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{providerCount} provider{providerCount !== 1 ? 's' : ''} · {totalModels} model{totalModels !== 1 ? 's' : ''} enabled</div>
        </div>
        <StatusDot status={overallStatus} />
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
      </div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
        {(['overview', 'deprecations'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '4px 12px', fontSize: 11, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: activeTab === tab ? 'var(--accent)' : 'var(--bg-surface)', color: activeTab === tab ? 'white' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'deprecations' && <DeprecationsTab />}
      </div>
    </div>
  )
}

function ModelNodeCollapsed() {
  const { providers, hasNewDiscoveries, hasNewDeprecations } = useModelStore()
  const list = Object.values(providers)
  const statuses = list.map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : statuses.includes('degraded') ? 'degraded' : statuses.every(s => s === 'healthy') && statuses.length > 0 ? 'healthy' : 'unknown'
  const statusColor = overallStatus === 'healthy' ? '#22c55e' : overallStatus === 'degraded' ? '#f59e0b' : overallStatus === 'error' ? '#ef4444' : '#6b7280'

  return (
    <div style={{ width: 220, minHeight: 56, background: 'var(--bg-node)', border: `1px solid ${hasNewDiscoveries || hasNewDeprecations ? '#f59e0b44' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', boxShadow: hasNewDiscoveries || hasNewDeprecations ? '0 0 0 1px #f59e0b33, 0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
      <div style={{ width: 32, height: 32, borderRadius: 7, background: '#6c63ff22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, position: 'relative' }}>
        🧠
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: statusColor, border: '2px solid var(--bg-node)' }} />
        {(hasNewDiscoveries || hasNewDeprecations) && (
          <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid var(--bg-node)' }} />
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>Model</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
          {list.slice(0, 4).map(p => (
            <span key={p.id} style={{ fontSize: 13 }} title={PROVIDER_REGISTRY[p.providerId].name}>{PROVIDER_REGISTRY[p.providerId].icon}</span>
          ))}
          {list.length === 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>No providers</span>}
          {list.length > 4 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{list.length - 4}</span>}
        </div>
        {(hasNewDiscoveries || hasNewDeprecations) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {hasNewDiscoveries && <span style={{ fontSize: 8, background: '#22c55e22', color: '#22c55e', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>New models</span>}
            {hasNewDeprecations && <span style={{ fontSize: 8, background: '#ef444422', color: '#ef4444', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>Deprecations</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function ModelNode({ id: _id }: NodeProps) {
  const { modelExpanded } = useModelStore()
  return (
    <div style={{ cursor: 'pointer' }}>
      {modelExpanded ? <ModelNodeExpanded /> : <ModelNodeCollapsed />}
    </div>
  )
}

export default memo(ModelNode)