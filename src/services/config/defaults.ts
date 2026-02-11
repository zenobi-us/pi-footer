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
    { items: ['[{git_worktree_name}:{git_branch_name}]'] },
    {
      items: [
        '{model_provider}.{model_name} [{model_context_window}:{model_context_used | humanise_percent | context_used_color}]',
      ],
      align: 'right',
    },
  ],
  [
    {
      items: ["🧠 {model_thinking_level | thinking_level_icons('ascii')}"],
      align: 'right',
    },
  ],
];
