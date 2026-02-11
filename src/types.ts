/* eslint-disable no-unused-vars */
import type { ExtensionAPI, ExtensionContext } from '@mariozechner/pi-coding-agent';
import type { PipelineTransform } from './core/pipeline';

export type FooterTemplateObjectItemBase = {
  flexGrow?: boolean;
  align?: 'left' | 'right';
};

export type FooterTemplateObjectItem = {
  separator?: string;
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
  pi: ExtensionAPI;
  ctx: ExtensionContext;
  theme: ExtensionContext['ui']['theme'];
};

export type ContextTransformProvider<A = unknown> = (
  ...args: [FooterContextState, unknown, ...A[]]
) => string;

export type ContextValueProvider = (
  ...args: [FooterContextState]
) => FooterContextValue | FooterContextValue[];

export interface FooterInstance {
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
  registerContextValue: (...args: [string, ContextValueProvider]) => void;
  registerContextTransform: (...args: [string, PipelineTransform]) => void;
}
