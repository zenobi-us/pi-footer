import type { ExtensionAPI, ExtensionCommandContext } from '@mariozechner/pi-coding-agent';
import { reloadConfig } from '../services/config/index.ts';
import type { FooterInstance } from '../types.ts';

const SUBCOMMANDS = ['providers', 'debug', 'reload', 'help'] as const;
type PiFooterSubcommand = (typeof SUBCOMMANDS)[number];

type ParsedCommand = {
  subcommand: PiFooterSubcommand;
  args: string;
  unknown?: string;
};

import { parseTemplate } from '../core/pipeline.ts';
import type { Template } from '../core/template.ts';

/* Render unknown values safely for debug output lines. */
function formatValue(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value == null) return String(value);

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/* Ensure expression includes outer braces so parser treats it as a pipeline segment. */
function ensureBraces(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  return `{${trimmed}}`;
}

function trimOuterQuotes(input: string): string {
  const trimmed = input.trim();

  if (trimmed.length < 2) {
    return trimmed;
  }

  const firstChar = trimmed[0];
  const lastChar = trimmed[trimmed.length - 1];

  if ((firstChar === '"' || firstChar === "'") && firstChar === lastChar) {
    return trimmed.slice(1, -1).trim();
  }

  return trimmed;
}

/*
 * Open a pipeline debugger for a template expression.
 */
export async function runPipelineDebug(
  pi: ExtensionAPI,
  footer: FooterInstance,
  args: string,
  ctx: ExtensionCommandContext
): Promise<void> {
  const ft = footer as FooterInstance & { template: Template };

  let expression = trimOuterQuotes((args ?? '').trim());
  if (!expression && ctx.hasUI) {
    expression =
      (await ctx.ui.input(
        'Pipeline expression',
        '{model_context_used | humanise_percent | context_used_color}'
      )) ?? '';
  }

  if (!expression.trim()) {
    const usage =
      'Usage: /pi-footer debug {provider | transform1 | transform2(arg)}\n' +
      'Example: /pi-footer debug {model_context_used | humanise_percent | context_used_color}';

    if (!ctx.hasUI) {
      return;
    }

    ctx.ui.notify(usage, 'warning');
    return;
  }

  const template = ensureBraces(expression);
  const footerState = { pi, ctx, theme: ctx.ui.theme };
  const templateCtx = ft.template.createContext(footerState);
  const segments = parseTemplate(template, ft.template.transforms) as Array<
    { type: 'literal'; text: string } | { type: 'pipeline'; pipeline: { run: Function } }
  >;

  const lines: string[] = [];
  lines.push(`Expression: ${template}`);
  lines.push('');

  let rendered = '';
  let pipelineCount = 0;

  for (const segment of segments) {
    if (segment.type === 'literal') {
      rendered += segment.text;
      lines.push(`literal: ${JSON.stringify(segment.text)}`);
      continue;
    }

    pipelineCount += 1;
    const result = segment.pipeline.run(footerState, templateCtx) as {
      source: string;
      initialValue: unknown;
      finalValue: unknown;
      text: string;
      transforms: Array<{
        id: string;
        input: { text: string; value: unknown };
        output: { text: string; value: unknown };
      }>;
    };

    rendered += result.text;

    lines.push(`pipeline #${pipelineCount}: ${result.source}`);
    lines.push(`  initialValue: ${formatValue(result.initialValue)}`);
    lines.push(`  finalValue:   ${formatValue(result.finalValue)}`);
    lines.push(`  finalText:    ${JSON.stringify(result.text)}`);

    if (result.transforms.length === 0) {
      lines.push('  transforms: (none)');
    } else {
      lines.push('  transforms:');
      for (const [index, transform] of result.transforms.entries()) {
        lines.push(`    ${index + 1}. ${transform.id}`);
        lines.push(
          `       in : text=${JSON.stringify(transform.input.text)} value=${formatValue(transform.input.value)}`
        );
        lines.push(
          `       out: text=${JSON.stringify(transform.output.text)} value=${formatValue(transform.output.value)}`
        );
      }
    }

    lines.push('');
  }

  lines.push(`Rendered: ${rendered}`);
  const output = lines.join('\n');

  if (!ctx.hasUI) {
    return;
  }

  await ctx.ui.editor('Pipeline Debug', output);
}
/*
 * Show a scrollable selector containing currently registered footer providers.
 */
async function showContextProviders(
  footer: FooterInstance,
  ctx: ExtensionCommandContext
): Promise<void> {
  if (!ctx.hasUI) {
    return;
  }

  const ft = footer as FooterInstance & {
    template: { providers: Map<string, unknown> };
  };

  const providers = Array.from(ft.template.providers.keys()).sort((a, b) => a.localeCompare(b));

  if (providers.length === 0) {
    ctx.ui.notify('No context providers are registered.', 'warning');
    return;
  }

  const options = providers.map((provider) => `📊 ${provider}`);

  await ctx.ui.select(`Context Providers (${providers.length})`, options);
}

function parseCommand(rawArgs: string): ParsedCommand {
  const trimmed = rawArgs.trim();
  if (!trimmed) {
    return { subcommand: 'help', args: '' };
  }

  const match = trimmed.match(/^(\S+)(?:\s+([\s\S]*))?$/);
  if (!match) {
    return { subcommand: 'help', args: '' };
  }

  const token = match[1].toLowerCase();
  const args = match[2] ?? '';

  if (token === '-h' || token === '--help') {
    return { subcommand: 'help', args: '' };
  }

  if (token === 'providers' || token === 'debug' || token === 'reload' || token === 'help') {
    return { subcommand: token, args };
  }

  return { subcommand: 'help', args: '', unknown: token };
}

function commandHelpText(): string {
  return [
    'pi-footer commands',
    '',
    'Usage:',
    '  /pi-footer                Show this help',
    '  /pi-footer providers      List registered context providers',
    '  /pi-footer debug <expr>   Debug a footer template expression',
    '  /pi-footer reload         Reload config and rerender footer',
    '',
    'Examples:',
    '  /pi-footer providers',
    '  /pi-footer debug "{model_context_used | humanise_percent | context_used_color}"',
    '  /pi-footer reload',
  ].join('\n');
}

async function showHelp(ctx: ExtensionCommandContext): Promise<void> {
  if (!ctx.hasUI) {
    return;
  }

  ctx.ui.notify(commandHelpText(), 'info');
}

/*
 * Register `/pi-footer` command with subcommands for providers/debug/reload.
 */
export function registerPiFooterCommand(pi: ExtensionAPI, footer: FooterInstance): void {
  pi.registerCommand('pi-footer', {
    description: 'Footer utilities: providers, debug, reload',
    handler: async (args, ctx) => {
      const parsed = parseCommand(args);

      if (parsed.unknown && ctx.hasUI) {
        ctx.ui.notify(`Unknown subcommand: ${parsed.unknown}`, 'warning');
      }

      switch (parsed.subcommand) {
        case 'providers':
          await showContextProviders(footer, ctx);
          return;

        case 'debug':
          await runPipelineDebug(pi, footer, parsed.args, ctx);
          return;

        case 'reload':
          try {
            reloadConfig();

            if (ctx.hasUI) {
              ctx.ui.notify('pi-footer config reloaded.', 'info');
              ctx.ui.setStatus('pi-footer.reload', `reloaded ${new Date().toLocaleTimeString()}`);
              ctx.ui.setStatus('pi-footer.reload', undefined);
            }
          } catch (error) {
            if (ctx.hasUI) {
              const message = error instanceof Error ? error.message : String(error);
              ctx.ui.notify(`Failed to reload pi-footer config: ${message}`, 'error');
            }
          }
          return;

        case 'help':
        default:
          await showHelp(ctx);
      }
    },
  });
}
