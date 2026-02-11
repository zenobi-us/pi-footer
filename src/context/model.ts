import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { PipelineStep } from "../core/pipeline.ts";
import { Footer } from "../footer.ts";
import type { ContextValueProvider } from "../types.ts";

function getContextWindow(ctx: ExtensionContext): number | null {
  const model = ctx.model as { contextWindow?: unknown } | undefined;
  const raw = model?.contextWindow;

  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return raw;
  }

  if (typeof raw === "string") {
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

function getUsedTokens(ctx: ExtensionContext): number {
  // Get last assistant message (skip aborted messages)
  // Context window shows current prompt context, not cumulative usage
  const branch = ctx.sessionManager.getBranch();

  // Find last assistant message (reverse iteration)
  let lastAssistantMessage: AssistantMessage | undefined;

  for (let i = branch.length - 1; i >= 0; i--) {
    const entry = branch[i];
    if (entry.type === "message" && entry.message.role === "assistant") {
      const assistant = entry.message as AssistantMessage;
      // Skip aborted messages
      if (assistant.stopReason !== "aborted") {
        lastAssistantMessage = assistant;
        break;
      }
    }
  }

  if (!lastAssistantMessage) return 0;

  // Include all token types that count toward context window
  return (
    lastAssistantMessage.usage.input +
    lastAssistantMessage.usage.output +
    lastAssistantMessage.usage.cacheRead +
    lastAssistantMessage.usage.cacheWrite
  );
}

const modelNameProvider: ContextValueProvider = (props) => {
  return props.ctx.model?.id ?? "no-model";
};

const modelContextWindowProvider: ContextValueProvider = (props) => {
  const limit = getContextWindow(props.ctx);
  if (!limit) return " - ";
  return `${Math.round(limit / 1_000)}k`;
};

const modelContextUsedProvider: ContextValueProvider = (props) => {
  const limit = getContextWindow(props.ctx);
  if (!limit) return null;

  const used = getUsedTokens(props.ctx);
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
};

const modelThinkingLevelProvider: ContextValueProvider = (props) => {
  const level = props.pi.getThinkingLevel?.();

  if (typeof level === "string" && level.length > 0) {
    return level;
  }

  return "-";
};

const modelPlatformNameProvider: ContextValueProvider = (props) => {
  const name = props.ctx.model?.provider;

  if (name) return name;
  return "-";
};

const thinking_level_icons: PipelineStep = (state, _ctx, style?) => {
  const value = state.value;
  if (typeof value !== "string" || value.length === 0 || value === "-") {
    return { ...state, text: "-" };
  }

  const icons =
    style === "ascii"
      ? {
          minimal: "-",
          low: "+",
          medium: "++",
          high: "+++",
          max: "++++",
        }
      : {
          minimal: "◌",
          low: "◔",
          medium: "◑",
          high: "◕",
          max: "●",
        };

  const text = icons[value as keyof typeof icons] ?? value;
  return { ...state, text };
};

/**
 * context_used_color — color the current text based on context usage percentage.
 *
 * Reads `state.value` (0–100) for threshold logic, wraps `state.text` in color.
 * Best used after a formatting step:
 *
 *   {model_context_used | context_used_color}
 *
 * Thresholds:
 *   0–50%  → success (green)
 *   50–80% → warning (yellow)
 *   80%+   → error   (red)
 */
const context_used_color: PipelineStep = (state, ctx) => {
  const value = state.value;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return { ...state, text: "--" };
  }

  const text = state.text || `${value}%`;

  if (value >= 80) return { ...state, text: ctx.theme.fg("error", text) };
  if (value >= 50) return { ...state, text: ctx.theme.fg("warning", text) };
  return { ...state, text: ctx.theme.fg("success", text) };
};

Footer.registerContextValue("model_context_used", modelContextUsedProvider);
Footer.registerContextValue("model_context_window", modelContextWindowProvider);
Footer.registerContextValue("model_thinking_level", modelThinkingLevelProvider);
Footer.registerContextValue("model_name", modelNameProvider);
Footer.registerContextValue("model_provider", modelPlatformNameProvider);

Footer.registerStep("thinking_level_icons", thinking_level_icons);
Footer.registerStep("context_used_color", context_used_color);
Footer.registerStep("model_context_colors", context_used_color);
