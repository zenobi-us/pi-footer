import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import { registerContextProvidersCommand } from './cmds/context-providers.ts';
import { registerPipelineDebugCommand } from './cmds/pipeline-debug.ts';
import { Footer } from './footer.ts';
import { Config } from './services/config';
import './context/colors.ts';
import './context/cwd.ts';
import './context/git.ts';
import './context/model.ts';
import './context/numbers.ts';
import './context/time.ts';

export { Footer };

/*
 * Purpose:
 * Main extension entrypoint that wires commands, providers/transforms, and footer lifecycle.
 *
 * Inputs:
 * - `pi`: extension API runtime
 *
 * Side effects:
 * - Registers commands
 * - Subscribes to session lifecycle events
 * - Attaches/removes footer renderer
 *
 * State machine (main flow + built-in `src/context/*` providers):
 *
 * ```mermaid
 * stateDiagram-v2
 *   [*] --> ExtensionLoaded
 *   ExtensionLoaded --> SessionStart: pi.on('session_start')
 *   ExtensionLoaded --> SessionSwitch: pi.on('session_switch')
 *   SessionStart --> FooterAttached
 *   SessionSwitch --> FooterAttached
 *
 *   state FooterAttached {
 *     [*] --> BuildContext
 *     BuildContext --> ResolveProviders: Template.createContext()
 *     ResolveProviders --> CwdProvider: cwd.ts
 *     ResolveProviders --> TimeProvider: time.ts
 *     ResolveProviders --> ModelProviders: model.ts
 *     ResolveProviders --> GitProviders: git.ts
 *     ResolveProviders --> RenderTemplate: Footer.render()
 *     RenderTemplate --> ParseOrCache: Template.compile()
 *     ParseOrCache --> RunPipelines: Pipeline.run()
 *     RunPipelines --> ApplyTransforms: numbers/colors/model/git transforms
 *     ApplyTransforms --> LineLayout: left/right + separator + width
 *     LineLayout --> EmitLines
 *   }
 *
 *   FooterAttached --> FooterInvalidate: branch change / explicit invalidate
 *   FooterInvalidate --> BuildContext
 *   FooterAttached --> SessionShutdown: pi.on('session_shutdown')
 *   SessionShutdown --> [*]
 * ```
 */
export default function piFooterExtension(pi: ExtensionAPI): void {
  /* Register interactive inspection/debug commands for the footer runtime. */
  registerContextProvidersCommand(pi, Footer);
  registerPipelineDebugCommand(pi, Footer);

  /* Attach footer rendering lifecycle to a specific session context. */
  const attach = (ctx: ExtensionContext): void => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsubscribeBranch = footerData.onBranchChange(() => tui.requestRender());

      return {
        /* Cleanup branch listener when footer instance is disposed. */
        dispose() {
          unsubscribeBranch();
        },

        /* Request a fresh render for external invalidation triggers. */
        invalidate() {
          tui.requestRender();
        },

        /* Render current configured footer template for the active width. */
        render(width: number) {
          return Footer.render(pi, ctx, theme, width, {
            template: Config.template,
          });
        },
      };
    });
  };

  /* Initialize footer whenever a new session starts. */
  pi.on('session_start', async (_event, ctx) => {
    attach(ctx);
  });

  /* Re-attach footer when user switches sessions/branches in the UI. */
  pi.on('session_switch', async (_event, ctx) => {
    attach(ctx);
  });

  /* Remove footer integration during session shutdown. */
  pi.on('session_shutdown', async (_event, ctx) => {
    ctx.ui.setFooter(undefined);
  });
}
