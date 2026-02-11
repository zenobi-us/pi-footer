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

/*
 * Compute currently used context tokens from the latest non-aborted assistant message.
 * Includes input/output/cache counters because all contribute to window occupancy.
 */
function getUsedTokens(ctx: ExtensionContext): number {
  const branch = ctx.sessionManager.getBranch();

  let lastAssistantMessage: AssistantMessage | undefined;

  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];
    if (entry.type === 'message' && entry.message.role === 'assistant') {
      const assistant = entry.message as AssistantMessage;
      if (assistant.stopReason !== 'aborted') {
        lastAssistantMessage = assistant;
        break;
      }
    }
  }

  if (!lastAssistantMessage) return 0;

  return (
    lastAssistantMessage.usage.input +
    lastAssistantMessage.usage.output +
    lastAssistantMessage.usage.cacheRead +
    lastAssistantMessage.usage.cacheWrite
  );
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

/* Provider: current configured thinking level (or `-` if unavailable). */
const modelThinkingLevelProvider: ContextValueProvider = (props) => {
  const level = props.pi.getThinkingLevel?.();

  if (typeof level === 'string' && level.length > 0) {
    return level;
  }

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
          minimal: '◌',
          low: '◔',
          medium: '◑',
          high: '◕',
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
Footer.registerContextValue('model_context_window', modelContextWindowProvider);
Footer.registerContextValue('model_thinking_level', modelThinkingLevelProvider);
Footer.registerContextValue('model_name', modelNameProvider);
Footer.registerContextValue('model_provider', modelPlatformNameProvider);

/* Register built-in model transforms and backward-compatible aliases. */
Footer.registerContextTransform('thinking_level_icons', thinking_level_icons);
Footer.registerContextTransform('context_used_color', context_used_color);
Footer.registerContextTransform('model_context_colors', context_used_color);
