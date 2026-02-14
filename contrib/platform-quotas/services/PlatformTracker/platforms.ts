import { usageTracker } from './store.ts';
import type { ProviderStrategy, ResolvedUsageWindow, UsageStoreEntry } from './types.ts';
import { makeStorageKey } from './types.ts';

export function getWindowByProviderModel(
  providerId: string,
  modelId: string,
  windowId: string
): ResolvedUsageWindow | undefined {
  const key = makeStorageKey(providerId, modelId);
  const entry = usageTracker.store.get(key);
  if (!entry?.windows?.length) return undefined;
  return entry.windows.find((window) => window.id === windowId);
}

export function getProviderModels(providerId: string): string[] {
  const models = new Set<string>();
  for (const [key, entry] of usageTracker.store) {
    if (key.startsWith(`${providerId}/`)) {
      models.add(entry.modelId);
    }
  }
  return Array.from(models);
}

export function getProviderEntries(providerId: string): UsageStoreEntry[] {
  const entries: UsageStoreEntry[] = [];
  for (const [key, entry] of usageTracker.store) {
    if (key.startsWith(`${providerId}/`)) {
      entries.push(entry);
    }
  }
  return entries;
}

export function getProviderMetadata<TMeta>(
  provider: ProviderStrategy<TMeta>,
  providerId: string,
  modelId: string
): TMeta | undefined {
  const key = makeStorageKey(providerId, modelId);
  const entry = usageTracker.store.get(key);
  if (!entry) return undefined;
  return provider.getMetadata?.(entry);
}
