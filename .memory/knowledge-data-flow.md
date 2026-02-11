---
id: dataflow0
title: footer-data-flow
created_at: 2026-02-11T20:40:51+10:30
updated_at: 2026-02-11T20:40:51+10:30
status: planning
area: data-flow
tags:
  - architecture
  - data-flow
learned_from:
  - src/index.ts
  - src/footer.ts
  - src/core/template.ts
  - src/core/pipeline.ts
---

# Data Flow

## Overview

How runtime state turns into rendered footer lines.

## Details

```text
PI Runtime State
   |
   v
Context Providers ------------------------------+
(cwd/time/git/model/...)                        |
   | raw values                                 |
   v                                            |
Template Context { rawData, data }              |
   |                                            |
   v                                            |
Template String Segments                        |
   |                                            |
   v                                            |
Pipeline Transform Chain (0..n transforms)      |
   |                                            |
   v                                            |
Rendered Segments ------------------------------+
   |
   v
Line Layout (left/right/flex + separators)
   |
   v
Width Truncation
   |
   v
Footer Lines to TUI
```
