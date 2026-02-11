---
id: cd2026c4
title: Add usage tokens and cost providers
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T20:49:00+10:30
status: todo
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: 2243019232301634
---

# Add usage tokens and cost providers

## Objective
Implement usage-oriented providers for read tokens, write tokens, and session cost.

## Related Story
N/A

## Steps
1. Add provider `usage_tokens_read`.
2. Add provider `usage_tokens_write`.
3. Add provider `usage_cost_usd`.
4. Compute from assistant usage + model token pricing where possible.
5. Define and document safe fallback behavior for missing usage/cost metadata.

## Expected Outcome
Footer can display `R...`, `W...`, and `$...` style usage info.

## Actual Outcome
Pending.

## Lessons Learned
Pending.
