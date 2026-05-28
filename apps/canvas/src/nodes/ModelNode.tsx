import { memo, useState, useCallback } from 'react'
import { NodeProps } from 'reactflow'
import { useModelStore } from '../store/model.store'
import { useVaultStore } from '../store/vault.store'
import { PROVIDER_REGISTRY } from '../data/providers'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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

function UpdatesTab() {
  const {
    pendingChanges, hasChanges, lastChecked,
    applyChanges,
  } = useModelStore()
  const [applying, setApplying] = useState<Set<string>>(new Set())
  const [syncing, setSyncing] = useState(false)

  const providerIds = Object.keys(pendingChanges)
  const multipleProviders = providerIds.length > 1

  const handleApply = useCallback(async (ids: string[]) => {
    setApplying(prev => new Set([...prev, ...ids]))
    await applyChanges(ids)
    setApplying(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.delete(id))
      return next
    })
  }, [applyChanges])

  const handleSyncNow = useCallback(async () => {
    setSyncing(true)
    try {
      await fetch(`${API_BASE}/api/models/sync/trigger`, { method: 'POST' })
      // Poll will pick up changes on next cycle
    } catch { /* ignore */ }
    setSyncing(false)
  }, [])

  const minutesAgo = lastChecked ? Math.floor((Date.now() - lastChecked) / 60000) : null

  if (!hasChanges || providerIds.length === 0) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 20, marginBottom: 6 }}>✓</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          All models up to date
          {minutesAgo !== null && <span> · Last checked {minutesAgo < 1 ? 'just now' : `${minutesAgo}m ago`}</span>}
        </div>
        <button
          onClick={handleSyncNow}
          disabled={syncing}
          style={{
            fontSize: 10, padding: '6px 14px', background: syncing ? 'var(--bg-surface)' : 'var(--accent)',
            color: 'white', border: 'none', borderRadius: 4, cursor: syncing ? 'wait' : 'pointer',
          }}
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 6, overflowY: 'auto', maxHeight: 360 }}>
      {/* Apply All button */}
      {multipleProviders && (
        <button
          onClick={() => handleApply(providerIds)}
          disabled={applying.size > 0}
          style={{
            width: '100%', padding: '8px', fontSize: 11, fontWeight: 600,
            background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44',
            borderRadius: 6, cursor: 'pointer',
          }}
        >
          {applying.size > 0 ? 'Applying...' : `Apply All (${providerIds.length} providers)`}
        </button>
      )}

      {/* Per-provider groups */}
      {providerIds.map(pid => {
        const changes = pendingChanges[pid] || []
        const def = PROVIDER_REGISTRY[pid as keyof typeof PROVIDER_REGISTRY]
        const providerName = def?.name || pid
        const providerIcon = def?.icon || '📡'
        const isApplying = applying.has(pid)

        const added = changes.filter(c => c.changeType === 'added')
        const removed = changes.filter(c => c.changeType === 'removed')
        const deprecatedEntries = changes.filter(c => c.changeType === 'deprecated')

        return (
          <div key={pid} style={{ background: 'var(--bg-base)', borderRadius: 6, border: '1px solid var(--border)', overflow: 'hidden' }}>
            {/* Provider header */}
            <div style={{ padding: '8px 10px', background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{providerIcon}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>{providerName}</span>
              <button
                onClick={() => handleApply([pid])}
                disabled={isApplying}
                style={{
                  fontSize: 10, padding: '4px 10px',
                  background: isApplying ? 'var(--bg-surface)' : '#f59e0b',
                  color: 'white', border: 'none', borderRadius: 4, cursor: isApplying ? 'wait' : 'pointer',
                }}
              >
                {isApplying ? '...' : 'Apply'}
              </button>
            </div>

            {/* Changes list */}
            <div style={{ padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {added.map(c => (
                <div key={`a-${c.modelId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ color: '#22c55e' }}>🟢</span>
                  <span style={{ color: '#22c55e', fontWeight: 500 }}>{c.modelName || c.modelId}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>added</span>
                </div>
              ))}
              {removed.map(c => (
                <div key={`r-${c.modelId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ color: '#ef4444' }}>🔴</span>
                  <span style={{ color: '#ef4444', fontWeight: 500 }}>{c.modelName || c.modelId}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>removed</span>
                </div>
              ))}
              {deprecatedEntries.map(c => (
                <div key={`d-${c.modelId}`} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  <span style={{ color: '#f59e0b' }}>🟡</span>
                  <span style={{ color: '#f59e0b', fontWeight: 500 }}>{c.modelName || c.modelId}</span>
                  {c.detail && <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>· {c.detail}</span>}
                </div>
              ))}
              {changes.length === 0 && (
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', padding: '4px 0' }}>No pending changes</div>
              )}
            </div>
          </div>
        )
      })}
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
        {(['overview', 'deprecations', 'updates'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '4px 12px', fontSize: 11, fontWeight: 500, borderRadius: 4, border: 'none', cursor: 'pointer', background: activeTab === tab ? 'var(--accent)' : 'var(--bg-surface)', color: activeTab === tab ? 'white' : 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {tab}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'deprecations' && <DeprecationsTab />}
        {activeTab === 'updates' && <UpdatesTab />}
      </div>
    </div>
  )
}

function ModelNodeCollapsed() {
  const { providers, hasNewDiscoveries, hasNewDeprecations, hasChanges } = useModelStore()
  const list = Object.values(providers)
  const statuses = list.map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : statuses.includes('degraded') ? 'degraded' : statuses.every(s => s === 'healthy') && statuses.length > 0 ? 'healthy' : 'unknown'
  const statusColor = overallStatus === 'healthy' ? '#22c55e' : overallStatus === 'degraded' ? '#f59e0b' : overallStatus === 'error' ? '#ef4444' : '#6b7280'

  return (
    <div style={{ width: 220, minHeight: 56, background: 'var(--bg-node)', border: `1px solid ${hasChanges ? '#f59e0b44' : hasNewDiscoveries || hasNewDeprecations ? '#f59e0b44' : 'var(--border)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', boxShadow: hasChanges || hasNewDiscoveries || hasNewDeprecations ? '0 0 0 1px #f59e0b33, 0 4px 16px rgba(0,0,0,0.4)' : '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
      <div style={{ width: 32, height: 32, borderRadius: 7, background: '#6c63ff22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, position: 'relative' }}>
        🧠
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: statusColor, border: '2px solid var(--bg-node)' }} />
        {(hasChanges || hasNewDiscoveries || hasNewDeprecations) && (
          <div style={{ position: 'absolute', top: -4, left: -4, width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', border: '2px solid var(--bg-node)', boxShadow: hasChanges ? '0 0 6px #f59e0b' : undefined }} />
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
        {(hasChanges || hasNewDiscoveries || hasNewDeprecations) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {hasChanges && <span style={{ fontSize: 8, background: '#f59e0b22', color: '#f59e0b', padding: '0 4px', borderRadius: 3, fontWeight: 600, animation: 'pulse 2s infinite' }}>Model updates available</span>}
            {hasNewDiscoveries && !hasChanges && <span style={{ fontSize: 8, background: '#22c55e22', color: '#22c55e', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>New models</span>}
            {hasNewDeprecations && !hasChanges && <span style={{ fontSize: 8, background: '#ef444422', color: '#ef4444', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>Deprecations</span>}
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