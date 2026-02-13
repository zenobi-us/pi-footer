import { truncateToWidth, visibleWidth } from '@mariozechner/pi-tui';
import { Template } from './core/template.ts';
import type { TemplateContext } from './core/template.ts';
import type { FooterInstance, FooterTemplate, FooterTemplateObjectItem } from './types.ts';

type RenderedTemplateItem = {
  /*
   * Normalized rendered text for this item.
   */
  text: string;

  /*
   * Alignment bucket used during row composition.
   */
  align: 'left' | 'right';

  /*
   * Whether this item should be included in the trailing block.
   */
  flexGrow: boolean;
};

/*
 * Purpose:
 * Render a single template node (string or nested object) into a normalized item.
 *
 * Inputs:
 * - `template`: template runtime instance
 * - `context`: current render context
 * - `entry`: template node to render
 * - `rootSeparator`: default separator inherited from the row
 *
 * Returns:
 * - `RenderedTemplateItem` or `null` when resulting text is empty
 */
function renderTemplateItem(
  template: Template,
  context: TemplateContext,
  entry: string | FooterTemplateObjectItem,
  rootSeparator: string
): RenderedTemplateItem | null {
  if (typeof entry === 'string') {
    const text = template.render(entry, context).replace(/\s+/g, ' ').trim();

    if (!text) return null;

    return { text, align: 'left', flexGrow: false };
  }

  const separator = entry.separator ?? rootSeparator;
  const renderedChildren = entry.items
    .map((child: string | FooterTemplateObjectItem) =>
      renderTemplateItem(template, context, child, rootSeparator)?.text ?? ''
    )
    .filter((value: string) => value.trim().length > 0);

  const text = renderedChildren.join(separator).replace(/\s+/g, ' ').trim();
  if (!text) return null;

  return {
    text,
    align: entry.align === 'right' ? 'right' : 'left',
    flexGrow: entry.flexGrow === true,
  };
}

/*
 * Purpose:
 * Render one footer row by composing left and trailing groups with adaptive spacing.
 *
 * Inputs:
 * - `templateEngine`: template runtime instance
 * - `context`: current render context
 * - `line`: one template row definition
 * - `width`: available row width
 * - `separator`: row join separator string
 *
 * Returns:
 * - Final rendered row constrained to `width`
 */
function renderTemplateLine(
  templateEngine: Template,
  context: TemplateContext,
  line: FooterTemplate[number],
  width: number,
  separator: string
): string {
  const entries: (string | FooterTemplateObjectItem)[] = Array.isArray(line) ? line : [line];

  const rendered = entries
    .map((entry) => renderTemplateItem(templateEngine, context, entry, separator))
    .filter((entry): entry is RenderedTemplateItem => entry !== null);

  if (rendered.length === 0) return '';

  const left = rendered
    .filter((item) => item.align === 'left' && !item.flexGrow)
    .map((item) => item.text)
    .join(separator);

  const trailing = rendered
    .filter((item) => item.align === 'right' || item.flexGrow)
    .map((item) => item.text)
    .join(separator);

  if (!trailing) {
    return truncateToWidth(left || '', width);
  }

  const pad = ' '.repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(trailing)));

  return truncateToWidth(`${left}${pad}${trailing}`, width);
}

/*
 * Purpose:
 * Build the singleton footer runtime that owns provider/transform registries.
 *
 * Returns:
 * - Footer instance with public registration and rendering API
 */
function createFooter(): FooterInstance & { template: Template } {
  const template = new Template();

  return {
    /*
     * Public template runtime for command-level introspection/debugging.
     */
    template,

    /*
     * Purpose:
     * Register a context provider accessible from template placeholders.
     */
    registerContextValue(name, provider) {
      template.registerContextProvider(name, provider);
    },

    /*
     * Purpose:
     * Register a transform accessible from template pipeline expressions.
     */
    registerContextTransform(name, transform) {
      template.registerTransform(name, transform);
    },

    /*
     * Purpose:
     * Render all configured rows using a fresh context snapshot.
     *
     * Returns:
     * - One rendered string per template row
     */
    render(pi, ctx, theme, width, options) {
      if (!options.template) {
        return [''];
      }

      const context = template.createContext({ pi, ctx, theme });
      const separator = theme.fg('dim', ' · ');
      const lines: string[] = [];

      for (const line of options.template) {
        lines.push(renderTemplateLine(template, context, line, width, separator));
      }

      return lines;
    },
  };
}

/*
 * Global footer instance consumed by extension entrypoint and built-in context modules.
 */
export const Footer = createFooter();
