import { create } from 'zustand'
import { ProviderId, ProviderModel, PROVIDER_REGISTRY } from '../data/providers'
import { discoverProviderModels, mergeDiscoveredModels } from '../services/model-discovery'

export interface PlacedProvider {
  id: string                        // unique canvas node ID e.g. 'provider-openai'
  providerId: ProviderId
  baseUrl: string
  timeout: number
  temperature: number
  status: 'healthy' | 'degraded' | 'error' | 'unknown'
  models: ProviderModel[]           // copy of registry models, user can toggle enabled
  placedAt: number
}

interface ModelStore {
  // Model node
  modelExpanded: boolean
  setModelExpanded: (v: boolean) => void

  // Placed providers (keyed by canvas node id)
  providers: Record<string, PlacedProvider>
  placeProvider: (providerId: ProviderId) => PlacedProvider
  removeProvider: (nodeId: string) => void
  isPlaced: (providerId: ProviderId) => boolean

  // Provider config
  setBaseUrl: (nodeId: string, url: string) => void
  setTimeouth: (nodeId: string, timeout: number) => void
  setTemperature: (nodeId: string, temp: number) => void
  setStatus: (nodeId: string, status: PlacedProvider['status']) => void

  // Model enable/disable
  toggleModel: (nodeId: string, modelId: string) => void

  // Model discovery
  syncModels: (nodeId: string) => Promise<{ hasNew: boolean; hasNewDeprecated: boolean }>
  syncStatus: Record<string, 'idle' | 'syncing' | 'error'>
  syncError: Record<string, string>

  // Notification flags (aggregated across all providers)
  hasNewDiscoveries: boolean
  hasNewDeprecations: boolean
  clearNotifications: () => void

  // Dashboard tab in Model node
  activeTab: 'overview' | 'deprecations'
  setActiveTab: (tab: 'overview' | 'deprecations') => void
}

export const useModelStore = create<ModelStore>((set, get) => ({
  modelExpanded: false,
  setModelExpanded: (modelExpanded) => set({ modelExpanded }),

  providers: {},
  syncStatus: {},
  syncError: {},
  hasNewDiscoveries: false,
  hasNewDeprecations: false,

  placeProvider: (providerId) => {
    const def = PROVIDER_REGISTRY[providerId]
    const nodeId = `provider-${providerId}`
    const placed: PlacedProvider = {
      id: nodeId,
      providerId,
      baseUrl: def.defaultBaseUrl,
      timeout: providerId === 'ollama' ? 10000 : 30000,
      temperature: 0.7,
      status: 'unknown',
      models: def.models.map(m => ({ ...m })),
      placedAt: Date.now(),
    }
    set(s => ({ providers: { ...s.providers, [nodeId]: placed } }))
    // Auto-trigger discovery on placement
    setTimeout(() => get().syncModels(nodeId), 500)
    return placed
  },

  removeProvider: (nodeId) => set(s => {
    const next = { ...s.providers }
    delete next[nodeId]
    const syncStatus = { ...s.syncStatus }
    delete syncStatus[nodeId]
    const syncError = { ...s.syncError }
    delete syncError[nodeId]
    return { providers: next, syncStatus, syncError }
  }),

  isPlaced: (providerId) =>
    Object.values(get().providers).some(p => p.providerId === providerId),

  setBaseUrl: (nodeId, baseUrl) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], baseUrl } }
  })),
  setTimeouth: (nodeId, timeout) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], timeout } }
  })),
  setTemperature: (nodeId, temperature) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], temperature } }
  })),
  setStatus: (nodeId, status) => set(s => ({
    providers: { ...s.providers, [nodeId]: { ...s.providers[nodeId], status } }
  })),

  toggleModel: (nodeId, modelId) => set(s => {
    const provider = s.providers[nodeId]
    if (!provider) return s
    return {
      providers: {
        ...s.providers,
        [nodeId]: {
          ...provider,
          models: provider.models.map(m =>
            m.id === modelId ? { ...m, enabled: !m.enabled } : m
          ),
        },
      },
    }
  }),

  syncModels: async (nodeId) => {
    const provider = get().providers[nodeId]
    if (!provider || provider.providerId === 'ollama' || provider.providerId === 'custom') {
      // Ollama and custom use local auto-detect, not this flow
      return { hasNew: false, hasNewDeprecated: false }
    }

    set(s => ({
      syncStatus: { ...s.syncStatus, [nodeId]: 'syncing' },
      syncError: { ...s.syncError, [nodeId]: '' },
    }))

    try {
      const fresh = await discoverProviderModels(provider.providerId, provider.baseUrl)
      const { merged, hasNew, hasNewDeprecated } = mergeDiscoveredModels(provider.models, fresh)

      set(s => ({
        providers: {
          ...s.providers,
          [nodeId]: {
            ...s.providers[nodeId],
            models: merged,
            status: 'healthy' as const,
          },
        },
        syncStatus: { ...s.syncStatus, [nodeId]: 'idle' },
        hasNewDiscoveries: s.hasNewDiscoveries || hasNew,
        hasNewDeprecations: s.hasNewDeprecations || hasNewDeprecated,
      }))

      return { hasNew, hasNewDeprecated }
    } catch (err: any) {
      set(s => ({
        syncStatus: { ...s.syncStatus, [nodeId]: 'error' },
        syncError: { ...s.syncError, [nodeId]: err.message },
      }))
      return { hasNew: false, hasNewDeprecated: false }
    }
  },

  clearNotifications: () => set({
    hasNewDiscoveries: false,
    hasNewDeprecations: false,
  }),

  activeTab: 'overview',
  setActiveTab: (activeTab) => set({ activeTab }),
}))