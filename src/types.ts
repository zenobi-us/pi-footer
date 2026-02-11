import type {
  ExtensionAPI,
  ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import type { PipelineStep } from "./core/pipeline";

export type FooterTemplateObjectItemBase = {
  flexGrow?: boolean;
  align?: "left" | "right";
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
  theme: ExtensionContext["ui"]["theme"];
};

/**
 * @deprecated Use PipelineStep from core/pipeline.ts instead.
 * Kept for backwards compatibility with legacy filter registration.
 */
export type ContextFilterProvider<A = any> = (
  state: FooterContextState,
  value: unknown,
  ...args: A[]
) => string;

export type ContextValueProvider = (
  state: FooterContextState,
) => FooterContextValue | FooterContextValue[];

export interface FooterInstance {
  render(
    pi: ExtensionAPI,
    ctx: ExtensionContext,
    theme: ExtensionContext["ui"]["theme"],
    width: number,
    options: {
      template?: FooterTemplate;
    },
  ): string[];
  registerContextValue(name: string, provider: ContextValueProvider): void;
  /** Register a native pipeline step. */
  registerStep(name: string, step: PipelineStep): void;
  /** @deprecated Use registerStep. Registers a legacy filter, auto-wrapped as a PipelineStep. */
  registerContextFilter(name: string, filter: ContextFilterProvider): void;
}
