/* eslint-disable no-unused-vars */
import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import type { PipelineTransform } from './core/pipeline';

export type FooterTemplateObjectItemBase = {
  /*
   * When true, this item participates in right-side trailing layout.
   * Useful for keeping one area flexible while preserving fixed leading text.
   */
  flexGrow?: boolean;

  /*
   * Horizontal alignment bucket used by the line renderer.
   * `left` items are rendered before spacer padding, `right` items after.
   */
  align?: 'left' | 'right';
};

export type FooterTemplateObjectItem = {
  /*
   * Optional separator inserted between rendered `items` children.
   * Falls back to the row-level separator when omitted.
   */
  separator?: string;

  /*
   * Nested template fragments rendered and joined for this item.
   * Each entry may be raw template text or another structured item.
   */
  items: (string | FooterTemplateObjectItem)[];
} & FooterTemplateObjectItemBase;

export type FooterTemplate = (
  | string
  | FooterTemplateObjectItem
  | (string | FooterTemplateObjectItem)[]
)[];

export type FooterContextValue =
  | string
  | number
  | boolean
  | Record<string, unknown>
  | null
  | undefined;

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
        template?: FooterTemplate;
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
