# pi-footer extension

Composable footer for `pi` with provider-driven data and a compiled pipeline renderer.

## What this extension provides

- Global `Footer` registry
- Context **providers** (data sources)
- Pipeline **steps** (transform/color/format stages)
- Template-based layout with left/right alignment + flex growth
- Built-in providers for model, git, cwd, time, and usage trackers
- Debug command for inspecting pipeline execution

---

## Architecture (provider → step → step)

Each `{ ... }` expression in a template is compiled into a pipeline.

Example:

```txt
{ model_context_used | humanise_percent | context_used_color }
```

Execution flow:

1. `model_context_used` provider resolves raw value (e.g. `64`)
2. `humanise_percent` step updates text to `"64%"`
3. `context_used_color` step applies theme color based on numeric value
4. Pipeline returns final text

Pipelines are parsed once (cached by template string) and executed each render.

---

## Template syntax

### Basic

```txt
{provider_key}
{provider_key | step_one | step_two('arg')}
```

### Chained steps

```txt
{model_context_used | humanise_percent | context_used_color}
```

### Args: literal vs context reference

- **Quoted args** are literals:
  - `fg('accent')` → literal string `accent`
- **Unquoted args** are context refs:
  - `clamp(0, model_context_window)`

If an unquoted ref key does not exist, it falls back to the raw token string.

---

## Built-in providers

### Core

- `{time}` – current local time
- `{cwd}` – current directory name
- `{model_name}` – active model id
- `{model_provider}` – active model provider
- `{model_context_used}` – context usage as number `0..100`
- `{model_context_window}` – context window (e.g. `200k`)
- `{model_thinking_level}` – current thinking level

### Git

- `{git_branch_name}`
- `{git_worktree_name}`
- `{git_status}` (structured object)
- `{recent_commits}` (structured object)

### Usage tracking

From tracker integration (auto-detected + per-platform), including:

- `{usage_emoji}`
- `{usage_platform}`
- `{usage_quota_remaining}`
- `{usage_quota_percent_used}`
- `{anthropic_*}`, `{copilot_*}`, `{codex_*}` variants

---

## Built-in pipeline steps

- `humanise_time`
- `humanise_percent` (alias: `humanise_percentage`)
- `humanise_amount`
- `humanise_number`
- `round(n)`
- `clamp(min,max)`
- `fg('themeColor')`
- `bg('themeColor')`
- `thinking_level_icons('ascii' | 'unicode')`
- `git_status_icons('ascii' | 'unicode')`
- `context_used_color` (alias: `model_context_colors`)

`context_used_color` thresholds:

- `< 50` → success
- `50..79` → warning
- `>= 80` → error

---

## Template layout config

Set in `services/config/defaults.ts` or override via `Config.template`.

Example:

```ts
Config.template = [
  [
    { items: ["[{git_worktree_name}:{git_branch_name}]"] },
    {
      items: [
        "{model_provider}.{model_name} [{model_context_window}:{model_context_used | humanise_percent | context_used_color}]",
      ],
      align: "right",
    },
  ],
];
```

Supported object item fields:

- `items: (string | FooterTemplateObjectItem)[]`
- `separator?: string`
- `align?: 'left' | 'right'`
- `flexGrow?: boolean`

---

## Extension API usage

```ts
import piFooterExtension, { Footer } from "./pi-footer/index.ts";

export default function (pi) {
  piFooterExtension(pi);

  // Add provider
  Footer.registerContextValue("custom_value", ({ ctx }) => ctx.cwd.length);

  // Add pipeline step
  Footer.registerStep("custom_format", (state) => ({
    ...state,
    text: `len=${state.value}`,
  }));
}
```

---

## Commands

- `/usage-store` – list usage tracker entries
- `/context-providers` – list registered providers + steps
- `/pipeline-debug {expr}` – inspect pipeline transform history

Example:

```txt
/pipeline-debug {model_context_used | humanise_percent | context_used_color}
```
