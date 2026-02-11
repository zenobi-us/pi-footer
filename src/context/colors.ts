import { Footer } from "../footer.ts";
import type { PipelineStep } from "../core/pipeline.ts";
import { ThemeColor } from "@mariozechner/pi-coding-agent";

/**
 * fg('colorName') — wrap text in a theme foreground color.
 *
 * Usage in templates:
 *   {git_branch_name | fg('accent')}
 *   {model_name | fg('success')}
 *   {cwd | fg('muted')}
 */
const fg: PipelineStep = (state, ctx, colorName) => {
  if (!state.text) return { ...state };

  if (typeof colorName !== "string" || !colorName) return { ...state };

  try {
    const text = ctx.theme.fg(colorName as ThemeColor, state.text);
    return {
      ...state,
      transforms: [
        ...state.transforms,
        {
          id: "fg",
          input: { text: state.text, value: state.value },
          output: { text: state.text, value: state.value },
        },
      ],
      text,
    };
  } catch {
    return { ...state };
  }
};

/**
 * bg('colorName') — wrap text in a theme background color.
 *
 * Usage in templates:
 *   {model_name | bg('selectedBg')}
 *   {git_branch_name | bg('toolSuccessBg')}
 */
const bg: PipelineStep = (state, ctx, colorName) => {
  if (!state.text) return { ...state };

  if (typeof colorName !== "string" || !colorName) return { ...state };

  try {
    return { ...state, text: ctx.theme.bg(colorName as any, state.text) };
  } catch {
    return { ...state };
  }
};

Footer.registerStep("fg", fg);
Footer.registerStep("bg", bg);
