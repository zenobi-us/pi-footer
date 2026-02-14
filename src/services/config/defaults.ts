import type { UnresolvedTemplate } from './schema.ts';

/*
 * Default footer template used when consumers do not override `Config.template`.
 *
 * Main flow usage examples intentionally rely on built-in `src/context/*` providers:
 * - git.ts: `git_worktree_name`, `git_branch_name`
 * - model.ts: `model_provider`, `model_name`, `model_context_window`, `model_context_used`, `model_thinking_level`
 * - numbers.ts/model.ts transforms: `humanise_percent`, `context_used_color`, `thinking_level_icons`
 *
 * Colors:
 *  fg: "error" | "text" | "accent" | "border" | "borderAccent" | "borderMuted" | "success" | "warning" | "muted" |
 *      "dim" | "thinkingText" | "userMessageText" | "customMessageText" | "customMessageLabel" | "toolTitle" |
 *      "toolOutput" | "mdHeading" | "mdLink" | "mdLinkUrl" | "mdCode" | "mdCodeBlock" | "mdCodeBlockBorder" |
 *      "mdQuote" | "mdQuoteBorder" | "mdHr" | "mdListBullet" | "toolDiffAdded" | "toolDiffRemoved" | "toolDiffContext" |
 *      "syntaxComment" | "syntaxKeyword" | "syntaxFunction" | "syntaxVariable" | "syntaxString" | "syntaxNumber"
 *
 *  bg: "selectedBg" | "userMessageBg" | "customMessageBg" | "toolPendingBg" | "toolSuccessBg" | "toolErrorBg"
 *
 */
export const DEFAULT_TEMPLATE: UnresolvedTemplate = [
  ['{path | bg("accent") | fg("muted") }', '{git_branch_name | fg("accent")}'],
  [
    {
      items: [
        '↖️ {usage_tokens_write | humanise_number }',
        '↘️ {usage_tokens_read | humanise_number }',
        '{usage_cost_usd | humanise_currency }',
        '{usage_plan | fg("accent")}',
        '{model_context_used | humanise_percent(100) | context_used_color}/{model_context_window}',
      ],
    },
    {
      items: [
        "🧠 {model_thinking_level | thinking_level_icons('unicode')}",
        '{model_provider | fg("accent")}',
        '{model_name | fg("accent")}',
      ],
      // with emdot
      separator: ' · ',
      align: 'right',
    },
  ],
];
