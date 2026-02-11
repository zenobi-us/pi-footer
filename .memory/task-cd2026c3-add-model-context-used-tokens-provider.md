---
id: cd2026c3
title: Add model context used tokens provider
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T21:38:18+10:30
status: completed
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: 2243019232301634
---

# Add model context used tokens provider

## Objective
Expose raw token usage value as `{model_context_used_tokens}`.

## Related Story
N/A

## Steps
1. Update `src/context/model.ts` with new provider.
2. Prefer `ctx.getContextUsage()?.usageTokens` where available.
3. Fallback to existing branch scan token computation.
4. Confirm provider renders numeric values and safe fallback when unavailable.

## Expected Outcome
Users can render `11.7k` style left-hand value with transforms.

## Actual Outcome
Added `{model_context_used_tokens}` provider in `src/context/model.ts` and registered it alongside existing model providers. Token resolution now prefers `ctx.getContextUsage()?.usageTokens` and falls back to assistant-branch aggregation, keeping safe numeric fallback (`0`) when unavailable.

## Lessons Learned
Using one shared `getUsedTokens()` helper for both percentage and raw-token providers keeps behavior consistent and avoids duplicated fallback logic.
