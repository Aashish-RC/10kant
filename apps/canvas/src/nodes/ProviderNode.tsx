import { memo, useState, useCallback } from 'react'
import { NodeProps } from 'reactflow'
import { useModelStore } from '../store/model.store'
import { useVaultStore } from '../store/vault.store'
import { useCanvasStore } from '../store/canvasStore'
import { PROVIDER_REGISTRY, ProviderId, CAP_LABELS } from '../data/providers'

const S = {
  input: { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '6px 10px', fontFamily: 'var(--font)', outline: 'none' } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, marginTop: 10 } as React.CSSProperties,
  select: { width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', fontSize: 11, padding: '6px 28px 6px 10px', fontFamily: 'var(--font)', outline: 'none', appearance: 'none' as const, cursor: 'pointer' } as React.CSSProperties,
  toggle: (on: boolean, disabled?: boolean) => ({ width: 36, height: 20, borderRadius: 10, background: on ? 'var(--accent)' : 'var(--border-bright)', cursor: disabled ? 'not-allowed' : 'pointer', position: 'relative' as const, flexShrink: 0, transition: 'background 0.2s', opacity: disabled ? 0.5 : 1 }),
  knob: (on: boolean) => ({ position: 'absolute' as const, top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }),
  tinyBtn: { fontSize: 10, padding: '4px 8px', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  accentBtn: { fontSize: 10, padding: '4px 8px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' as const },
}

function ModelRow({
  model,
  providerColor,
  onToggle,
}: {
  model: { id: string; name: string; enabled: boolean; deprecated?: boolean; newlyDiscovered?: boolean; capabilities: string[] }
  providerColor: string
  onToggle: (id: string) => void
}) {
  const disabled = !!model.deprecated
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 6px', borderRadius: 4,
      background: model.newlyDiscovered ? `${providerColor}12` : 'transparent',
      opacity: disabled ? 0.55 : 1,
    }}>
      {/* Toggle */}
      <div style={S.toggle(model.enabled, disabled)} onClick={() => !disabled && onToggle(model.id)}>
        <div style={S.knob(model.enabled)} />
      </div>
      {/* Name + badges */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{model.name}</span>
          {model.newlyDiscovered && (
            <span style={{ fontSize: 8, background: '#22c55e22', color: '#22c55e', padding: '0 4px', borderRadius: 3, fontWeight: 700 }}>NEW</span>
          )}
          {model.deprecated && (
            <span style={{ fontSize: 8, background: '#ef444422', color: '#ef4444', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>DEPR</span>
          )}
        </div>
        {/* Capability chips */}
        <div style={{ display: 'flex', gap: 3, marginTop: 2, flexWrap: 'wrap' }}>
          {model.capabilities.slice(0, 3).map(cap => (
            <span key={cap} style={{ fontSize: 8, padding: '0 4px', background: 'var(--bg-surface)', borderRadius: 2, color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
              {CAP_LABELS[cap as keyof typeof CAP_LABELS] || cap}
            </span>
          ))}
          {model.capabilities.length > 3 && (
            <span style={{ fontSize: 8, color: 'var(--text-muted)' }}>+{model.capabilities.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function ProviderNodeExpanded({ nodeId, providerId }: { nodeId: string; providerId: ProviderId }) {
  const def = PROVIDER_REGISTRY[providerId]
  const { providers, setBaseUrl, setTemperature, toggleModel, syncModels, syncStatus, syncError } = useModelStore()
  const { saveKey, hasKey, getEntry, setKeyValid } = useVaultStore()
  const { removeProviderNode } = useCanvasStore()

  const provider = providers[nodeId]
  if (!provider) return null

  const [editKey, setEditKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)
  const [allowImageUploads, setAllowImageUploads] = useState(false)

  const keyEntry = getEntry(providerId)
  const keyStored = hasKey(providerId)

  const handleSaveKey = async () => {
    if (!editKey.trim()) return
    await saveKey(providerId, def.name, editKey.trim())
    setEditKey('')
    setShowKeyInput(false)
  }

  const handleTestConnection = async () => {
    await setKeyValid(providerId, true)
  }

  const enabledModels = provider.models.filter(m => m.enabled && !m.deprecated)
  const hasVision = provider.models.some(m => m.enabled && m.capabilities.includes('vision'))
  const isSyncing = syncStatus[nodeId] === 'syncing'
  const syncErr = syncError[nodeId]

  const handleSync = useCallback(() => {
    syncModels(nodeId)
  }, [nodeId, syncModels])

  const handleToggle = useCallback((modelId: string) => {
    toggleModel(nodeId, modelId)
  }, [nodeId, toggleModel])

  return (
    <div style={{ width: 300, background: 'var(--bg-node)', border: `1px solid ${def.color}`, borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: `0 0 0 1px ${def.color}33, 0 8px 32px rgba(0,0,0,0.5)`, display: 'flex', flexDirection: 'column' }}
      onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{ background: `${def.color}18`, borderBottom: '1px solid var(--border)', padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>{def.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>{def.name}</span>
          <button onClick={() => removeProviderNode(nodeId)} style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} title="Remove provider">✕</button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Inputs</span>
        </div>
      </div>

      {/* Config fields */}
      <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column' }}>

        {/* API Key — not shown for Ollama */}
        {def.requiresKey && (
          <>
            <label style={S.label}>Connect Credential <span style={{ color: '#ef4444' }}>*</span></label>
            {!keyStored && !showKeyInput ? (
              <button
                onClick={() => setShowKeyInput(true)}
                style={{ width: '100%', padding: '7px 10px', fontSize: 11, background: '#f8961e22', border: '1px dashed #f8961e', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'center' }}
              >
                + Add API Key
              </button>
            ) : showKeyInput ? (
              <div style={{ display: 'flex', gap: 6 }}>
                <input type="password" value={editKey} onChange={e => setEditKey(e.target.value)} placeholder="Paste API key..." style={{ ...S.input, flex: 1 }} autoFocus />
                <button onClick={handleSaveKey} style={{ fontSize: 10, padding: '6px 8px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', whiteSpace: 'nowrap' }}>Save</button>
                <button onClick={() => { setShowKeyInput(false); setEditKey('') }} style={{ fontSize: 10, padding: '6px 8px', background: 'var(--bg-surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>✕</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: 'var(--text-muted)' }}>
                  {keyEntry?.maskedValue} <span style={{ color: keyEntry?.isValid === true ? '#22c55e' : keyEntry?.isValid === false ? '#ef4444' : 'var(--text-muted)', marginLeft: 4 }}>{keyEntry?.isValid === true ? '✓' : keyEntry?.isValid === false ? '✗' : '?'}</span>
                </div>
                <button onClick={handleTestConnection} style={{ fontSize: 10, padding: '4px 8px', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Test</button>
                <button onClick={() => { setShowKeyInput(true) }} style={{ fontSize: 10, padding: '4px 8px', background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Rotate</button>
              </div>
            )}
            {/* Inline vault entries list when there are stored keys */}
            {keyStored && !showKeyInput && (
              <div style={{ marginTop: 6, fontSize: 10, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: keyEntry?.isValid === null ? '#6b7280' : keyEntry?.isValid ? '#22c55e' : '#ef4444' }} />
                {keyEntry?.providerName} · {keyEntry?.isValid === null ? 'untested' : keyEntry?.isValid ? 'valid' : 'invalid'}
                {keyEntry && <span>· {new Date(keyEntry.lastUpdated).toLocaleDateString()}</span>}
              </div>
            )}
          </>
        )}

        {/* Model list — multi-select */}
        <label style={S.label}>Models <span style={{ color: '#ef4444' }}>*</span></label>

        {/* Sync button + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <button
            onClick={handleSync}
            disabled={isSyncing || provider.providerId === 'ollama' || provider.providerId === 'custom'}
            style={{
              ...S.tinyBtn,
              opacity: isSyncing ? 0.6 : 1,
              cursor: isSyncing ? 'wait' : 'pointer',
            }}
          >
            {isSyncing ? '⟳ Syncing...' : '⟳ Sync Models'}
          </button>
          {syncErr && (
            <span style={{ fontSize: 9, color: '#ef4444', flex: 1 }} title={syncErr}>Sync failed</span>
          )}
          {!syncErr && provider.models.length > 0 && (
            <span style={{ fontSize: 9, color: 'var(--text-muted)', flex: 1 }}>
              {enabledModels.length} active · {provider.models.filter(m => m.deprecated).length} deprecated · {provider.models.filter(m => m.newlyDiscovered).length} new
            </span>
          )}
        </div>

        {/* Model rows in a scrollable area */}
        <div style={{
          maxHeight: 180, overflowY: 'auto',
          background: 'var(--bg-base)', borderRadius: 6,
          border: '1px solid var(--border)', padding: 4,
        }}>
          {provider.models.length === 0 ? (
            <div style={{ padding: '8px 6px', fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center' }}>
              {provider.providerId === 'ollama' || provider.providerId === 'custom'
                ? 'Use Auto-detect below'
                : 'No models yet. Click Sync Models.'}
            </div>
          ) : (
            provider.models.map(m => (
              <ModelRow key={m.id} model={m} providerColor={def.color} onToggle={handleToggle} />
            ))
          )}
        </div>

        {/* Temperature */}
        <label style={S.label}>Temperature</label>
        <input
          type="number" min={0} max={2} step={0.1}
          value={provider.temperature}
          onChange={e => setTemperature(nodeId, parseFloat(e.target.value))}
          style={S.input}
        />

        {/* Allow Image Uploads toggle — only if provider has vision models */}
        {hasVision && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Allow Image Uploads</span>
            <div style={S.toggle(allowImageUploads)} onClick={() => setAllowImageUploads(v => !v)}>
              <div style={S.knob(allowImageUploads)} />
            </div>
          </div>
        )}

        {/* Ollama-specific: base URL + auto-detect */}
        {providerId === 'ollama' && (
          <>
            <label style={S.label}>Endpoint URL</label>
            <input style={S.input} value={provider.baseUrl} onChange={e => setBaseUrl(nodeId, e.target.value)} placeholder="http://localhost:11434" />
            <button
              onClick={async () => {
                try {
                  const r = await fetch(`${provider.baseUrl}/api/tags`)
                  const data = await r.json()
                  if (data.models) {
                    // Map Ollama models into our format
                    const ollamaModels = data.models.map((m: any) => ({
                      id: m.name,
                      name: m.name,
                      contextWindow: 4096,
                      costPer1k: { input: 0, output: 0 },
                      capabilities: [],
                      enabled: true,
                    }))
                    useModelStore.setState(s => ({
                      providers: {
                        ...s.providers,
                        [nodeId]: {
                          ...s.providers[nodeId],
                          models: ollamaModels,
                          status: 'healthy' as const,
                        },
                      },
                    }))
                  }
                } catch { /* silent */ }
              }}
              style={{ marginTop: 8, width: '100%', padding: '7px', fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              Auto-detect Models
            </button>
          </>
        )}
      </div>

      {/* Output label */}
      <div style={{ background: `${def.color}18`, borderTop: '1px solid var(--border)', padding: '6px 12px', display: 'flex', justifyContent: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Output</span>
      </div>
    </div>
  )
}

function ProviderNodeCollapsed({ nodeId, providerId }: { nodeId: string; providerId: ProviderId }) {
  const def = PROVIDER_REGISTRY[providerId]
  const { providers } = useModelStore()
  const provider = providers[nodeId]
  const statusColor = !provider ? '#6b7280' : provider.status === 'healthy' ? '#22c55e' : provider.status === 'error' ? '#ef4444' : '#6b7280'

  const newCount = provider?.models.filter(m => m.newlyDiscovered).length ?? 0
  const depCount = provider?.models.filter(m => m.deprecated).length ?? 0

  return (
    <div style={{ width: 200, minHeight: 56, background: 'var(--bg-node)', border: `1px solid ${def.color}44`, borderRadius: 'var(--radius)', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px' }}>
      <div style={{ width: 30, height: 30, borderRadius: 7, background: `${def.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, position: 'relative' }}>
        {def.icon}
        <div style={{ position: 'absolute', bottom: -2, right: -2, width: 8, height: 8, borderRadius: '50%', background: statusColor, border: '2px solid var(--bg-node)' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>{def.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
          {provider ? `${provider.models.filter(m => m.enabled).length} enabled` : 'loading...'}
        </div>
        {(newCount > 0 || depCount > 0) && (
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            {newCount > 0 && <span style={{ fontSize: 8, background: '#22c55e22', color: '#22c55e', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>{newCount} new</span>}
            {depCount > 0 && <span style={{ fontSize: 8, background: '#ef444422', color: '#ef4444', padding: '0 4px', borderRadius: 3, fontWeight: 600 }}>{depCount} dep.</span>}
          </div>
        )}
      </div>
    </div>
  )
}

function ProviderNode({ id, data }: NodeProps<{ nodeId: string; providerId: ProviderId }>) {
  const { expandedIds } = useCanvasStore()
  const isExpanded = expandedIds.has(id)

  return (
    <div style={{ cursor: 'pointer' }}>
      {isExpanded
        ? <ProviderNodeExpanded nodeId={data.nodeId} providerId={data.providerId} />
        : <ProviderNodeCollapsed nodeId={data.nodeId} providerId={data.providerId} />
      }
    </div>
  )
}

export default memo(ProviderNode)