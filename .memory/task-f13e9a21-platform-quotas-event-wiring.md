---
id: f13e9a21
title: platform-quotas-event-wiring
created_at: 2026-02-13T21:45:00+10:30
updated_at: 2026-02-13T22:02:00+10:30
status: completed
epic_id: cd2026a1
phase_id: cd2026b1
assigned_to: sess-20260213-2125-qtevents
---

# platform-quotas-event-wiring

## Objective
Implement load/unload and refresh wiring for `contrib/platform-quotas/index.ts` using pi lifecycle/agent/model/tool events, and identify missing pi-footer custom events.

## Steps
1. Analyze existing `src/` and `contrib/platform-quotas/` structure with codemap.
2. Review extension event lifecycle docs (`docs/extensions.md#events`).
3. Implement event subscriptions for start/switch/model/turn/tool/shutdown.
4. Add footer invalidation bridge for quota-store updates.
5. Validate with lint/typecheck.

## Expected Outcome
Platform quotas refreshes at useful lifecycle points and footer re-renders when usage state changes.

## Actual Outcome
Implemented event-driven load/unload in `contrib/platform-quotas/index.ts` (session start/switch/shutdown + model/turn/tool refresh), converted usage context to register/unregister API in `contrib/platform-quotas/context/usage.ts`, added footer invalidation listener in `src/index.ts`, and exposed unregister APIs on `Footer` in `src/types.ts` + `src/footer.ts`; lint/typecheck passed.

## Lessons Learned
A small shared event (`pi.events`) bridge avoids hard coupling between extensions and the footer rendering runtime.
