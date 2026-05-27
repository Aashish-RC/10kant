import { memo, useState } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { useNodeShellStore } from './NodeShell.store'
import { NodeShellState, ProviderId } from './NodeShell.types'
import { vaultGet, vaultSave, vaultHas } from './CredentialVault'
import AddProviderModal from './AddProviderModal'

const TIER_LABELS: Record<string, string> = {
  T0: 'T0 (Simple)',
  T1: 'T1 (Standard)',
  T2: 'T2 (Complex)',
  T3: 'T3 (Advanced)',
}

const CAPABILITY_LABELS: Record<string, string> = {
  code: 'Code',
  reasoning: 'Reasoning',
  vision: 'Vision',
  speed: 'Speed',
  'long-ctx': 'Long Ctx',
  'cost-efficient': 'Budget',
}

const styles = {
  tab: (active: boolean) => ({
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 500,
    borderRadius: 4,
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--accent)' : 'var(--bg-surface)',
    color: active ? 'white' : 'var(--text-secondary)',
    transition: 'background 0.15s',
  }),
  input: {
    width: '100%',
    background: 'var(--bg-base)',
    border: '1px solid var(--border)',
    borderRadius: 6,
    color: 'var(--text-primary)',
    fontSize: 11,
    padding: '6px 10px',
    fontFamily: 'var(--font)',
    outline: 'none',
  },
  label: {
    display: 'block',
    fontSize: 10,
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 4,
    marginTop: 10,
  },
}

function StatusRing({ status, size = 20 }: { status: 'healthy' | 'degraded' | 'error' | 'unknown'; size?: number }) {
  const getStatusColor = () => {
    switch (status) {
      case 'healthy': return '#22c55e'
      case 'degraded': return '#f59e0b'
      case 'error': return '#ef4444'
      default: return '#6b7280'
    }
  }

  const ringColor = getStatusColor()
  const ringWidth = size * 0.15
  const ringOffset = size * 0.85

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - ringWidth / 2}
        fill="none"
        stroke="var(--border)"
        strokeWidth={ringWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={size / 2 - ringWidth / 2}
        fill="none"
        stroke={ringColor}
        strokeWidth={ringWidth}
        strokeDasharray={`${ringOffset} ${ringOffset}`}
        strokeDashoffset={status === 'healthy' ? 0 : status === 'degraded' ? 90 : 180}
        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
      />
    </svg>
  )
}

function ProviderLogo({ providerId }: { providerId: string }) {
  const logos: Record<string, string> = {
    openai: '🤖',
    anthropic: '🟣',
    google: '🔍',
    mistral: '🔥',
    cohere: '💠',
    together: '🔗',
    groq: '⚡',
    ollama: '🐙',
    custom: '⚙️',
    'custom-endpoint': '⚙️',
  }

  return (
    <div 
      style={{
        width: 24,
        height: 24,
        borderRadius: 6,
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 600,
        color: 'var(--text-primary)',
      }}
      title={providerId === 'custom' || providerId === 'custom-endpoint' ? 'Custom Endpoint' : providerId.charAt(0).toUpperCase() + providerId.slice(1)}
    >
      {logos[providerId] || '🤖'}
    </div>
  )
}

function ModelRow({ 
  model, 
  onSetTier 
}: { 
  model: any
  onSetTier: (modelId: string, tier: 'T0' | 'T1' | 'T2' | 'T3') => void 
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, background: 'var(--bg-surface)', borderRadius: 4, fontSize: 11 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{model.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
          {model.contextWindow.toLocaleString()} tokens | ${model.costPer1k.input}/1k in, ${model.costPer1k.output}/1k out
        </div>
        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
          {model.capabilities.map((cap: string) => (
            <span key={cap} style={{ padding: '2px 6px', background: 'var(--border)', borderRadius: 2, fontSize: 9, color: 'var(--text-muted)' }}>
              {CAPABILITY_LABELS[cap] || cap}
            </span>
          ))}
        </div>
      </div>
      
      <div style={{ position: 'relative', marginLeft: 8 }}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{ padding: '4px 8px', background: 'var(--accent)', borderRadius: 4, color: 'white', fontSize: 10, fontWeight: 500 }}
        >
          {model.tier || 'Tier'}
        </button>
        
        {menuOpen && (
          <div style={{ position: 'absolute', right: 0, top: 28, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, padding: 4, zIndex: 100, width: 100 }}>
            {(['T0', 'T1', 'T2', 'T3'] as const).map(tier => (
              <button
                key={tier}
                onClick={() => { onSetTier(model.id, tier); setMenuOpen(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', fontSize: 10, background: 'none', border: 'none', color: 'var(--text-primary)', cursor: 'pointer' }}
              >
                {TIER_LABELS[tier]}
              </button>
            ))}
            {model.tier && (
              <button
                onClick={() => { onSetTier(model.id, 'T0'); setMenuOpen(false) }}
                style={{ display: 'block', width: '100%', textAlign: 'left', padding: '4px 8px', fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                Clear Tier
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function OllamaConfig({ 
  config, 
  providerId 
}: { 
  config: NodeShellState['providers'][string]
  providerId: string 
}) {
  const { 
    setProviderBaseUrl, 
    setProviderStatus,
    setModelTier 
  } = useNodeShellStore.getState()
  const [newModelName, setNewModelName] = useState('')
  const [newModelCapabilities, setNewModelCapabilities] = useState<string[]>([])

  const handlePing = () => {
    setProviderStatus(providerId, 'healthy')
  }

  const handleAutoDetect = () => {
    console.log('Auto-detecting models from Ollama...')
  }

  const handleAddModel = () => {
    if (!newModelName.trim()) return
    console.log('Adding model:', newModelName, newModelCapabilities)
    setNewModelName('')
    setNewModelCapabilities([])
  }

  const capabilityTags = ['code', 'reasoning', 'vision', 'speed', 'long-ctx', 'cost-efficient']

  return (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={styles.label}>Endpoint URL</label>
          <input
            type="text"
            value={config.baseUrl}
            placeholder="http://localhost:11434"
            style={styles.input}
            onChange={(e) => setProviderBaseUrl(providerId, e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>Health Status</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handlePing}
                style={{ padding: '6px 12px', fontSize: 10, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
              >
                Ping
              </button>
              <span style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 10 }}>
                {config.status === 'healthy' ? '✓ Connected' : '○ Disconnected'}
              </span>
            </div>
          </div>
          <button
            onClick={handleAutoDetect}
            style={{ padding: '6px 12px', fontSize: 10, background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 500 }}
          >
            Auto-detect Models
          </button>
        </div>

        <div>
          <label style={styles.label}>Manual Model Entry</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder="Model name (e.g., llama3:8b)"
              style={{ ...styles.input, flex: 1 }}
            />
            <button onClick={handleAddModel} style={{ padding: '6px 12px', fontSize: 10, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>
              Add
            </button>
          </div>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
            {capabilityTags.map(cap => (
              <button
                key={cap}
                onClick={() => setNewModelCapabilities(prev => 
                  prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]
                )}
                style={{
                  padding: '4px 8px',
                  fontSize: 9,
                  background: newModelCapabilities.includes(cap) ? 'var(--accent)' : 'var(--bg-surface)',
                  color: newModelCapabilities.includes(cap) ? 'white' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 2,
                  cursor: 'pointer',
                }}
              >
                {CAPABILITY_LABELS[cap] || cap}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={styles.label}>Local Models</label>
          <div style={{ maxHeight: 128, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {config.models.length === 0 ? (
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>No local models configured</div>
            ) : (
              config.models.map((model: any) => (
                <ModelRow 
                  key={model.id} 
                  model={model} 
                  onSetTier={(modelId, tier) => setModelTier(providerId, modelId, tier)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProviderConfig({ 
  config, 
  providerId 
}: { 
  config: NodeShellState['providers'][string]
  providerId: string 
}) {
  const { 
    setProviderApiKey, 
    setProviderBaseUrl, 
    setProviderTimeout, 
    setProviderStatus,
    setModelTier 
  } = useNodeShellStore.getState()
  const [editKey, setEditKey] = useState('')
  const [showKeyInput, setShowKeyInput] = useState(false)

  const handleTestConnection = () => {
    setProviderStatus(providerId, 'healthy')
  }

  const handleSaveKey = () => {
    if (editKey.trim()) {
      vaultSave(providerId as ProviderId, editKey)
      setProviderApiKey(providerId, editKey)
      setEditKey('')
      setShowKeyInput(false)
    }
  }

  const handleEditKey = () => {
    setShowKeyInput(true)
  }

  const isOllama = providerId === 'ollama'
  const hasKey = vaultHas(providerId as ProviderId)

  return isOllama ? (
    <OllamaConfig config={config} providerId={providerId} />
  ) : (
    <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <label style={styles.label}>API Key (Credential Vault)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="password"
              value={showKeyInput ? editKey : vaultGet(providerId as ProviderId)}
              placeholder={hasKey ? '••••••••' : 'Enter API key'}
              style={styles.input}
              onChange={(e) => setEditKey(e.target.value)}
              readOnly={!showKeyInput}
            />
            <div style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: 4 }}>
              {showKeyInput ? (
                <>
                  <button 
                    onClick={handleSaveKey}
                    style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Save
                  </button>
                  <button 
                    onClick={() => { setShowKeyInput(false); setEditKey('') }}
                    style={{ fontSize: 10, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <button 
                    onClick={handleEditKey}
                    style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                  <span style={{ color: 'var(--text-muted)' }}>|</span>
                  <button 
                    onClick={handleTestConnection}
                    style={{ fontSize: 10, color: 'var(--text-secondary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Test
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <label style={styles.label}>Base URL Override</label>
          <input
            type="text"
            value={config.baseUrl}
            placeholder="https://api.example.com/v1"
            style={styles.input}
            onChange={(e) => setProviderBaseUrl(providerId, e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div>
            <label style={styles.label}>Timeout (ms)</label>
            <input
              type="number"
              value={config.timeout}
              style={styles.input}
              onChange={(e) => setProviderTimeout(providerId, parseInt(e.target.value))}
            />
          </div>
          <div>
            <label style={styles.label}>Rate Limit</label>
            <input
              type="text"
              placeholder="100/min"
              style={{ ...styles.input, color: 'var(--text-muted)' }}
              readOnly
            />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Models</div>
        <div style={{ maxHeight: 192, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {config.models.map((model: any) => (
            <ModelRow 
              key={model.id} 
              model={model} 
              onSetTier={(modelId, tier) => setModelTier(providerId, modelId, tier)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProviderRow({ 
  providerId, 
  config 
}: { 
  providerId: string
  config: NodeShellState['providers'][string] 
}) {
  const { toggleProvider, removeProvider } = useNodeShellStore.getState()
  const [showConfirm, setShowConfirm] = useState(false)
  const modelCount = config.models.length

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(true)
  }

  const confirmRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    removeProvider(providerId)
    setShowConfirm(false)
  }

  const cancelRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowConfirm(false)
  }

  return (
    <>
      <div style={{ borderBottom: '1px solid var(--border)' }}>
        <div 
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, cursor: 'pointer', background: 'var(--bg-node)', transition: 'background 0.15s' }}
          onClick={() => toggleProvider(providerId)}
        >
          <StatusRing status={config.status} size={16} />
          <ProviderLogo providerId={providerId} />
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{config.name}</span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{modelCount} models</span>
          <button
            onClick={handleRemove}
            style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 12 }}
            title="Remove provider"
          >
            🗑️
          </button>
          <span style={{ transition: 'transform 0.2s', transform: config.expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
        </div>
        
        {config.expanded && (
          <ProviderConfig config={config} providerId={providerId} />
        )}
      </div>

      {showConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 16, maxWidth: 320 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Remove Provider?</div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12 }}>This will permanently remove {config.name} and all its models. This action cannot be undone.</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={cancelRemove} style={{ padding: '6px 12px', fontSize: 11, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmRemove} style={{ padding: '6px 12px', fontSize: 11, background: '#ef4444', border: 'none', borderRadius: 4, color: 'white', cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ProvidersTab() {
  const { providers, activeTab } = useNodeShellStore.getState()
  const [showAddModal, setShowAddModal] = useState(false)
  
  if (activeTab !== 'providers') return null

  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Providers</span>
          <button 
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: 10, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
          >
            + Add
          </button>
        </div>
        <div>
          {Object.entries(providers).map(([id, config]) => (
            <ProviderRow key={id} providerId={id as ProviderId} config={config} />
          ))}
        </div>
      </div>
      {showAddModal && <AddProviderModal onClose={() => setShowAddModal(false)} />}
    </>
  )
}

function DashboardTab() {
  const { activeTab, providers } = useNodeShellStore.getState()
  
  if (activeTab !== 'dashboard') return null

  const totalModels = Object.values(providers).reduce((sum, p) => sum + p.models.length, 0)
  const healthyProviders = Object.values(providers).filter(p => p.status === 'healthy').length
  const degradedProviders = Object.values(providers).filter(p => p.status === 'degraded').length

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Dashboard</span>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 4, padding: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>{totalModels}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Models</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 4, padding: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#22c55e' }}>{healthyProviders}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Healthy</div>
        </div>
        <div style={{ background: 'var(--bg-surface)', borderRadius: 4, padding: 8, textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f59e0b' }}>{degradedProviders}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Degraded</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Active Tiers</span>
        {Object.entries(providers).flatMap(([pid, p]) => 
          p.models.filter(m => m.tier).map(m => (
            <div key={`${pid}-${m.id}`} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
              <span>{m.name}</span>
              <span style={{ color: 'var(--accent)' }}>{m.tier}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function DeprecationsTab() {
  const { activeTab, deprecations } = useNodeShellStore.getState()
  
  if (activeTab !== 'deprecations') return null

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Deprecated Models</span>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {deprecations.length === 0 ? (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>No deprecated models</div>
        ) : (
          deprecations.map((dep, i) => (
            <div key={i} style={{ background: 'var(--bg-surface)', borderRadius: 4, padding: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{dep.modelName}</span>
                <span style={{ fontSize: 9, color: '#ef4444', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 6px', borderRadius: 2 }}>Deprecated</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 10 }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Provider:</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{dep.providerId}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Deprecation:</span>
                  <span style={{ color: 'var(--text-secondary)', marginLeft: 4 }}>{dep.deprecationDate}</span>
                </div>
              </div>
              {dep.replacementModelName && (
                <div style={{ marginTop: 6, fontSize: 10 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Recommended:</span>
                  <span style={{ color: 'var(--accent)', marginLeft: 4 }}>{dep.replacementModelName}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function FallbackTab() {
  const { activeTab, providers, fallbackChains, setFallbackChain } = useNodeShellStore.getState()
  
  if (activeTab !== 'fallback') return null

  return (
    <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fallback Chains</span>
      
      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: -8 }}>
        Configure fallback routing when a tier fails. If the primary model fails, the system will attempt the fallback chain.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {fallbackChains.map(chain => {
          return (
            <div key={chain.tier} style={{ background: 'var(--bg-surface)', borderRadius: 4, padding: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>{TIER_LABELS[chain.tier]}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>Fallback</span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <label style={styles.label}>Provider</label>
                  <select
                    value={chain.fallbackProvider || ''}
                    onChange={(e) => setFallbackChain(chain.tier, e.target.value as ProviderId || null, null)}
                    style={{ ...styles.input, appearance: 'none' }}
                  >
                    <option value="">None</option>
                    {Object.entries(providers).map(([id, p]) => (
                      <option key={id} value={id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={styles.label}>Model</label>
                  <select
                    value={chain.fallbackModelId || ''}
                    onChange={(e) => setFallbackChain(chain.tier, chain.fallbackProvider, e.target.value || null)}
                    disabled={!chain.fallbackProvider}
                    style={{ ...styles.input, appearance: 'none', opacity: !chain.fallbackProvider ? 0.5 : 1 }}
                  >
                    <option value="">None</option>
                    {chain.fallbackProvider && providers[chain.fallbackProvider]?.models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      style={styles.tab(active)}
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function TabContent() {
  const { activeTab } = useNodeShellStore.getState()
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 4, padding: 8, borderBottom: '1px solid var(--border)' }}>
        <Tab label="Providers" active={activeTab === 'providers'} onClick={() => useNodeShellStore.setState({ activeTab: 'providers' })} />
        <Tab label="Dashboard" active={activeTab === 'dashboard'} onClick={() => useNodeShellStore.setState({ activeTab: 'dashboard' })} />
        <Tab label="Deprecations" active={activeTab === 'deprecations'} onClick={() => useNodeShellStore.setState({ activeTab: 'deprecations' })} />
        <Tab label="Fallback" active={activeTab === 'fallback'} onClick={() => useNodeShellStore.setState({ activeTab: 'fallback' })} />
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <ProvidersTab />
        <DashboardTab />
        <DeprecationsTab />
        <FallbackTab />
      </div>
    </div>
  )
}

function NodeShellCollapsed({ 
  providerCount, 
  modelCount, 
  status 
}: { 
  providerCount: number
  modelCount: number
  status: 'healthy' | 'degraded' | 'error' | 'unknown'
}) {
  return (
    <div 
      style={{
        width: 200,
        minHeight: 56,
        background: 'var(--bg-node)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        cursor: 'pointer',
        userSelect: 'none',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
      }}
    >
      <div style={{ position: 'relative' }}>
        <div 
          style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'var(--bg-surface)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>NS</span>
        </div>
        <div style={{ position: 'absolute', top: -4, right: -4 }}>
          <StatusRing status={status} size={14} />
        </div>
      </div>
      
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>Node Shell</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          {[...Array(Math.min(providerCount, 4))].map((_, i) => (
            <div 
              key={i} 
              style={{
                width: 16, height: 16, borderRadius: 4,
                background: 'var(--bg-surface)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 8,
              }}
              title={`Provider ${i + 1}`}
            >
              {['🤖', '🟣', '🔍'][i % 3]}
            </div>
          ))}
          {providerCount > 4 && (
            <div style={{
              width: 16, height: 16, borderRadius: 4,
              background: 'var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: 'var(--text-muted)',
            }}>
              +{providerCount - 4}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{modelCount}</span>
        <span style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 500 }}>Go</span>
      </div>
    </div>
  )
}

function NodeShellExpanded() {
  const { providers, activeTab, setExpanded, expanded: isExpanded } = useNodeShellStore.getState()
  
  const providerCount = Object.keys(providers).length
  const modelCount = Object.values(providers).reduce((sum, p) => sum + p.models.length, 0)
  
  const statuses = Object.values(providers).map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : 
                        statuses.includes('degraded') ? 'degraded' : 
                        statuses.every(s => s === 'healthy') ? 'healthy' : 'unknown'

  const handleClick = () => {
    setExpanded(!isExpanded)
  }

  return (
    <div 
      style={{
        width: 320,
        background: 'var(--bg-node)',
        border: '1px solid var(--accent)',
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
        boxShadow: '0 0 0 1px var(--accent)44, 0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div 
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 10, borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
        onClick={handleClick}
      >
        <div style={{ position: 'relative' }}>
          <div 
            style={{
              width: 32, height: 32, borderRadius: 6,
              background: 'var(--bg-surface)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>NS</span>
          </div>
          <div style={{ position: 'absolute', top: -4, right: -4 }}>
            <StatusRing status={overallStatus} size={16} />
          </div>
        </div>
        
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Node Shell</div>
          <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>
            {providerCount} providers • {modelCount} models
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', background: 'var(--bg-surface)', borderRadius: 4 }}>
            {activeTab === 'providers' && 'Providers'}
            {activeTab === 'dashboard' && 'Dashboard'}
            {activeTab === 'deprecations' && 'Deprecations'}
            {activeTab === 'fallback' && 'Fallback'}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>▼</span>
        </div>
      </div>

      <TabContent />

      <div style={{ padding: 8, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>Output: Orchestrator</span>
        <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      </div>
    </div>
  )
}

function NodeShell({ id: _id, data: _data, selected: _selected }: NodeProps<any>) {
  const { expanded, setExpanded } = useNodeShellStore.getState()

  const handleClick = () => {
    setExpanded(!expanded)
  }

  const providerCount = Object.keys(useNodeShellStore.getState().providers).length
  const modelCount = Object.values(useNodeShellStore.getState().providers)
    .reduce((sum, p) => sum + p.models.length, 0)

  const statuses = Object.values(useNodeShellStore.getState().providers).map(p => p.status)
  const overallStatus = statuses.includes('error') ? 'error' : 
                        statuses.includes('degraded') ? 'degraded' : 
                        statuses.every(s => s === 'healthy') ? 'healthy' : 'unknown'

  return (
    <div
      style={{ cursor: 'pointer', transition: 'all 0.2s' }}
      onClick={handleClick}
    >
      {expanded ? <NodeShellExpanded /> : <NodeShellCollapsed 
        providerCount={providerCount} 
        modelCount={modelCount} 
        status={overallStatus} 
      />}
    </div>
  )
}

export default memo(NodeShell)