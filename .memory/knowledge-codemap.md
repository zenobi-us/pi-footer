---
id: codemap00
title: codebase-codemap
created_at: 2026-02-11T20:40:51+10:30
updated_at: 2026-02-11T20:40:51+10:30
status: planning
area: codebase-structure
tags:
  - architecture
  - state-machine
learned_from:
  - source-tree
---

# Codebase Codemap

## Overview

State-machine view of the pi-footer extension flow.

## Details

```text
[Extension Loaded]
        |
        v
[Register Commands + Context Modules]
        |
        v
[Session Event]
  | session_start/session_switch
  v
[Attach Footer]
        |
        v
[Render Request]
        |
        v
[Template.createContext]
  |-> providers: cwd,time,git,model,colors,numbers
        |
        v
[Template.render]
        |
        v
[Pipeline.run transforms]
        |
        v
[Line Compose + Truncate]
        |
        v
[Footer Output]

[session_shutdown] ---> [Detach Footer]
```
