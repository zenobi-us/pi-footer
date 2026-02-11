import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import { parseTemplate } from '../core/pipeline.ts';
import type { Template } from '../core/template.ts';
import type { FooterInstance } from '../types.ts';

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

function ensureBraces(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  return `{${trimmed}}`;
}

export function registerPipelineDebugCommand(pi: ExtensionAPI, footer: FooterInstance): void {
  pi.registerCommand('pipeline-debug', {
    description:
      'Debug a footer pipeline expression. Example: /pipeline-debug {model_context_used | humanise_percent | context_used_color}',
    handler: async (args, ctx) => {
      const ft = footer as FooterInstance & { template: Template };

      let expression = (args ?? '').trim();
      if (!expression && ctx.hasUI) {
        expression =
          (await ctx.ui.input(
            'Pipeline expression',
            '{model_context_used | humanise_percent | context_used_color}'
          )) ?? '';
      }

      if (!expression.trim()) {
        const usage =
          'Usage: /pipeline-debug {provider | step1 | step2(arg)}\n' +
          'Example: /pipeline-debug {model_context_used | humanise_percent | context_used_color}';

        if (!ctx.hasUI) {
          console.log(usage);
          return;
        }

        ctx.ui.notify(usage, 'warning');
        return;
      }

      const template = ensureBraces(expression);
      const footerState = { pi, ctx, theme: ctx.ui.theme };
      const templateCtx = ft.template.createContext(footerState);
      const segments = parseTemplate(template, ft.template.steps) as Array<
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
          lines.push('  steps: (none)');
        } else {
          lines.push('  steps:');
          for (const [index, step] of result.transforms.entries()) {
            lines.push(`    ${index + 1}. ${step.id}`);
            lines.push(
              `       in : text=${JSON.stringify(step.input.text)} value=${formatValue(step.input.value)}`
            );
            lines.push(
              `       out: text=${JSON.stringify(step.output.text)} value=${formatValue(step.output.value)}`
            );
          }
        }

        lines.push('');
      }

      lines.push(`Rendered: ${rendered}`);
      const output = lines.join('\n');

      if (!ctx.hasUI) {
        console.log(output);
        return;
      }

      await ctx.ui.editor('Pipeline Debug', output);
    },
  });
}
