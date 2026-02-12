/* eslint-disable no-unused-vars */
import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import type { PipelineTransform } from './core/pipeline';
import { Template } from './services/config/schema';

export type FooterContextValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | null
  | undefined;
//
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

export type ContextValueProvider = (
  ...args: [FooterContextState]
) => FooterContextValue | FooterContextValue[];

export interface FooterInstance {
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

  /*
   * Register a provider available as `{name}` inside footer templates.
   */
  registerContextValue: (...args: [string, ContextValueProvider]) => void;

  /*
   * Register a transform available as `{provider | transformName(...)}`.
   */
  registerContextTransform: (...args: [string, PipelineTransform]) => void;
}
