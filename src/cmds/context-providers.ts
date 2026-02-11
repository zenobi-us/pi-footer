import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import type { FooterInstance } from '../types.ts';

export function registerContextProvidersCommand(pi: ExtensionAPI, footer: FooterInstance): void {
  pi.registerCommand('context-providers', {
    description: 'List registered footer context providers and pipeline steps',
    handler: async (_args, ctx) => {
      const ft = footer as FooterInstance & { template: any };
      const providers = Array.from(ft.template.providers.keys() as Iterable<string>).sort((a, b) =>
        a.localeCompare(b)
      );
      const steps = Array.from(ft.template.steps.keys() as Iterable<string>).sort((a, b) =>
        a.localeCompare(b)
      );

      const items = [...providers.map((p) => `📊 ${p}`), ...steps.map((s) => `⚙️  ${s}`)];

      if (!ctx.hasUI) {
        return;
      }

      await ctx.ui.select(`Providers (${providers.length}) & Steps (${steps.length})`, items);
    },
  });
}
