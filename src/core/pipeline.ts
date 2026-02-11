/* eslint-disable no-unused-vars */
import type { FooterContextState } from '../types';

// ── Types ────────────────────────────────────────────────────────────────────

/** The resolved context data a pipeline reads from at runtime. */
export type PipelineContext = {
  data: Record<string, string>;
  rawData: Record<string, unknown>;
};

export type TransformRecord = {
  id: string;
  input: { text: string; value: unknown };
  output: { text: string; value: unknown };
};

export type PipelineState = {
  text: string;
  value: unknown;
  source: string;
  meta: Record<string, unknown>;
  transforms: TransformRecord[];
};

export type PipelineResult = {
  source: string;
  initialValue: unknown;
  finalValue: unknown;
  text: string;
  transforms: TransformRecord[];
};

/**
 * A pipeline transform receives immutable state + ambient context, returns new state.
 *
 * Convention:
 *  - Read `state.value` for semantic data (numbers, objects, etc.)
 *  - Read `state.text` for the current display string
 *  - Read `state.meta` for data left by earlier transforms
 *  - Return a new state with updated text/value/meta
 */
export type PipelineTransform = (
  ...args: [Readonly<PipelineState>, FooterContextState, ...unknown[]]
) => PipelineState;

// ── Transform descriptor (parsed from template) ──────────────────────────────

export type TransformDescriptor = {
  name: string;
  args: TransformArg[];
};

export type TransformArg = { type: 'literal'; value: unknown } | { type: 'ref'; key: string };

// ── Pipeline class ───────────────────────────────────────────────────────────

/**
 * A compiled pipeline for a single template expression `{key | transform | transform}`.
 *
 * Construction is the parse/compile phase — done once per template.
 * `run()` is the execute phase — called per render with fresh context.
 */
export class Pipeline {
  private source: string;
  private transforms: TransformDescriptor[];
  private registry: ReadonlyMap<string, PipelineTransform>;

  constructor(
    source: string,
    transforms: TransformDescriptor[],
    registry: ReadonlyMap<string, PipelineTransform>
  ) {
    this.source = source;
    this.transforms = transforms;
    this.registry = registry;
  }

  run(ctx: FooterContextState, templateCtx: PipelineContext): PipelineResult {
    const rawValue = templateCtx.rawData[this.source];
    const text = templateCtx.data[this.source] ?? '';

    let state: PipelineState = {
      text,
      value: rawValue,
      source: this.source,
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
      source: this.source,
      initialValue: rawValue,
      finalValue: state.value,
      text: state.text,
      transforms: state.transforms,
    };
  }
}

// ── Parsing ──────────────────────────────────────────────────────────────────

type TemplateSegment = { type: 'literal'; text: string } | { type: 'pipeline'; pipeline: Pipeline };

/**
 * Parse a template string into segments of literal text and compiled pipelines.
 *
 * Template syntax:
 *   literal text {provider | transform1('arg') | transform2(ref_key)} more text
 *
 * Args:
 *   Quoted  → literal:  'accent', "hello", '200'
 *   Numeric → literal:  42, 3.14
 *   Boolean → literal:  true, false
 *   Bare    → context ref: model_context_window resolves against context at runtime
 */
export function parseTemplate(
  template: string,
  registry: ReadonlyMap<string, PipelineTransform>
): TemplateSegment[] {
  const segments: TemplateSegment[] = [];
  const re = /\{\s*([\w-]+)(?:\s*\|\s*([^}]+))?\s*\}/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = re.exec(template)) !== null) {
    // Literal text before this match
    if (match.index > lastIndex) {
      segments.push({ type: 'literal', text: template.slice(lastIndex, match.index) });
    }

    const source = match[1];
    const transformChain = match[2];
    const transforms = transformChain ? parseTransformChain(transformChain) : [];

    segments.push({
      type: 'pipeline',
      pipeline: new Pipeline(source, transforms, registry),
    });

    lastIndex = re.lastIndex;
  }

  // Trailing literal
  if (lastIndex < template.length) {
    segments.push({ type: 'literal', text: template.slice(lastIndex) });
  }

  return segments;
}

/**
 * Split a transform chain string on `|` respecting parentheses and quotes.
 *
 *   "humanise_percent | fg('accent') | clamp(0, 100)"
 *   → [ {name:"humanise_percent", args:[]}, {name:"fg", args:[{type:"literal",value:"accent"}]}, ... ]
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

/**
 * Split string on `|` that are not inside parentheses or quotes.
 */
function splitOnPipe(input: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    // Quote tracking
    if ((ch === "'" || ch === '"') && (i === 0 || input[i - 1] !== '\\')) {
      if (quote === ch) {
        quote = null;
      } else if (quote === null) {
        quote = ch;
      }
      current += ch;
      continue;
    }

    // Paren tracking (outside quotes)
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

/**
 * Parse a single transform expression: `name` or `name(arg1, arg2)`
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

/**
 * Parse transform arguments, splitting on `,` respecting quotes.
 *
 * Quoted values → literal (string)
 * Numbers       → literal (number)
 * true/false    → literal (boolean)
 * null          → literal (null)
 * Bare words    → context ref (resolved at runtime)
 */
function parseTransformArgs(argsStr: string): TransformArg[] {
  const parts = splitOnComma(argsStr);
  return parts.map(classifyArg);
}

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

function classifyArg(raw: string): TransformArg {
  const trimmed = raw.trim();

  // Quoted string → literal
  const quoted = trimmed.match(/^(["'])(.*)\1$/);
  if (quoted) return { type: 'literal', value: quoted[2] };

  // Boolean → literal
  if (trimmed === 'true') return { type: 'literal', value: true };
  if (trimmed === 'false') return { type: 'literal', value: false };

  // Null → literal
  if (trimmed === 'null') return { type: 'literal', value: null };

  // Number → literal
  const num = Number(trimmed);
  if (!Number.isNaN(num) && Number.isFinite(num) && trimmed.length > 0) {
    return { type: 'literal', value: num };
  }

  // Bare word → context reference
  return { type: 'ref', key: trimmed };
}

// ── Render helper ────────────────────────────────────────────────────────────

/**
 * Execute pre-parsed template segments against a context.
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
