# RRR Retrospective Template

Use this complete structure for every `/rrr` mode. Keep sections concise for small
sessions, but do not omit required reflection or verification sections.

```markdown
# Session Retrospective

**Session Date**: YYYY-MM-DD
**Start / End**: HH:MM–HH:MM GMT+7
**Duration**: ~X minutes
**Primary Focus**: <brief description>
**Session Type**: Feature Development | Bug Fix | Research | Refactoring | Maintenance
**Repository / Branch**: <repo> / <branch>
**Current Issue**: #N or none
**Current PR**: #N or none
**Session**: <host session ID or unknown>
**Evidence Source**: live-session | Claude adapter | Codex adapter | git-commit-times | unknown

## Session Summary

<Two or three sentences describing the goal, outcome, and current state.>

## Timeline

<Real `HH:MM` (GMT+7) rows. Times come from session mining (`--bg`/`--combo`) or, in
any mode including `--fg`, from verified git commit timestamps. Only fall back to ordered
untimed bullets when no timestamped evidence exists at all. Never estimate times.>

- HH:MM — <event> (`<commit>`)

## Technical Details

### Files Modified

<Files grouped by purpose, including uncommitted changes.>

### Key Code Changes

<What changed and why. Name important symbols or modules.>

### Architecture Decisions

<Decision, alternatives considered, rationale, and consequence. Write `none` when the
session made no architectural decision.>

## 📝 AI Diary

<At least 150 words in first person. Cover the initial understanding, assumptions, how
the approach evolved, confusion or clarity, surprises, and important decisions. Include
one `[→ AGENT DECISION]` line naming a decision the agent made wrong.>

## What Went Well

<Concrete successes with evidence. Do not use vague progress claims.>

## What Could Improve

<Specific changes that would make a similar session more effective.>

## Blockers & Resolutions

<For each blocker: symptom, evidence, attempts, resolution, and remaining risk. Write
`none` only when genuinely absent.>

## 💭 Honest Feedback

<At least 100 words. Give exactly three session-specific friction points covering process,
tools, communication, or scope. Keep generalizable rules for Lessons Learned.>

## Lessons Learned

- **Pattern**: <transferable rule and why it matters>
- **Mistake**: <what to avoid on another project>
- **Discovery**: <new reusable knowledge>

<Use only applicable categories; do not manufacture a lesson.>

## Next Steps

- [ ] <specific action with enough context to execute>

## Related Resources

- Issue: <URL or none>
- PR: <URL or none>
- Commits: <hashes or none>
- Retrospective: <absolute path>
- Lesson: <absolute path or none>

## ✅ Retrospective Validation Checklist

- [ ] Metadata reflects the actual session and repository.
- [ ] Summary distinguishes shipped, unfinished, and blocked work.
- [ ] Timeline uses verified times or clearly untimed ordered events.
- [ ] Technical details match git and file evidence.
- [ ] AI Diary is first-person, substantive, and includes `[→ AGENT DECISION]`.
- [ ] Honest Feedback is substantive and contains exactly three friction points.
- [ ] Lessons are transferable rather than session-only observations.
- [ ] Next steps are concrete and executable.
- [ ] Links and paths resolve, or are explicitly marked unavailable.

## 🔍 Self-Audit

- shipped: <N items — commit hash or file path for each, or "none shipped">
- blocked: <N items — specific reason for each, or "none blocked">
- uncomfortable truth: [→ AGENT DECISION] <one decision the agent made wrong>
- friction: <N points> (operational: <list> | strategic: <list>)
- next steps: <N — each actionable without a follow-up question>
- rationalizations caught: <N — name them, or "none">
```

## Repository integration boundaries

The gist-inspired structure is the content contract, not permission to mutate unrelated
project files or GitHub state.

- Write under the detected Oracle vault paths from `SKILL.md`.
- Do not append lessons to `CLAUDE.md` or `AGENTS.md`; use the dedicated lesson artifact.
- Do not stage or commit `ψ/`.
- Do not comment on issues or PRs unless the user separately requests that external action.
