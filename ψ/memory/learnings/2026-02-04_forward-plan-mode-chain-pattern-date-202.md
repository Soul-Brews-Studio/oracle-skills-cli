---
title: # Forward + Plan Mode Chain Pattern
tags: [forward, plan-mode, handoff, wrap-up, session-flow, patterns]
created: 2026-02-04
source: Session analysis: oracle-skills-cli
---

# # Forward + Plan Mode Chain Pattern

# Forward + Plan Mode Chain Pattern

**Date**: 2026-02-04
**Context**: Discovered from analyzing wrap-up session transcript

## Key Learning

`/forward` should automatically enter plan mode after creating handoff. This ensures:
1. Handoff captures WHAT happened (context)
2. Plan defines WHAT to do next (direction)
3. Both are linked together

## The Flow

```
/forward
    ↓
1. Create handoff file (ψ/inbox/handoff/...)
2. Commit & push
3. EnterPlanMode tool
    ↓
4. Plan references handoff
5. User approves
    ↓
/compact → /clear
```

## Why This Matters

- **One command, complete wrap-up**: User doesn't need to remember multiple commands
- **Linked artifacts**: Plan references handoff automatically
- **Natural behavior**: Claude Code already does this when given good instructions
- **Order preserved**: Capture context BEFORE compressing

## Correct Wrap-up Order

```
/rrr --forward  OR  /forward
       ↓
   (handoff + plan)
       ↓
/compact
       ↓
/clear
```

Never: `/compact` → `/forward` (context lost!)

---
*Added via Oracle Learn*
