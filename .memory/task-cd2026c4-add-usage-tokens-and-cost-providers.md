---
id: cd2026c4
title: Add usage tokens and cost providers
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T21:45:47+10:30
status: completed
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
Added `usage_tokens_read`, `usage_tokens_write`, and `usage_cost_usd` providers in `src/context/model.ts`.

- `usage_tokens_read` returns latest non-aborted assistant `input + cacheRead` (fallback `0`).
- `usage_tokens_write` returns latest non-aborted assistant `output + cacheWrite` (fallback `0`).
- `usage_cost_usd` returns cumulative branch/session assistant cost in USD, preferring `usage.cost.total` and falling back to model-rate estimation (`tokens * price_per_million / 1_000_000`) when direct totals are unavailable.

## Lessons Learned
Treating all usage/cost inputs as untrusted runtime values and normalizing to finite non-negative numbers keeps provider output stable without template-time guardrails.
