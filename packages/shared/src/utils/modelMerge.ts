/**
 * Shared model merge utility used by both the API sync job and frontend.
 *
 * Rules:
 * - Models that exist in both: keep existing metadata + enabled state
 * - New models (not in our list): add with enabled=false, mark newlyDiscovered
 * - Models no longer in provider's list: mark deprecated, disable
 * - Models already deprecated: stay deprecated
 */
export interface ModelEntry {
  id: string
  name: string
  contextWindow?: number
  costPer1k?: { input: number; output: number }
  capabilities?: string[]
  enabled?: boolean
  deprecated?: boolean
  deprecatedAt?: string
  successor?: string
  newlyDiscovered?: boolean
  discoveredAt?: number
}

export function mergeDiscoveredModels<T extends ModelEntry>(
  existing: T[],
  fresh: Array<{ id: string; name: string }>,
): { merged: T[]; hasNew: boolean; hasNewDeprecated: boolean } {
  const existingMap = new Map(existing.map(m => [m.id, m] as const))

  let hasNew = false
  let hasNewDeprecated = false

  const merged: T[] = []

  // Process everything from fresh list
  for (const freshModel of fresh) {
    const existingModel = existingMap.get(freshModel.id)
    if (existingModel) {
      // Existed before — carry over enabled state, clear newlyDiscovered
      merged.push({
        ...existingModel,
        name: freshModel.name || existingModel.name,
        newlyDiscovered: false,
        // If it was deprecated but is back, un-deprecate it
        deprecated: false,
        deprecatedAt: undefined,
        successor: undefined,
      } as T)
      existingMap.delete(freshModel.id)
    } else {
      // Brand new model
      merged.push({
        id: freshModel.id,
        name: freshModel.name,
        contextWindow: 4096,
        costPer1k: { input: 0, output: 0 },
        capabilities: [],
        enabled: false,
        newlyDiscovered: true,
        discoveredAt: Date.now(),
      } as unknown as T)
      hasNew = true
    }
  }

  // What's left in existingMap are models no longer in the provider's list
  for (const [, model] of existingMap) {
    if (!model.deprecated) {
      // Newly deprecated
      merged.push({
        ...model,
        enabled: false,
        deprecated: true,
        deprecatedAt: new Date().toISOString().split('T')[0],
      } as T)
      hasNewDeprecated = true
    } else {
      // Already deprecated — keep as-is
      merged.push(model)
    }
  }

  return { merged, hasNew, hasNewDeprecated }
}