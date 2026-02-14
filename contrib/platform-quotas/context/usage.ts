import type { ExtensionContext } from '@mariozechner/pi-coding-agent';
import { Footer } from '@zenobius/pi-footer';
import { usageTracker } from '../services/PlatformTracker/store.ts';
import type { ResolvedUsageWindow, UsageStoreEntry } from '../services/PlatformTracker/types.ts';

// Mapping from pi model providers to platform-quota strategy IDs.
const PI_PROVIDER_PATTERNS: Array<[RegExp, string]> = [
  [/anthropic/, 'anthropic'],
  [/antigravity/, 'antigravity'],
  [/gemini/, 'gemini'],
  [/google/, 'gemini'],
  [/openai/, 'codex'],
  [/copilot/, 'copilot'],
];

function normalizeProvider(providerId: string): string {
  for (const [pattern, name] of PI_PROVIDER_PATTERNS) {
    if (pattern.test(providerId)) return name;
  }

  return providerId;
}

function getProviderFromModel(ctx: ExtensionContext): string | undefined {
  const modelProvider = ctx.model?.provider?.toLowerCase();
  if (!modelProvider) return undefined;

  return normalizeProvider(modelProvider);
}

function getActiveProvider(ctx: ExtensionContext): string | undefined {
  return getProviderFromModel(ctx);
}

function getProviderEntry(providerId: string): UsageStoreEntry | undefined {
  for (const entry of usageTracker.store.values()) {
    if (entry.providerId === providerId && entry.active) {
      return entry;
    }
  }
  return undefined;
}

function getPrimaryQuota(entry: UsageStoreEntry): ResolvedUsageWindow | undefined {
  return entry.windows[0];
}

function getQuotaHealth(remainingRatio: number): 'good' | 'warning' | 'critical' {
  if (remainingRatio > 0.5) return 'good';
  if (remainingRatio > 0.2) return 'warning';
  return 'critical';
}

function getHealthEmoji(remainingRatio: number): string {
  const health = getQuotaHealth(remainingRatio);
  switch (health) {
    case 'good':
      return '🟢';
    case 'warning':
      return '🟡';
    case 'critical':
      return '🔴';
  }
}

export function registerUsageContextValues(): () => void {
  const disposeFns: Array<() => void> = [];

  disposeFns.push(
    Footer.registerContextValue('usage_emoji', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return '--';

      const entry = getProviderEntry(providerId);
      if (!entry) return '--';

      const quota = getPrimaryQuota(entry);
      if (!quota) return '--';

      return getHealthEmoji(quota.remainingRatio);
    })
  );

  disposeFns.push(
    Footer.registerContextValue('usage_platform', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return '--';

      const provider = usageTracker.providers.get(providerId);
      return provider?.label || providerId;
    })
  );

  disposeFns.push(
    Footer.registerContextValue('usage_quota_remaining', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return undefined;

      const entry = getProviderEntry(providerId);
      if (!entry) return undefined;

      const quota = getPrimaryQuota(entry);
      return quota?.remaining;
    })
  );

  disposeFns.push(
    Footer.registerContextValue('usage_quota_used', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return undefined;

      const entry = getProviderEntry(providerId);
      if (!entry) return undefined;

      const quota = getPrimaryQuota(entry);
      return quota?.used;
    })
  );

  disposeFns.push(
    Footer.registerContextValue('usage_quota_total', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return undefined;

      const entry = getProviderEntry(providerId);
      if (!entry) return undefined;

      const quota = getPrimaryQuota(entry);
      return quota?.duration || quota?.amount;
    })
  );

  disposeFns.push(
    Footer.registerContextValue('usage_quota_percent_remaining', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return undefined;

      const entry = getProviderEntry(providerId);
      if (!entry) return undefined;

      const quota = getPrimaryQuota(entry);
      return quota?.remainingRatio;
    })
  );

  disposeFns.push(
    Footer.registerContextValue('usage_quota_percent_used', (state) => {
      const providerId = getActiveProvider(state.ctx);
      if (!providerId) return undefined;

      const entry = getProviderEntry(providerId);
      if (!entry) return undefined;

      const quota = getPrimaryQuota(entry);
      return quota?.usedRatio;
    })
  );

  return () => {
    for (const dispose of disposeFns) {
      dispose();
    }
  };
}
