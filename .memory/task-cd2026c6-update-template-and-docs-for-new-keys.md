---
id: cd2026c6
title: Update template and docs for new keys
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T21:56:57+10:30
status: completed
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: 2243019232301634
---

# Update template and docs for new keys

## Objective
Provide a parity-oriented template example and align docs with all newly added providers.

## Related Story
N/A

## Steps
1. Add/refresh README example snippets using `path`, usage token providers, and context token providers.
2. Decide whether default template changes or example-only approach is preferred.
3. Verify examples only reference implemented providers.
4. Run build/lint checks.

## Expected Outcome
Docs and template guidance are coherent and production-safe.

## Actual Outcome
Updated `README.md` parity examples to include all new keys used in this cleanup epic, including `model_thinking_mode` alongside `path`, `model_context_used_tokens`, `usage_tokens_read`, `usage_tokens_write`, `usage_cost_usd`, and `usage_plan`. Kept the runtime default template unchanged for backwards compatibility and verified with `mise run lint` (pass), `mise run build` (pass), and `mise run test` (fails because the repository currently has no test files).

## Lessons Learned
A safe way to introduce new footer keys is to expand override examples first while keeping the shipped default template stable. Verification should call out when test runners fail due to missing tests so it is tracked as a repo hygiene gap, not mistaken for a regression.
