---
installer: oracle-skills-cli v1.5.8
name: forward
description: v1.5.8 L-SKLL | Create handoff for next session. Use when user says "forward", "handoff", "wrap up", or before ending session.
---

# /forward - Handoff to Next Session

Create context for next session before /clear.

## Usage

```
/forward              # Create handoff file
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
3. Ready for `/clear`

ARGUMENTS: $ARGUMENTS
