import { ContextValueProvider, FooterContextState } from '../types';
import { PipelineContext, PipelineTransform, parseTemplate, renderSegments } from './pipeline';

export type TemplateContext = PipelineContext & {
  state: FooterContextState;
};

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

export class Template {
  providers = new Map<string, ContextValueProvider>();
  transforms = new Map<string, PipelineTransform>();

  private compiledCache = new Map<string, CompiledTemplate>();

  registerContextProvider(name: string, provider: ContextValueProvider): void {
    this.providers.set(name, provider);
  }

  unregisterContextProvider(name: string): void {
    this.providers.delete(name);
  }

  registerTransform(name: string, transform: PipelineTransform): void {
    this.transforms.set(name, transform);
    this.compiledCache.clear();
  }

  unregisterTransform(name: string): void {
    this.transforms.delete(name);
    this.compiledCache.clear();
  }

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

  private compile(template: string): CompiledTemplate {
    const cached = this.compiledCache.get(template);
    if (cached) return cached;

    const compiled = parseTemplate(template, this.transforms);
    this.compiledCache.set(template, compiled);
    return compiled;
  }

  render(template: string, context: TemplateContext): string {
    const segments = this.compile(template);
    return renderSegments(segments, context.state, context);
  }
}
