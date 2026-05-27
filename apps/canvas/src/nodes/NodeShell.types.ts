export type ProviderId = 'openai' | 'anthropic' | 'google' | 'mistral' | 'cohere' | 'together' | 'groq' | 'ollama' | 'custom' | 'custom-endpoint'

export type CustomProviderName = string & { readonly __brand: unique symbol }

export const PREDEFINED_PROVIDERS: ProviderId[] = ['openai', 'anthropic', 'google', 'mistral', 'cohere', 'together', 'groq', 'ollama']

export type ModelCapability = 'code' | 'reasoning' | 'vision' | 'speed' | 'long-ctx' | 'cost-efficient'

export interface Model {
  id: string
  name: string
  contextWindow: number
  costPer1k: { input: number; output: number }
  capabilities: ModelCapability[]
  tier: 'T0' | 'T1' | 'T2' | 'T3' | null
}

export interface ProviderRegistryItem {
  id: ProviderId
  name: string
  description: string
  icon: string
  defaultBaseUrl: string
  models: Model[]
}

export interface DeprecatedModel {
  modelId: string
  providerId: ProviderId
  modelName: string
  deprecationDate: string
  replacementModelId: string | null
  replacementModelName: string | null
}

export interface FallbackChain {
  tier: 'T0' | 'T1' | 'T2' | 'T3'
  fallbackProvider: ProviderId | null
  fallbackModelId: string | null
}

export interface ProviderConfig {
  id: ProviderId
  name: string
  apiKey: string
  baseUrl: string
  timeout: number
  models: Model[]
  status: 'healthy' | 'degraded' | 'error' | 'unknown'
  expanded: boolean
}

export interface NodeShellState {
  providers: Record<string, ProviderConfig>
  activeTab: 'providers' | 'dashboard' | 'deprecations' | 'fallback'
  expanded: boolean
  deprecations: DeprecatedModel[]
  fallbackChains: FallbackChain[]
  setExpanded: (expanded: boolean) => void
  setActiveTab: (tab: 'providers' | 'dashboard' | 'deprecations' | 'fallback') => void
  toggleProvider: (providerId: string) => void
  setProviderApiKey: (providerId: string, apiKey: string) => void
  setProviderBaseUrl: (providerId: string, baseUrl: string) => void
  setProviderTimeout: (providerId: string, timeout: number) => void
  setProviderStatus: (providerId: string, status: 'healthy' | 'degraded' | 'error' | 'unknown') => void
  setModelTier: (providerId: string, modelId: string, tier: 'T0' | 'T1' | 'T2' | 'T3') => void
  addProvider: (providerId: ProviderId, customName?: string) => void
  removeProvider: (providerId: string) => void
  addCustomProvider: (name: string, baseUrl: string) => void
  setFallbackChain: (tier: 'T0' | 'T1' | 'T2' | 'T3', providerId: string | null, modelId: string | null) => void
}