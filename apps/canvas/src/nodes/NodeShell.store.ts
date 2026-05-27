import { create } from 'zustand'
import { NodeShellState, ProviderId, ProviderConfig, Model } from './NodeShell.types'

const PROVIDER_CONFIGS: Record<ProviderId, Omit<ProviderConfig, 'id' | 'apiKey' | 'expanded'>> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    timeout: 30000,
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, costPer1k: { input: 0.005, output: 0.015 }, capabilities: ['speed', 'code'], tier: null },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, costPer1k: { input: 0.00015, output: 0.0006 }, capabilities: ['speed', 'cost-efficient'], tier: null },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, costPer1k: { input: 0.01, output: 0.03 }, capabilities: ['reasoning', 'vision'], tier: null },
    ],
    status: 'unknown',
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com',
    timeout: 30000,
    models: [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000, costPer1k: { input: 0.003, output: 0.015 }, capabilities: ['reasoning', 'code'], tier: null },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', contextWindow: 200000, costPer1k: { input: 0.00025, output: 0.00125 }, capabilities: ['speed', 'cost-efficient'], tier: null },
    ],
    status: 'unknown',
  },
  google: {
    name: 'Google',
    baseUrl: 'https://generativelanguage.googleapis.com/v1',
    timeout: 30000,
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000, costPer1k: { input: 0.0000001, output: 0.0000002 }, capabilities: ['vision', 'speed'], tier: null },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextWindow: 1000000, costPer1k: { input: 0.00125, output: 0.005 }, capabilities: ['reasoning', 'long-ctx'], tier: null },
    ],
    status: 'unknown',
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    timeout: 30000,
    models: [
      { id: 'mistral-large-2', name: 'Mistral Large 2', contextWindow: 128000, costPer1k: { input: 0.002, output: 0.006 }, capabilities: ['reasoning', 'code'], tier: null },
      { id: 'codestral', name: 'Codestral', contextWindow: 24000, costPer1k: { input: 0.001, output: 0.002 }, capabilities: ['code', 'speed'], tier: null },
    ],
    status: 'unknown',
  },
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai',
    timeout: 30000,
    models: [
      { id: 'command-r-plus', name: 'Command R+', contextWindow: 128000, costPer1k: { input: 0.002, output: 0.006 }, capabilities: ['reasoning', 'code'], tier: null },
      { id: 'command-r', name: 'Command R', contextWindow: 128000, costPer1k: { input: 0.0005, output: 0.0015 }, capabilities: ['speed', 'cost-efficient'], tier: null },
    ],
    status: 'unknown',
  },
  together: {
    name: 'Together',
    baseUrl: 'https://api.together.xyz/v1',
    timeout: 30000,
    models: [
      { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', name: 'Llama 3.1 70B', contextWindow: 128000, costPer1k: { input: 0.001, output: 0.002 }, capabilities: ['code', 'speed'], tier: null },
    ],
    status: 'unknown',
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    timeout: 30000,
    models: [
      { id: 'llama-3-70b-8192', name: 'Llama 3 70B', contextWindow: 8192, costPer1k: { input: 0.00059, output: 0.00099 }, capabilities: ['speed', 'code'], tier: null },
      { id: 'gemma-2-9b-it', name: 'Gemma 2 9B', contextWindow: 8192, costPer1k: { input: 0.00014, output: 0.00028 }, capabilities: ['speed', 'cost-efficient'], tier: null },
    ],
    status: 'unknown',
  },
  ollama: {
    name: 'Ollama (Local)',
    baseUrl: 'http://localhost:11434',
    timeout: 10000,
    models: [],
    status: 'unknown',
  },
  custom: {
    name: 'Custom Endpoint',
    baseUrl: '',
    timeout: 30000,
    models: [],
    status: 'unknown',
  },
  'custom-endpoint': {
    name: 'Custom Endpoint',
    baseUrl: '',
    timeout: 30000,
    models: [],
    status: 'unknown',
  },
}

function createDefaultProviderConfig(id: ProviderId): ProviderConfig {
  const config = PROVIDER_CONFIGS[id]
  return {
    id,
    name: config.name,
    apiKey: '',
    baseUrl: config.baseUrl,
    timeout: config.timeout,
    models: config.models.map(m => ({ ...m })),
    status: config.status,
    expanded: false,
  }
}

export const useNodeShellStore = create<NodeShellState>((set) => ({
  providers: {},
  activeTab: 'providers',
  expanded: false,
  deprecations: [
    { modelId: 'gpt-3.5-turbo', providerId: 'openai', modelName: 'GPT-3.5 Turbo', deprecationDate: '2025-12-31', replacementModelId: 'gpt-4o-mini', replacementModelName: 'GPT-4o Mini' },
    { modelId: 'claude-2.1', providerId: 'anthropic', modelName: 'Claude 2.1', deprecationDate: '2025-10-31', replacementModelId: 'claude-3-5-sonnet-20241022', replacementModelName: 'Claude 3.5 Sonnet' },
  ],
  fallbackChains: [
    { tier: 'T0', fallbackProvider: null, fallbackModelId: null },
    { tier: 'T1', fallbackProvider: null, fallbackModelId: null },
    { tier: 'T2', fallbackProvider: null, fallbackModelId: null },
    { tier: 'T3', fallbackProvider: null, fallbackModelId: null },
  ],

  setExpanded: (expanded: boolean) => set({ expanded }),
  setActiveTab: (activeTab: 'providers' | 'dashboard' | 'deprecations' | 'fallback') => set({ activeTab }),
  toggleProvider: (providerId: string) => set((state) => ({
    providers: {
      ...state.providers,
      [providerId]: {
        ...state.providers[providerId],
        expanded: !state.providers[providerId].expanded,
      },
    },
  })),
  setProviderApiKey: (providerId: string, apiKey: string) => set((state) => ({
    providers: {
      ...state.providers,
      [providerId]: {
        ...state.providers[providerId],
        apiKey,
      },
    },
  })),
  setProviderBaseUrl: (providerId: string, baseUrl: string) => set((state) => ({
    providers: {
      ...state.providers,
      [providerId]: {
        ...state.providers[providerId],
        baseUrl,
      },
    },
  })),
  setProviderTimeout: (providerId: string, timeout: number) => set((state) => ({
    providers: {
      ...state.providers,
      [providerId]: {
        ...state.providers[providerId],
        timeout,
      },
    },
  })),
  setProviderStatus: (providerId: string, status: 'healthy' | 'degraded' | 'error' | 'unknown') => set((state) => ({
    providers: {
      ...state.providers,
      [providerId]: {
        ...state.providers[providerId],
        status,
      },
    },
  })),
  setModelTier: (providerId: string, modelId: string, tier: 'T0' | 'T1' | 'T2' | 'T3') => set((state) => {
    const provider = state.providers[providerId]
    return {
      providers: {
        ...state.providers,
        [providerId]: {
          ...provider,
          models: provider.models.map((m: Model) =>
            m.id === modelId ? { ...m, tier } : m
          ),
        },
      },
    }
  }),
  addProvider: (providerId: ProviderId) => set((state) => ({
    providers: {
      ...state.providers,
      [providerId]: createDefaultProviderConfig(providerId),
    },
  })),
  removeProvider: (providerId: string) => set((state) => {
    const providers = { ...state.providers }
    delete providers[providerId]
    return { providers }
  }),
  addCustomProvider: (name: string, baseUrl: string) => set((state) => {
    const customId = `custom-${Date.now()}`
    return {
      providers: {
        ...state.providers,
        [customId]: {
          id: customId as ProviderId,
          name: name || 'Custom Endpoint',
          apiKey: '',
          baseUrl: baseUrl || '',
          timeout: 30000,
          models: [],
          status: 'unknown',
          expanded: true,
        },
      },
    }
  }),
  setFallbackChain: (tier, fallbackProvider, fallbackModelId) => set((state) => ({
    fallbackChains: state.fallbackChains.map(chain =>
      chain.tier === tier
        ? { ...chain, fallbackProvider: fallbackProvider as ProviderId | null, fallbackModelId }
        : chain
    ),
  })),
}))