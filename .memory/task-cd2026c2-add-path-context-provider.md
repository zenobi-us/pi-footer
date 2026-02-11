---
id: cd2026c2
title: Add path context provider
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T21:36:00+10:30
status: completed
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: 2243019232301634
---

# Add path context provider

## Objective
Expose full current working directory path as `{path}` while keeping `{cwd}` behavior unchanged.

## Related Story
N/A

## Steps
1. Update `src/context/cwd.ts`.
2. Register new provider key `path` returning `props.ctx.cwd`.
3. Keep existing `cwd` provider unchanged.
4. Verify `/context-providers` includes `path`.

## Expected Outcome
Templates can render full path via `{path}`.

## Actual Outcome
Added `path` provider registration in `src/context/cwd.ts` returning `props.ctx.cwd` while preserving existing `cwd` basename behavior unchanged. Verified provider registry now includes both `path` and `cwd`.

## Lessons Learned
Co-locating closely related providers (`path` + `cwd`) in one context module keeps semantics explicit and avoids changing existing template behavior.
