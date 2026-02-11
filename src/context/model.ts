import type { AssistantMessage } from '@mariozechner/pi-ai';
import type { ExtensionContext } from '@mariozechner/pi-coding-agent';
import type { PipelineTransform } from '../core/pipeline.ts';
import { Footer } from '../footer.ts';
import type { ContextValueProvider } from '../types.ts';

/* Resolve model context window as a positive finite token count, otherwise null. */
function getContextWindow(ctx: ExtensionContext): number | null {
  const model = ctx.model as { contextWindow?: unknown } | undefined;
  const raw = model?.contextWindow;

  if (typeof raw === 'number' && Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  if (typeof raw === 'string') {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

/* Safely coerce unknown values into a non-negative finite number. */
function asNonNegativeNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

/* Return a normalized non-empty string, or null when unavailable. */
function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;

  const normalized = value.trim();
  if (normalized.length === 0) return null;

  return normalized;
}

/* Find the most recent non-aborted assistant message on the active branch. */
function getLatestAssistantMessage(ctx: ExtensionContext): AssistantMessage | null {
  const branch = ctx.sessionManager.getBranch();

  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];
    if (entry.type !== 'message' || entry.message.role !== 'assistant') continue;

    const assistant = entry.message as AssistantMessage;
    if (assistant.stopReason !== 'aborted') {
      return assistant;
    }
  }

  return null;
}

/* Compute tokens read/written from one assistant usage payload. */
function getReadWriteTokens(assistant: AssistantMessage): { read: number; write: number } {
  const read =
    asNonNegativeNumber(assistant.usage.input) + asNonNegativeNumber(assistant.usage.cacheRead);
  const write =
    asNonNegativeNumber(assistant.usage.output) + asNonNegativeNumber(assistant.usage.cacheWrite);

  return { read, write };
}

/*
 * Compute currently used context tokens.
 * Prefer `ctx.getContextUsage()?.usageTokens` when available, then fall back
 * to latest non-aborted assistant message usage aggregation.
 */
function getUsedTokens(ctx: ExtensionContext): number {
  const usage = ctx.getContextUsage?.() as
    | {
        usageTokens?: unknown;
      }
    | undefined;

  if (typeof usage?.usageTokens === 'number' && Number.isFinite(usage.usageTokens)) {
    return Math.max(0, usage.usageTokens);
  }

  const assistant = getLatestAssistantMessage(ctx);
  if (!assistant) return 0;

  const { read, write } = getReadWriteTokens(assistant);
  return read + write;
}

/* Compute total USD usage cost for the active branch when possible. */
function getSessionCostUsd(ctx: ExtensionContext): number {
  const branch = ctx.sessionManager.getBranch();
  const modelCost = ctx.model?.cost;
  let total = 0;

  for (const entry of branch) {
    if (entry.type !== 'message' || entry.message.role !== 'assistant') continue;

    const assistant = entry.message as AssistantMessage;
    if (assistant.stopReason === 'aborted') continue;

    const directTotal = asNonNegativeNumber(assistant.usage?.cost?.total);
    if (directTotal > 0) {
      total += directTotal;
      continue;
    }

    const usageRead = asNonNegativeNumber(assistant.usage.input);
    const usageWrite = asNonNegativeNumber(assistant.usage.output);
    const usageCacheRead = asNonNegativeNumber(assistant.usage.cacheRead);
    const usageCacheWrite = asNonNegativeNumber(assistant.usage.cacheWrite);

    const inputRate = asNonNegativeNumber(modelCost?.input);
    const outputRate = asNonNegativeNumber(modelCost?.output);
    const cacheReadRate = asNonNegativeNumber(modelCost?.cacheRead);
    const cacheWriteRate = asNonNegativeNumber(modelCost?.cacheWrite);

    if (inputRate + outputRate + cacheReadRate + cacheWriteRate <= 0) continue;

    total +=
      (usageRead * inputRate +
        usageWrite * outputRate +
        usageCacheRead * cacheReadRate +
        usageCacheWrite * cacheWriteRate) /
      1_000_000;
  }

  return total;
}

/* Provider: model identifier string (e.g. `gpt-4.1`). */
const modelNameProvider: ContextValueProvider = (props) => {
  return props.ctx.model?.id ?? 'no-model';
};

/* Provider: abbreviated context window (e.g. `200k`) for display. */
const modelContextWindowProvider: ContextValueProvider = (props) => {
  const limit = getContextWindow(props.ctx);
  if (!limit) return ' - ';
  return `${Math.round(limit / 1_000)}k`;
};

/* Provider: integer percentage of used context window in range 0..100. */
const modelContextUsedProvider: ContextValueProvider = (props) => {
  const limit = getContextWindow(props.ctx);
  if (!limit) return null;

  const used = getUsedTokens(props.ctx);
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
};

/* Provider: raw used context tokens (0 when unavailable). */
const modelContextUsedTokensProvider: ContextValueProvider = (props) => {
  return getUsedTokens(props.ctx);
};

/* Provider: latest assistant read-side tokens (`input + cacheRead`). */
const usageTokensReadProvider: ContextValueProvider = (props) => {
  const assistant = getLatestAssistantMessage(props.ctx);
  if (!assistant) return 0;

  return getReadWriteTokens(assistant).read;
};

/* Provider: latest assistant write-side tokens (`output + cacheWrite`). */
const usageTokensWriteProvider: ContextValueProvider = (props) => {
  const assistant = getLatestAssistantMessage(props.ctx);
  if (!assistant) return 0;

  return getReadWriteTokens(assistant).write;
};

/* Provider: cumulative branch/session assistant cost in USD. */
const usageCostUsdProvider: ContextValueProvider = (props) => {
  return getSessionCostUsd(props.ctx);
};

/* Provider: current configured thinking level (or `-` if unavailable). */
const modelThinkingLevelProvider: ContextValueProvider = (props) => {
  const level = props.pi.getThinkingLevel?.();

  if (typeof level === 'string' && level.length > 0) {
    return level;
  }

  return '-';
};

/* Provider: compatibility alias for mode-oriented footer keys. */
const modelThinkingModeProvider: ContextValueProvider = (props) => {
  const level = asNonEmptyString(props.pi.getThinkingLevel?.());
  if (level) return level;

  const reasoning = props.ctx.model?.reasoning;
  if (typeof reasoning === 'boolean') {
    return reasoning ? 'enabled' : 'disabled';
  }

  return '-';
};

/* Provider: best-effort usage plan/tier discovery from runtime model/API metadata. */
const usagePlanProvider: ContextValueProvider = (props) => {
  const piWithUsagePlan = props.pi as { getUsagePlan?: () => unknown };
  const apiUsagePlan = asNonEmptyString(piWithUsagePlan.getUsagePlan?.());
  if (apiUsagePlan) return apiUsagePlan;

  const modelMeta = props.ctx.model as {
    usagePlan?: unknown;
    plan?: unknown;
    tier?: unknown;
    accountPlan?: unknown;
  };

  const modelUsagePlan =
    asNonEmptyString(modelMeta?.usagePlan) ??
    asNonEmptyString(modelMeta?.plan) ??
    asNonEmptyString(modelMeta?.tier) ??
    asNonEmptyString(modelMeta?.accountPlan);

  if (modelUsagePlan) return modelUsagePlan;

  return '-';
};

/* Provider: model platform/provider name (e.g. `openai`, `anthropic`). */
const modelPlatformNameProvider: ContextValueProvider = (props) => {
  const name = props.ctx.model?.provider;

  if (name) return name;
  return '-';
};

/* Transform: convert thinking level tokens to compact ascii/unicode indicators. */
const thinking_level_icons: PipelineTransform = (state, _ctx, style?) => {
  const value = state.value;
  if (typeof value !== 'string' || value.length === 0 || value === '-') {
    return { ...state, text: '-' };
  }

  const icons =
    style === 'ascii'
      ? {
          minimal: '-',
          low: '+',
          medium: '++',
          high: '+++',
          max: '++++',
        }
      : {
          off: '◌',
          minimal: '○',
          low: '◔',
          medium: '◑',
          high: '◕',
          xhigh: '',
          max: '●',
        };

  const text = icons[value as keyof typeof icons] ?? value;
  return { ...state, text };
};

/*
 * Transform: colorize context usage display based on percentage thresholds.
 * 0..49 => success, 50..79 => warning, 80+ => error.
 */
const context_used_color: PipelineTransform = (state, ctx) => {
  const value = state.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return { ...state, text: '--' };
  }

  const text = state.text || `${value}%`;

  if (value >= 80) return { ...state, text: ctx.theme.fg('error', text) };
  if (value >= 50) return { ...state, text: ctx.theme.fg('warning', text) };
  return { ...state, text: ctx.theme.fg('success', text) };
};

/* Register built-in model providers. */
Footer.registerContextValue('model_context_used', modelContextUsedProvider);
Footer.registerContextValue('model_context_used_tokens', modelContextUsedTokensProvider);
Footer.registerContextValue('model_context_window', modelContextWindowProvider);
Footer.registerContextValue('model_thinking_level', modelThinkingLevelProvider);
Footer.registerContextValue('model_thinking_mode', modelThinkingModeProvider);
Footer.registerContextValue('model_name', modelNameProvider);
Footer.registerContextValue('model_provider', modelPlatformNameProvider);
Footer.registerContextValue('usage_plan', usagePlanProvider);
Footer.registerContextValue('usage_tokens_read', usageTokensReadProvider);
Footer.registerContextValue('usage_tokens_write', usageTokensWriteProvider);
Footer.registerContextValue('usage_cost_usd', usageCostUsdProvider);

/* Register built-in model transforms and backward-compatible aliases. */
Footer.registerContextTransform('thinking_level_icons', thinking_level_icons);
Footer.registerContextTransform('context_used_color', context_used_color);
Footer.registerContextTransform('model_context_colors', context_used_color);
