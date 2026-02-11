import { FooterTemplate } from '../../types';

/*
 * Default footer template used when consumers do not override `Config.template`.
 *
 * Main flow usage examples intentionally rely on built-in `src/context/*` providers:
 * - git.ts: `git_worktree_name`, `git_branch_name`
 * - model.ts: `model_provider`, `model_name`, `model_context_window`, `model_context_used`, `model_thinking_level`
 * - numbers.ts/model.ts transforms: `humanise_percent`, `context_used_color`, `thinking_level_icons`
 */
export const DEFAULT_TEMPLATE: FooterTemplate = [
  [
    '{path | fg("muted")}',
    '{git_branch_name | fg("accent")}',
    '{"words" | fg("error")}',
    {
      items: [
        "🧠 {model_thinking_level | thinking_level_icons('unicode')}",
        '{model_provider | fg("accent")}',
        '{model_name | fg("accent")}',
        '{model_context_window}',
        '{model_context_used | humanise_percent(100) | context_used_color}',
      ],
      // with emdot
      separator: ' · ',
      align: 'right',
    },
  ],
];
