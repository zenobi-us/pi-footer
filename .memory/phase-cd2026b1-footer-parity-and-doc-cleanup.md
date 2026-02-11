---
id: cd2026b1
title: Footer parity and doc cleanup
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T20:49:00+10:30
status: todo
epic_id: cd2026a1
start_criteria: Epic approved and task files created.
end_criteria: All linked tasks completed, verified, and documented.
---

# Footer parity and doc cleanup

## Overview
Define and execute the concrete work needed to align extension footer capabilities with expected pi-mono footer elements, while removing outdated README claims.

## Deliverables
- Cleaned README provider documentation.
- New/updated provider implementations for path, context token usage, usage tokens, and cost.
- Best-effort providers for thinking mode and usage plan.
- Updated default/example template usage documentation.

## Tasks
- [task-cd2026c1-remove-stale-usage-readme-claims](./task-cd2026c1-remove-stale-usage-readme-claims.md)
- [task-cd2026c2-add-path-context-provider](./task-cd2026c2-add-path-context-provider.md)
- [task-cd2026c3-add-model-context-used-tokens-provider](./task-cd2026c3-add-model-context-used-tokens-provider.md)
- [task-cd2026c4-add-usage-tokens-and-cost-providers](./task-cd2026c4-add-usage-tokens-and-cost-providers.md)
- [task-cd2026c5-add-thinking-mode-and-usage-plan-provider](./task-cd2026c5-add-thinking-mode-and-usage-plan-provider.md)
- [task-cd2026c6-update-template-and-docs-for-new-keys](./task-cd2026c6-update-template-and-docs-for-new-keys.md)

## Dependencies
- Completion order: c1 -> c2/c3 -> c4/c5 -> c6.

## Next Steps
- Execute tasks in order and validate with `/context-providers` plus build/lint commands.
