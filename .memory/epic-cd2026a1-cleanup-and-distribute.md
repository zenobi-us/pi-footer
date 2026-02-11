---
id: cd2026a1
title: Cleanup and distribute
created_at: 2026-02-11T20:49:00+10:30
updated_at: 2026-02-11T22:00:27+10:30
status: completed
---

# Cleanup and distribute

## Vision/Goal
Bring this extension to parity with the expected pi-mono footer surface by cleaning up incorrect docs and distributing footer data through explicit, stable context providers.

## Success Criteria
- README only documents providers and transforms that actually exist.
- A full-path provider (`path`) exists alongside `cwd`.
- Missing high-value providers are implemented for context tokens, usage tokens, and cost.
- Placeholder-equivalent providers are added for thinking mode and usage plan with explicit fallback behavior.
- Footer template examples show how to compose the new providers.

## Phases
- [phase-cd2026b1-footer-parity-and-doc-cleanup](./phase-cd2026b1-footer-parity-and-doc-cleanup.md)

## Dependencies
- Access to `ExtensionContext` runtime fields available in current pi SDK version.
- Agreement on fallback semantics (`-` vs empty string vs null) for unavailable values.

## Closeout
- Epic delivery complete; all planned phase/task work is finished and marked completed.
