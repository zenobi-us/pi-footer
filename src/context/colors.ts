import { Footer } from '../footer.ts';
import type { PipelineTransform } from '../core/pipeline.ts';
import { ThemeColor } from '@mariozechner/pi-coding-agent';

/* Transform: apply foreground theme color to current text. */
const fg: PipelineTransform = (state, ctx, colorName) => {
  if (!state.text) return { ...state };

  if (typeof colorName !== 'string' || !colorName) return { ...state };

  try {
    const text = ctx.theme.fg(colorName as ThemeColor, state.text);
    return {
      ...state,
      transforms: [
        ...state.transforms,
        {
          id: 'fg',
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

/* Transform: apply background theme color to current text. */
const bg: PipelineTransform = (state, ctx, colorName) => {
  if (!state.text) return { ...state };

  if (typeof colorName !== 'string' || !colorName) return { ...state };

  try {
    return { ...state, text: ctx.theme.bg(colorName as ThemeColor, state.text) };
  } catch {
    return { ...state };
  }
};

/* Register built-in color transforms. */
Footer.registerContextTransform('fg', fg);
Footer.registerContextTransform('bg', bg);
