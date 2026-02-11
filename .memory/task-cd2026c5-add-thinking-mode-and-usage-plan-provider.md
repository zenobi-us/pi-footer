---
id: cd2026c5
title: Add thinking mode and usage plan provider
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T20:49:00+10:30
status: todo
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: 2243019232301634
---

# Add thinking mode and usage plan provider

## Objective
Add best-effort providers for mode/plan equivalents used by default pi footer.

## Related Story
N/A

## Steps
1. Implement `model_thinking_mode` provider.
2. Implement `usage_plan` provider.
3. Return explicit fallback (`'-'`) when not discoverable from runtime context.
4. Document caveats in README.

## Expected Outcome
Templates can reference mode/plan keys without runtime errors.

## Actual Outcome
Pending.

## Lessons Learned
Pending.
