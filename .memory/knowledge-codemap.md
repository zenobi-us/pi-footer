---
id: codemap00
title: codebase-codemap
created_at: 2026-02-11T20:40:51+10:30
updated_at: 2026-02-13T21:46:00+10:30
status: planning
area: codebase-structure
tags:
  - architecture
  - state-machine
learned_from:
  - source-tree
  - docs/extensions.md#events
---

# Codebase Codemap

## Overview

State-machine view of the `pi-footer` extension flow including `platform-quotas` invalidation.

## Details

```text
[Extension Loaded]
        |
        +--> src/index.ts
        |      [register commands + context modules]
        |
        +--> contrib/platform-quotas/index.ts
               [register usage providers + command + tracker strategies]

[session_start/session_switch]
        |
        +--> [Attach Footer]
        |       |
        |       v
        |   [Render Request] -> [Template.createContext] -> [Template.render] -> [Footer Output]
        |
        +--> [usageTracker.start/trigger(attach)]

[model_select | turn_start | tool_result | turn_end]
        |
        v
[usageTracker.trigger(reason)]
        |
        v
[usageTracker.store updated]
        |
        v
[pi.events.emit("pi-footer:invalidate")]
        |
        v
[src/index.ts listener -> requestRender()]
        |
        v
[Footer rerender]

[session_shutdown]
        |
        +--> [unsubscribe usage store listener + usageTracker.stop()]
        +--> [detach footer + clear requestRender]
```
