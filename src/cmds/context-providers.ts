import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import type { FooterInstance } from '../types.ts';

export function registerContextProvidersCommand(pi: ExtensionAPI, footer: FooterInstance): void {
  pi.registerCommand('context-providers', {
    description: 'List registered footer context providers and pipeline transforms',
    handler: async (_args, ctx) => {
      const ft = footer as FooterInstance & { template: any };
      const providers = Array.from(ft.template.providers.keys() as Iterable<string>).sort((a, b) =>
        a.localeCompare(b)
      );
      const transforms = Array.from(ft.template.transforms.keys() as Iterable<string>).sort(
        (a, b) => a.localeCompare(b)
      );

      const items = [...providers.map((p) => `📊 ${p}`), ...transforms.map((s) => `⚙️  ${s}`)];

      if (!ctx.hasUI) {
        return;
      }

      await ctx.ui.select(
        `Providers (${providers.length}) & Transforms (${transforms.length})`,
        items
      );
    },
  });
}
