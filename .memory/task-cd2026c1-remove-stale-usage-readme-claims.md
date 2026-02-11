---
id: cd2026c1
title: Remove stale usage README claims
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T20:49:00+10:30
status: todo
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: 2243019232301634
---

# Remove stale usage README claims

## Objective
Remove provider documentation entries that are currently not implemented in the codebase.

## Related Story
N/A

## Steps
1. Edit `README.md` built-in provider list.
2. Remove `usage_*` and `{anthropic_*}`, `{copilot_*}`, `{codex_*}` claims.
3. Ensure listed keys map to actual providers registered in `src/context/*`.
4. Verify docs remain internally consistent.

## Expected Outcome
README provider docs accurately match implemented providers.

## Actual Outcome
Pending.

## Lessons Learned
Pending.
