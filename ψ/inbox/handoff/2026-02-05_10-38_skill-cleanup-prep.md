# Handoff: Skill Cleanup Prep

**Date**: 2026-02-05 10:38
**Context**: Post /learn, /trace, /rrr fixes - ready to clean up skills

## What We Did

This session (v1.5.55 → v1.5.63):

1. **Fixed /learn subagent bug** - Subagents were writing to wrong location (inside origin/ symlink)
   - Key fix: Pass literal absolute paths, not variables
   - Added date folders + time-prefixed files (YYYY-MM-DD/HHMM_*.md)

2. **Aligned /trace** with /learn structure
   - Removed broken symlink creation
   - Added `--repo [path|url]` flag
   - Trace logs to `ψ/memory/traces/YYYY-MM-DD/HHMM_*.md`

3. **Added /rrr --deep** with 5 parallel agents
   - Git deep dive, file changes, timeline, patterns, Oracle memory

4. **Discovered skill frontmatter options**
   - `user-invocable: false` - hides from `/` menu
   - `disable-model-invocation: true` - prevents Claude auto-invoke

## Pending

- [ ] Document skill visibility frontmatter in /skill-creator
- [ ] Add frontmatter reference to MEMORY.md
- [ ] Test /learn --deep on another repo

## Next Session: Skill Cleanup

User requested: "next session we will cleanup some our skills!"

- [ ] Review all 27 skills for consistency
- [ ] Apply date/time folder patterns where applicable
- [ ] Add `user-invocable: false` to background-only skills
- [ ] Update skill descriptions for better trigger words
- [ ] Consider consolidating similar skills

## Key Files

- `src/skills/learn/SKILL.md` - Reference for date/time structure
- `src/skills/trace/SKILL.md` - Reference for --repo flag pattern
- `src/skills/rrr/SKILL.md` - Reference for --deep mode
- `ψ/memory/learnings/2026-02-05_subagent-path-handling-pattern.md` - Key pattern

## Skills to Review

```
awaken, birth, deep-research, feel, forward, fyi, gemini,
learn, merged, oracle-family-scan, oracle-soul-sync-calibrate-update,
philosophy, physical, project, ralph-loop-soulbrews, recap,
retrospective, rrr, schedule, skill-creator, speak, standup,
trace, watch, where-we-are, who-we-are, worktree
```
