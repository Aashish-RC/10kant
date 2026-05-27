import { memo, useState } from 'react'
import { useNodeShellStore } from './NodeShell.store'
import { ProviderId, PREDEFINED_PROVIDERS } from './NodeShell.types'

const PROVIDER_REGISTRY: Record<ProviderId, { name: string; description: string; icon: string; defaultBaseUrl: string }> = {
  openai: { name: 'OpenAI', description: 'GPT models for chat, reasoning, and coding', icon: '🤖', defaultBaseUrl: 'https://api.openai.com/v1' },
  anthropic: { name: 'Anthropic', description: 'Claude models for reasoning and safety', icon: '🟣', defaultBaseUrl: 'https://api.anthropic.com' },
  google: { name: 'Google', description: 'Gemini models for multimodal tasks', icon: '🔍', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1' },
  mistral: { name: 'Mistral', description: 'European AI models for efficiency', icon: '🔥', defaultBaseUrl: 'https://api.mistral.ai/v1' },
  cohere: { name: 'Cohere', description: 'Enterprise-grade language models', icon: '💠', defaultBaseUrl: 'https://api.cohere.ai' },
  together: { name: 'Together', description: 'Open-source model inference', icon: '🔗', defaultBaseUrl: 'https://api.together.xyz/v1' },
  groq: { name: 'Groq', description: 'Fast inference for LLMs', icon: '⚡', defaultBaseUrl: 'https://api.groq.com/openai/v1' },
  ollama: { name: 'Ollama', description: 'Run models locally', icon: '🐙', defaultBaseUrl: 'http://localhost:11434' },
  custom: { name: 'Custom', description: 'Bring your own endpoint', icon: '⚙️', defaultBaseUrl: '' },
  'custom-endpoint': { name: 'Custom Endpoint', description: 'Bring your own endpoint', icon: '⚙️', defaultBaseUrl: '' },
}

function ProviderRegistryItem({ 
  providerId, 
  onSelect,
  disabled 
}: { 
  providerId: ProviderId
  onSelect: () => void
  disabled: boolean
}) {
  const info = PROVIDER_REGISTRY[providerId]
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 10,
        background: 'var(--bg-node)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        cursor: disabled ? 'not-allowed' : 'pointer',
        width: '100%',
        textAlign: 'left',
        transition: 'all 0.15s',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        background: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
      }}>{info.icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>{info.name}</div>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{info.description}</div>
      </div>
      {disabled && (
        <span style={{ fontSize: 9, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '2px 6px', borderRadius: 2 }}>Added</span>
      )}
    </button>
  )
}

function AddProviderModal({ onClose }: { onClose: () => void }) {
  const { addProvider, addCustomProvider, providers } = useNodeShellStore.getState()
  const [search, setSearch] = useState('')
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customUrl, setCustomUrl] = useState('')

  const existingProviders = Object.keys(providers)

  const handleAddPredefined = (providerId: ProviderId) => {
    addProvider(providerId)
    onClose()
  }

  const handleAddCustom = () => {
    if (!customName.trim() || !customUrl.trim()) return
    addCustomProvider(customName.trim(), customUrl.trim())
    setCustomName('')
    setCustomUrl('')
    setShowCustomForm(false)
    onClose()
  }

  const filteredProviders = PREDEFINED_PROVIDERS.filter(id => 
    !existingProviders.includes(id)
  )

  if (showCustomForm) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}>
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 20,
          width: 380,
          maxWidth: '90vw',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12 }}>Add Custom Provider</div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Provider Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., My Custom API"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 11,
              }}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6 }}>Base URL</label>
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'var(--bg-base)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--text-primary)',
                  fontSize: 11,
              }}
              />
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            <button
              onClick={() => setShowCustomForm(false)}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                color: 'var(--text-secondary)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleAddCustom}
              disabled={!customName.trim() || !customUrl.trim()}
              style={{
                padding: '6px 12px',
                fontSize: 11,
                color: 'white',
                background: 'var(--accent)',
                border: 'none',
                borderRadius: 4,
                cursor: !customName.trim() || !customUrl.trim() ? 'not-allowed' : 'pointer',
                opacity: !customName.trim() || !customUrl.trim() ? 0.5 : 1,
              }}
            >
              Add Provider
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 20,
        width: 400,
        maxWidth: '90vw',
        maxHeight: '80vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Add Provider</div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search providers..."
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: 'var(--text-primary)',
              fontSize: 11,
            }}
          />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {filteredProviders.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>
                All providers are already added
              </div>
            ) : (
              filteredProviders.map(id => (
                <ProviderRegistryItem
                  key={id}
                  providerId={id}
                  onSelect={() => handleAddPredefined(id)}
                  disabled={false}
                />
              ))
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
          <button
            onClick={() => setShowCustomForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'var(--bg-base)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>⚙️</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-primary)' }}>Custom Endpoint</div>
              <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Add a provider with a custom API endpoint</div>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export default memo(AddProviderModal)