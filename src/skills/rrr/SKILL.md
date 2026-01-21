---
name: rrr
description: Create session retrospective with AI diary and lessons learned. Use when user says "rrr", "retrospective", "wrap up session", "session summary", or at end of work session.
allowed-tools:
  - Bash
  - Read
  - Write
  - Glob
  - Task
---

# RRR - Session Retrospective

Execute the `rrr` workflow using subagents for efficiency.

## Flow

```
งานเสร็จ → rrr (retrospective + lesson learned) → commit → sync
```

## Step 0: Timestamp (REQUIRED)
```bash
date "+🕐 %H:%M (%A %d %B %Y)"
```

## Step 1: Gather Session Data (Haiku)

Use context-finder subagent:
```
- git diff --name-only HEAD~10
- git log --oneline -10
- git diff --stat HEAD~5
```

## Step 2: Draft Retrospective (Haiku)

Use general-purpose subagent to write draft following template.

## Step 3: Main Agent Review (Opus)

Review draft:
- AI Diary: 150+ words with vulnerability
- Honest Feedback: 100+ words with 3 friction points
- All sections complete

## Step 4: Create Retrospective File

**Location**: `ψ/memory/retrospectives/YYYY-MM/DD/HH.MM_descriptive-slug.md`

**Filename**: `07.39_maw-amend-divergence-fix.md` (time + slug)

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

## 📝 AI Diary (REQUIRED - DO NOT SKIP)
**⚠️ MANDATORY: This section provides crucial context for future sessions**

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

## 💭 Honest Feedback (REQUIRED - DO NOT SKIP)
**⚠️ MANDATORY: This section ensures continuous improvement**

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

## ✅ Retrospective Validation Checklist
**BEFORE SAVING, VERIFY ALL REQUIRED SECTIONS ARE COMPLETE:**
- [ ] AI Diary section has detailed narrative (not placeholder)
- [ ] Honest Feedback section has frank assessment (not placeholder)
- [ ] Timeline includes actual times and events
- [ ] 3 Friction Points documented
- [ ] Lessons Learned has actionable insights
- [ ] Next Steps are specific and achievable

⚠️ **IMPORTANT**: A retrospective without AI Diary and Honest Feedback is incomplete.
```

## Step 5: Save Files (NO ASKING - just do it)

Write both files immediately. Don't ask for confirmation.

## Step 6: Create Lesson Learned (REQUIRED)

**Location**: `ψ/memory/learnings/YYYY-MM-DD_slug.md`

### Lesson Learned Template

```markdown
# [Title of Learning]

**Date**: YYYY-MM-DD
**Context**: [Project/session context]
**Confidence**: [High | Medium | Low]

## Key Learning

[2-3 paragraphs explaining the learning]

## The Pattern

[Code example or workflow if applicable]

## Why This Matters

[Impact and application]

## Tags

`tag1`, `tag2`, `tag3`
```

## Step 7: Commit All

```bash
git add ψ/memory/retrospectives/ ψ/memory/learnings/
git commit -m "rrr: [slug] + lesson learned"
git push origin main
```

## Critical Requirements

- **AI Diary**: 150+ words, vulnerability, first-person narrative
- **Honest Feedback**: 100+ words, 3 friction points
- **Timeline**: Actual times and events
- **Lesson Learned**: REQUIRED after every rrr
- **Time Zone**: GMT+7 (Bangkok)
- **Validation**: Check all boxes before saving
