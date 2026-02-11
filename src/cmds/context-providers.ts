import type { ExtensionAPI } from '@mariozechner/pi-coding-agent';
import type { FooterInstance } from '../types.ts';

/*
 * Register `/context-providers` command that lists current provider/transform keys.
 */
export function registerContextProvidersCommand(pi: ExtensionAPI, footer: FooterInstance): void {
  pi.registerCommand('context-providers', {
    description: 'List registered footer context providers and pipeline transforms',
    handler: async (_args, ctx) => {
      const ft = footer as FooterInstance & {
        template: { providers: Map<string, unknown>; transforms: Map<string, unknown> };
      };

      const providers = Array.from(ft.template.providers.keys()).sort((a, b) => a.localeCompare(b));
      const transforms = Array.from(ft.template.transforms.keys()).sort((a, b) =>
        a.localeCompare(b)
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
