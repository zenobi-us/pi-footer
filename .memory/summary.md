# Project Summary

## Current Epic
- `epic-cd2026a1-cleanup-and-distribute.md`

## Active Phase
- `phase-cd2026b1-footer-parity-and-doc-cleanup.md`

## Latest Work
- Implemented platform-quotas lifecycle/event wiring in `contrib/platform-quotas/index.ts`.
- Added explicit usage context load/unload hooks in `contrib/platform-quotas/context/usage.ts`.
- Exposed `Footer.unregisterContextValue` / `Footer.unregisterContextTransform` in `src/footer.ts` + `src/types.ts`.
- Added inter-extension invalidate event handling in `src/index.ts` via `pi.events`.
- Analyzed extension lifecycle/tool/model events from pi extension docs and mapped required footer/quota event flows.

## Next Milestones
- Decide and standardize a typed event catalog for pi-footer custom events.
- Add optional provider/config change events if dynamic registration becomes a supported runtime path.
