/* eslint-disable no-unused-vars */
import type { FooterContextState } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

export type PipelineContext = {
  /* Stringified provider values intended for display rendering. */
  data: Record<string, string>;

  /* Raw provider values used by transforms and argument references. */
  rawData: Record<string, unknown>;
};

export type TransformRecord = {
  /* Transform registry id that executed (e.g. `humanise_percent`). */
  id: string;

  /* Snapshot of text/value before the transform was applied. */
  input: { text: string; value: unknown };

  /* Snapshot of text/value after the transform finished. */
  output: { text: string; value: unknown };
};

export type PipelineState = {
  /* Current display text at this step of the pipeline. */
  text: string;

  /* Current semantic value at this step of the pipeline. */
  value: unknown;

  /* Source provider key that initiated this pipeline. */
  source: string;

  /* Cross-transform scratchpad for advanced transform composition. */
  meta: Record<string, unknown>;

  /* Execution history records appended after each successful transform. */
  transforms: TransformRecord[];
};

export type PipelineResult = {
  /* Source provider key that initiated this pipeline. */
  source: string;

  /* Provider raw value before any transforms ran. */
  initialValue: unknown;

  /* Final semantic value after all transform steps complete. */
  finalValue: unknown;

  /* Final display text emitted into template output. */
  text: string;

  /* Ordered transform history for debugging/inspection. */
  transforms: TransformRecord[];
};

/*
 * A transform receives immutable pipeline state + ambient footer context,
 * then returns the next pipeline state.
 */
export type PipelineTransform = (
  ...args: [Readonly<PipelineState>, FooterContextState, ...unknown[]]
) => PipelineState;

// ── Transform descriptor (parsed from template) ──────────────────────────────

export type TransformDescriptor = {
  /* Transform name looked up in the runtime registry. */
  name: string;

  /* Parsed argument descriptors resolved at execution time. */
  args: TransformArg[];
};

export type TransformArg =
  | {
      /* Discriminator for literal argument variant. */
      type: 'literal';

      /* Parsed literal value (string/number/boolean/null). */
      value: unknown;
    }
  | {
      /* Discriminator for runtime context reference variant. */
      type: 'ref';

      /* Context key resolved from `rawData`/`data` at pipeline runtime. */
      key: string;
    };

export type PipelineSource =
  | {
      /* Provider lookup source variant (`{model_name | ...}`). */
      type: 'ref';

      /* Provider key resolved from `templateCtx.rawData/data`. */
      key: string;
    }
  | {
      /* Literal source variant (`{"text" | ...}`). */
      type: 'literal';

      /* Inline literal text/value for pipeline bootstrap. */
      value: string;
    };

// ── Pipeline class ───────────────────────────────────────────────────────────

/*
 * Purpose:
 * Represent one compiled pipeline expression: `{provider | transformA | transformB(...)}`.
 *
 * Notes:
 * - Construction happens at parse/compile time.
 * - `run()` executes per render with fresh runtime context.
 */
export class Pipeline {
  private source: PipelineSource;
  private transforms: TransformDescriptor[];
  private registry: ReadonlyMap<string, PipelineTransform>;

  /*
   * Purpose:
   * Store source descriptor, parsed transform chain, and transform registry reference.
   *
   * Inputs:
   * - `source`: provider ref or inline literal source descriptor
   * - `transforms`: parsed transform descriptors
   * - `registry`: transform implementation map
   */
  constructor(
    source: PipelineSource,
    transforms: TransformDescriptor[],
    registry: ReadonlyMap<string, PipelineTransform>
  ) {
    this.source = source;
    this.transforms = transforms;
    this.registry = registry;
  }

  /*
   * Purpose:
   * Execute the compiled pipeline against runtime context.
   *
   * Inputs:
   * - `ctx`: footer runtime state
   * - `templateCtx`: resolved provider data/rawData
   *
   * Returns:
   * - `PipelineResult` including final text/value and transform trace
   */
  run(ctx: FooterContextState, templateCtx: PipelineContext): PipelineResult {
    const sourceKey = this.source.type === 'ref' ? this.source.key : this.source.value;
    const rawValue =
      this.source.type === 'ref' ? templateCtx.rawData[this.source.key] : this.source.value;
    const text =
      this.source.type === 'ref' ? templateCtx.data[this.source.key] ?? '' : this.source.value;

    let state: PipelineState = {
      text,
      value: rawValue,
      source: sourceKey,
      meta: {},
      transforms: [],
    };

    for (const descriptor of this.transforms) {
      const transform = this.registry.get(descriptor.name);
      if (!transform) {
        continue;
      }

      const resolvedArgs = descriptor.args.map((arg) =>
        arg.type === 'literal'
          ? arg.value
          : templateCtx.rawData[arg.key] ?? templateCtx.data[arg.key] ?? arg.key
      );

      const input = { text: state.text, value: state.value };

      try {
        state = transform(state, ctx, ...resolvedArgs);
      } catch {
        continue;
      }

      state = {
        ...state,
        transforms: [
          ...state.transforms,
          {
            id: descriptor.name,
            input,
            output: { text: state.text, value: state.value },
          },
        ],
      };
    }

    return {
      source: sourceKey,
      initialValue: rawValue,
      finalValue: state.value,
      text: state.text,
      transforms: state.transforms,
    };
  }
}

// ── Parsing ──────────────────────────────────────────────────────────────────

type TemplateSegment =
  | {
      /* Discriminator for literal string chunk. */
      type: 'literal';

      /* Static text copied directly into final output. */
      text: string;
    }
  | {
      /* Discriminator for compiled pipeline chunk. */
      type: 'pipeline';

      /* Executable pipeline for one `{provider | transform...}` expression. */
      pipeline: Pipeline;
    };

/*
 * Purpose:
 * Parse template text into literal segments and compiled pipeline segments.
 *
 * Inputs:
 * - `template`: source text containing `{provider | ...}` or `{"literal" | ...}` expressions
 * - `registry`: transform map used by compiled pipeline instances
 *
 * Returns:
 * - Ordered `TemplateSegment[]`
 */
export function parseTemplate(
  template: string,
  registry: ReadonlyMap<string, PipelineTransform>
): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  const re = /\{\s*(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|([\w-]+))(?:\s*\|\s*([^}]+))?\s*\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(template)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'literal', text: template.slice(lastIndex, match.index) });
    }

    const doubleQuotedSource = match[1];
    const singleQuotedSource = match[2];
    const refSource = match[3];
    const transformChain = match[4];
    const transforms = transformChain ? parseTransformChain(transformChain) : [];

    const source: PipelineSource =
      doubleQuotedSource != null
        ? { type: 'literal', value: unescapeQuotedLiteral(doubleQuotedSource) }
        : singleQuotedSource != null
          ? { type: 'literal', value: unescapeQuotedLiteral(singleQuotedSource) }
          : { type: 'ref', key: refSource };

    segments.push({
      type: 'pipeline',
      pipeline: new Pipeline(source, transforms, registry),
    });

    lastIndex = re.lastIndex;
  }

  if (lastIndex < template.length) {
    segments.push({ type: 'literal', text: template.slice(lastIndex) });
  }

  return segments;
}

/*
 * Purpose:
 * Parse a transform chain string split on top-level pipe operators.
 *
 * Inputs:
 * - `chain`: raw transform chain text
 *
 * Returns:
 * - Parsed transform descriptors
 */
function parseTransformChain(chain: string): TransformDescriptor[] {
  const parts = splitOnPipe(chain);
  const transforms: TransformDescriptor[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const descriptor = parseTransformDescriptor(trimmed);
    if (descriptor) transforms.push(descriptor);
  }

  return transforms;
}

/*
 * Purpose:
 * Split on top-level `|` while respecting quotes and parenthesis nesting.
 *
 * Inputs:
 * - `input`: transform-chain source text
 *
 * Returns:
 * - Pipe-separated parts safe for per-transform parsing
 */
function splitOnPipe(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if ((ch === "'" || ch === '"') && (i === 0 || input[i - 1] !== '\\')) {
      if (quote === ch) {
        quote = null;
      } else if (quote === null) {
        quote = ch;
      }
      current += ch;
      continue;
    }

    if (quote === null) {
      if (ch === '(') {
        depth++;
        current += ch;
        continue;
      }
      if (ch === ')') {
        depth = Math.max(0, depth - 1);
        current += ch;
        continue;
      }

      if (ch === '|' && depth === 0) {
        parts.push(current);
        current = '';
        continue;
      }
    }

    current += ch;
  }

  if (current) parts.push(current);
  return parts;
}

/*
 * Purpose:
 * Parse a single transform expression (`name` or `name(arg1, arg2, ...)`).
 *
 * Inputs:
 * - `expr`: one transform expression string
 *
 * Returns:
 * - Descriptor or `null` when syntax is invalid
 */
function parseTransformDescriptor(expr: string): TransformDescriptor | null {
  const match = expr.match(/^([A-Za-z_][\w-]*)(?:\((.*)\))?$/s);
  if (!match) return null;

  const name = match[1];
  const argsStr = match[2];

  return {
    name,
    args: argsStr != null ? parseTransformArgs(argsStr) : [],
  };
}

/*
 * Purpose:
 * Parse and classify argument list tokens into literal/ref descriptors.
 *
 * Inputs:
 * - `argsStr`: raw argument list text from `name(...)`
 *
 * Returns:
 * - Ordered transform arguments
 */
function parseTransformArgs(argsStr: string): TransformArg[] {
  const parts = splitOnComma(argsStr);
  return parts.map(classifyArg);
}

/*
 * Purpose:
 * Split on top-level commas while respecting quoted substrings.
 *
 * Inputs:
 * - `input`: argument list text
 *
 * Returns:
 * - Comma-separated argument tokens
 */
function splitOnComma(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if ((ch === "'" || ch === '"') && (i === 0 || input[i - 1] !== '\\')) {
      if (quote === ch) {
        quote = null;
      } else if (quote === null) {
        quote = ch;
      }
      current += ch;
      continue;
    }

    if (ch === ',' && quote === null) {
      parts.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/*
 * Purpose:
 * Classify one argument token as scalar literal or runtime context reference.
 *
 * Inputs:
 * - `raw`: unclassified token text
 *
 * Returns:
 * - `TransformArg` descriptor
 */
function classifyArg(raw: string): TransformArg {
  const trimmed = raw.trim();

  const quoted = trimmed.match(/^(["'])(.*)\1$/);
  if (quoted) return { type: 'literal', value: quoted[2] };

  if (trimmed === 'true') return { type: 'literal', value: true };
  if (trimmed === 'false') return { type: 'literal', value: false };

  if (trimmed === 'null') return { type: 'literal', value: null };

  const num = Number(trimmed);
  if (!Number.isNaN(num) && Number.isFinite(num) && trimmed.length > 0) {
    return { type: 'literal', value: num };
  }

  return { type: 'ref', key: trimmed };
}

/* Unescape basic escaped quote/backslash sequences for quoted pipeline sources. */
function unescapeQuotedLiteral(value: string): string {
  return value.replace(/\\([\\"'])/g, '$1');
}

// ── Render helper ────────────────────────────────────────────────────────────

/*
 * Purpose:
 * Execute parsed template segments and concatenate final rendered output.
 *
 * Inputs:
 * - `segments`: parsed literal/pipeline segment list
 * - `ctx`: footer runtime state
 * - `templateCtx`: resolved provider data/rawData
 *
 * Returns:
 * - Final rendered string
 */
export function renderSegments(
  segments: TemplateSegment[],
  ctx: FooterContextState,
  templateCtx: PipelineContext
): string {
  let result = '';
  for (const seg of segments) {
    if (seg.type === 'literal') {
      result += seg.text;
    } else {
      result += seg.pipeline.run(ctx, templateCtx).text;
    }
  }
  return result;
}
