/* eslint-disable no-unused-vars */
import type {
  ExtensionAPI,
  ExtensionCommandContext,
  ExtensionContext,
} from '@mariozechner/pi-coding-agent';
import type { PipelineTransform } from './core/pipeline.ts';
import type { Template, TemplateItem } from './services/config/schema.ts';
import { TemplateService } from './core/template.ts';
import { EventService } from './core/events.ts';

export type FooterTemplate = Template;
export type FooterTemplateObjectItem = TemplateItem;

export type FooterContextState = {
  /*
   * Global extension API for runtime integrations (events, commands, settings).
   */
  pi: ExtensionAPI;

  /*
   * Active session context containing cwd, model, UI, and branch state.
   */
  ctx: ExtensionContext;

  /*
   * Resolved theme used by transforms for color/styling output.
   */
  theme: ExtensionContext['ui']['theme'];
};

export type ContextTransformProvider<A = unknown> = (
  ...args: [FooterContextState, unknown, ...A[]]
) => string;

export type ContextValueProvider<T = unknown> = (...args: [FooterContextState]) => T | T[];

export interface FooterInstance {
  template: TemplateService;

  events: EventService;

  subCommands: Map<
    string,
    { description: string; callback: (args: string[], ctx: ExtensionCommandContext) => void }
  >;

  /*
   * Render the configured footer template into one or more fixed-width lines.
   */
  render: (
    ...args: [
      ExtensionAPI,
      ExtensionContext,
      ExtensionContext['ui']['theme'],
      number,
      {
        template?: Template;
      },
    ]
  ) => string[];

  registerSubCommand: (
    name: string,
    description: string,
    cmd: (args: string[], ctx: ExtensionCommandContext) => Promise<void> | void
  ) => void;

  /*
   * Register a provider available as `{name}` inside footer templates.
   */
  registerContextValue: <T>(...args: [string, ContextValueProvider<T>]) => () => void;

  /*
   * Unregister a provider previously added via `registerContextValue`.
   * optional, since you can use the returned unregister function from `registerContextValue` instead for more granular cleanup.
   */
  unregisterContextValue: (...args: [string]) => void;

  /*
   * Register a transform available as `{provider | transformName(...)}`.
   */
  registerContextTransform: (...args: [string, PipelineTransform]) => () => void;

  /*
   * Unregister a transform previously added via `registerContextTransform`.
   * optional, since you can use the returned unregister function from `registerContextTransform` instead for more granular cleanup.
   */
  unregisterContextTransform: (...args: [string]) => void;
}
