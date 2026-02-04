---
name: forward
description: Create handoff + enter plan mode for next session. Use when user says "forward", "handoff", "wrap up", or before ending session.
---

# /forward - Handoff to Next Session

Create context for next session, then enter plan mode to define next steps.

## Usage

```
/forward              # Create handoff + enter plan mode (default)
/forward --only       # Create handoff only, skip plan mode
```

## Steps

1. **Git status**: Check uncommitted work
2. **Session summary**: What we did (from memory)
3. **Pending items**: What's left
4. **Next steps**: Specific actions

## Output

Write to: `ψ/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`

```markdown
# Handoff: [Session Focus]

**Date**: YYYY-MM-DD HH:MM
**Context**: [%]

## What We Did
- [Accomplishment 1]
- [Accomplishment 2]

## Pending
- [ ] Item 1
- [ ] Item 2

## Next Session
- [ ] Specific action 1
- [ ] Specific action 2

## Key Files
- [Important file 1]
- [Important file 2]
```

## Then

After creating handoff:
1. Commit: `git add -A && git commit -m "handoff: [slug]"`
2. Push: `git push origin main`
3. **Enter plan mode** for next session planning

## Auto Plan Mode

**IMPORTANT**: After commit & push, automatically enter plan mode:

1. Use the `EnterPlanMode` tool
2. In plan mode, create a plan that:
   - References the handoff file just created
   - Lists pending tasks from handoff
   - Defines next session scope

**Plan should include:**
```markdown
# Plan: [Next Session Focus]

## Background
[Summary from handoff: What We Did]

## Pending from Last Session
[Copy Pending items from handoff]

## Next Session Goals
[Copy Next Session items from handoff]

## Reference
- Handoff: ψ/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md
```

3. After plan is approved → Ready for `/compact` then `/clear`

## Skip Plan Mode

If user says `/forward --only` or context is very low:
- Skip plan mode
- Just tell user: "💡 Run /plan to plan next session"

ARGUMENTS: $ARGUMENTS
