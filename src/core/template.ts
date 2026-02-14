import type { ContextValueProvider, FooterContextState } from '../types.ts';
import { parseTemplate, renderSegments } from './pipeline.ts';
import type { PipelineContext, PipelineTransform } from './pipeline.ts';

export type TemplateContext = PipelineContext & {
  /*
   * Runtime objects and APIs exposed to providers/transforms.
   */
  state: FooterContextState;
};

/*
 * Purpose:
 * Convert provider output into a display-safe text string.
 *
 * Inputs:
 * - `value`: provider return value (scalar, array, object, nullish)
 *
 * Returns:
 * - Normalized string (objects omitted; scalar entries joined with a space)
 */
export function stringifyProviderValue(value: ReturnType<ContextValueProvider>): string {
  if (value == null) return '';

  const entries = Array.isArray(value) ? value : [value];

  return entries
    .map((entry) => {
      if (entry == null) return '';
      if (typeof entry === 'object') return '';
      return String(entry).trim();
    })
    .filter((entry) => entry.length > 0)
    .join(' ');
}

type CompiledTemplate = ReturnType<typeof parseTemplate>;

/*
 * Purpose:
 * Manage provider/transform registries, template compilation cache, and rendering.
 */
export class TemplateService {
  /*
   * Public registry of provider functions keyed by placeholder name.
   */
  providers = new Map<string, ContextValueProvider>();

  /*
   * Public registry of transform functions keyed by transform name.
   */
  transforms = new Map<string, PipelineTransform>();

  /*
   * Internal cache of parsed pipeline segments keyed by template source string.
   */
  private compiledCache = new Map<string, CompiledTemplate>();

  /*
   * Purpose:
   * Register or replace a context provider.
   *
   * Inputs:
   * - `name`: provider key used in `{name}` templates
   * - `provider`: runtime resolver function
   */
  registerContextProvider(name: string, provider: ContextValueProvider): void {
    this.providers.set(name, provider);
  }

  /*
   * Purpose:
   * Unregister a context provider.
   *
   * Inputs:
   * - `name`: provider key
   */
  unregisterContextProvider(name: string): void {
    this.providers.delete(name);
  }

  /*
   * Purpose:
   * Register or replace a transform and invalidate compiled template cache.
   *
   * Inputs:
   * - `name`: transform id used in pipeline expressions
   * - `transform`: transform implementation
   */
  registerTransform(name: string, transform: PipelineTransform): void {
    this.transforms.set(name, transform);
    this.compiledCache.clear();
  }

  /*
   * Purpose:
   * Unregister a transform and invalidate compiled template cache.
   *
   * Inputs:
   * - `name`: transform id
   */
  unregisterTransform(name: string): void {
    this.transforms.delete(name);
    this.compiledCache.clear();
  }

  /*
   * Purpose:
   * Resolve every registered provider into a single render context snapshot.
   *
   * Inputs:
   * - `state`: extension runtime state passed to providers
   *
   * Returns:
   * - `TemplateContext` containing both stringified and raw provider values
   */
  createContext(state: FooterContextState): TemplateContext {
    const data: Record<string, string> = {};
    const rawData: Record<string, unknown> = {};

    for (const [name, provider] of this.providers.entries()) {
      try {
        const value = provider(state);
        rawData[name] = value;
        data[name] = stringifyProviderValue(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        data[name] = `${name}: ${message}`;
        rawData[name] = undefined;
      }
    }

    return { data, rawData, state };
  }

  /*
   * Purpose:
   * Parse and cache a template string into executable segments.
   *
   * Inputs:
   * - `template`: source template text
   *
   * Returns:
   * - Parsed segment list (from cache when available)
   */
  private compile(template: string): CompiledTemplate {
    const cached = this.compiledCache.get(template);
    if (cached) return cached;

    const compiled = parseTemplate(template, this.transforms);
    this.compiledCache.set(template, compiled);
    return compiled;
  }

  /*
   * Purpose:
   * Render a template string against a resolved context snapshot.
   *
   * Inputs:
   * - `template`: source template text
   * - `context`: resolved provider context
   *
   * Returns:
   * - Rendered output string
   */
  render(template: string, context: TemplateContext): string {
    const segments = this.compile(template);
    return renderSegments(segments, context.state, context);
  }
}
