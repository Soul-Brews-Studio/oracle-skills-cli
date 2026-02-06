---
name: rrr
description: Create session retrospective with AI diary and lessons learned. Use when user says "rrr", "retrospective", "wrap up session", "session summary", or at end of work session.
---

# RRR - Session Retrospective

> "Reflect to grow, document to remember."

**Alias: `/retrospective`** — same function, full word.

## Usage

```
/rrr                 # Quick retro (main agent, no prompts)
/rrr --detail        # Thorough retro with full template (main agent)
/rrr --only          # Minimal retro only (no lesson learned)
/rrr --forward       # Retro + handoff combined
/rrr --deep          # 5 parallel agents for comprehensive analysis
/retrospective       # Same as /rrr
```

## IMPORTANT: No Subagents by Default

**Do NOT use the Task tool or spawn subagents.** All modes run in the main agent EXCEPT `--deep`.

| Flag | Agents | Use Case |
|------|--------|----------|
| (default) | **main only** | Normal session wrap-up |
| `--detail` | **main only** | Thorough retro with full template |
| `--only` | **main only** | Very low context, minimal |
| `--forward` | **main only** | Retro + handoff |
| `--deep` | 5 subagents | Complex session (read DEEP.md) |

## Flow

```
work done → rrr → commit → sync
```

---

## Default Mode (Main Agent, Quick)

### Step 1: Gather Context

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git status --porcelain
git log --oneline -10
git diff --stat HEAD~5
git diff --name-only HEAD~10
```

### Step 2: Generate Paths

```bash
TIMESTAMP=$(date "+%H.%M")
DATE_PATH=$(date "+%Y-%m/%d")
SLUG="session-retrospective"  # Or derive from session context
mkdir -p "ψ/memory/retrospectives/$DATE_PATH"
FILE="ψ/memory/retrospectives/$DATE_PATH/${TIMESTAMP}_${SLUG}.md"
```

### Step 3: Write Retrospective (NO PROMPTS)

Write the file immediately using all gathered context. Include:

- Session Summary (2-3 sentences)
- Timeline (from session memory)
- Files Modified (from git)
- AI Diary (150+ words, first-person, MANDATORY)
- Honest Feedback (100+ words, 3 friction points, MANDATORY)
- Lessons Learned
- Next Steps

**DO NOT ASK** — just write based on available context.

### Step 4: Write Lesson Learned

**Location**: `ψ/memory/learnings/YYYY-MM-DD_slug.md`

```markdown
# [Title of Learning]

**Date**: YYYY-MM-DD
**Context**: [Project/session context]
**Confidence**: [High | Medium | Low]

## Key Learning
[2-3 paragraphs]

## The Pattern
[Code example or workflow if applicable]

## Why This Matters
[Impact and application]

## Tags
`tag1`, `tag2`, `tag3`
```

### Step 5: Sync to Oracle (REQUIRED)

```bash
REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/.git$//')
```

```
Use the oracle_learn MCP tool with:
- pattern: [Full content of the lesson learned]
- concepts: [Array of relevant tags]
- source: "rrr: ${REPO}"
```

### Step 6: Commit

```bash
git add ψ/memory/retrospectives/ ψ/memory/learnings/
git commit -m "rrr: ${SLUG} + lesson learned"
```

Output: `Retrospective written: [FILE]`

---

## --detail Mode (Main Agent, Thorough)

Same as default mode but use the **full template** below for a more thorough retrospective.

### Full Template

```markdown
# Session Retrospective

**Session Date**: YYYY-MM-DD
**Start Time**: HH:MM GMT+7
**End Time**: HH:MM GMT+7
**Duration**: ~X minutes
**Primary Focus**: Brief description
**Session Type**: [Feature Development | Bug Fix | Research | Refactoring]
**Current Issue**: #XXX
**Last PR**: #XXX

## Session Summary
[2-3 sentence overview of what was accomplished]

## Timeline
- HH:MM - Started session, reviewed issue #XXX
- HH:MM - [Event]
- HH:MM - [Event]
- HH:MM - Completed implementation

## Technical Details

### Files Modified
\`\`\`
[paste git diff --name-only output]
\`\`\`

### Key Code Changes
- Component X: Added Y functionality
- Module Z: Refactored for better performance

### Architecture Decisions
- Decision 1: Rationale
- Decision 2: Rationale

## AI Diary (REQUIRED - DO NOT SKIP)
[Write a detailed first-person narrative of your experience during this session. Include:
- Initial understanding and assumptions
- How your approach evolved
- Moments of confusion or clarity
- Decisions made and why
- What surprised you
- Internal thought process]

(Minimum 150 words with vulnerability)

## What Went Well
- Success 1
- Success 2
- Success 3

## What Could Improve
- Area 1
- Area 2

## Blockers & Resolutions
- **Blocker**: Description
  **Resolution**: How it was solved

## Honest Feedback (REQUIRED - DO NOT SKIP)
[Provide frank, unfiltered assessment of:
- Session effectiveness
- Tool performance and limitations
- Communication clarity
- Process efficiency
- What frustrated you
- What delighted you
- Suggestions for improvement]

### Friction Points (3 required)
1. [Issue]: [Impact and suggestion]
2. [Issue]: [Impact and suggestion]
3. [Issue]: [Impact and suggestion]

(Minimum 100 words)

## Lessons Learned
- **Pattern**: [Description] - [Why it matters]
- **Mistake**: [What happened] - [How to avoid]
- **Discovery**: [What was learned] - [How to apply]

## Next Steps
- [ ] Immediate task 1
- [ ] Follow-up task 2
- [ ] Future consideration

## Metrics
- **Commits**: X
- **Files changed**: X
- **Lines added**: X
- **Lines removed**: X
- **Tests**: X passing
```

Then follow default mode Steps 4-6 (lesson learned, oracle sync, commit).

---

## --only Mode (Minimal)

**Use when context is VERY low.** Writes minimal retrospective only, NO lesson learned.

1. `date "+%H:%M %Z (%A %d %B %Y)"`
2. `git log --oneline -5`
3. Write minimal retro:

```markdown
# Session Retrospective (Minimal)

**Date**: YYYY-MM-DD HH:MM
**Focus**: [Brief description]

## What We Did
- [Key accomplishment 1]
- [Key accomplishment 2]

## Key Changes
[git log --oneline -5 output]

## Next
- [ ] [Next step]
```

4. `git add ψ/ && git commit -m "rrr: minimal [slug]"`
5. Done - run `/forward` manually if needed

---

## --forward Mode (Retro + Handoff)

1. **Do full default mode** (retrospective + lesson learned)
2. **Create handoff**:

Write to: `ψ/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`

```markdown
# Handoff: [Session Focus]

**Date**: YYYY-MM-DD HH:MM

## What We Did
[Copy from retrospective summary]

## Pending
- [ ] [From retrospective next steps]

## Next Session
- [ ] [Specific action]

## Key Files
- [Important files from session]
```

3. `git add ψ/ && git commit -m "rrr: [slug] + handoff"`
4. `git push origin main`

---

## --deep Mode

**Only when `--deep` is explicitly passed.** Read `DEEP.md` in this skill directory for full instructions. This is the ONLY mode that uses parallel agents.

---

## Critical Requirements

- **AI Diary**: 150+ words, vulnerability, first-person narrative
- **Honest Feedback**: 100+ words, 3 friction points
- **Timeline**: Actual times and events
- **Lesson Learned**: REQUIRED after every rrr (except --only)
- **Oracle Sync**: REQUIRED - call `oracle_learn` MCP tool after every lesson learned
- **Time Zone**: GMT+7 (Bangkok)
