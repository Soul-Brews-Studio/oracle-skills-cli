---
name: rrr
description: Create session retrospective with AI diary and lessons learned. Use when user says "rrr", "retrospective", "wrap up session", "session summary", or at end of work session.
---

# RRR - Session Retrospective

> "Reflect to grow, document to remember."

**Alias: `/retrospective`** — same function, full word.

## Usage

```
/rrr                 # Interactive (default)
/rrr --direct        # One-shot write (no prompts, for low context)
/rrr --only          # Minimal retro only (very low context, /forward manual)
/rrr --forward       # Full retro + handoff combined
/rrr --deep          # 5 parallel agents for comprehensive analysis
/retrospective       # Same as /rrr
```

## Depth Modes

| Flag | Agents | Use Case |
|------|--------|----------|
| (default) | 1 | Normal session wrap-up |
| `--direct` | 1 | Low context, quick write |
| `--deep` | 5 | Complex session, thorough analysis |

## Flow

```
งานเสร็จ → rrr (retrospective + lesson learned) → commit → sync
```

---

## --deep Mode (5 Parallel Agents)

**Use for complex sessions** with lots of changes, multiple features, or when you want comprehensive analysis.

### Step 0: Timestamp + Paths

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
ROOT="$(pwd)"
TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H%M)
DATE_PATH=$(date "+%Y-%m/%d")
mkdir -p "$ROOT/ψ/memory/retrospectives/$DATE_PATH"
```

### Step 1: Launch 5 Parallel Agents

Each agent prompt must include:
```
You are analyzing a coding session for retrospective.
ROOT: [ROOT]
Return your findings as text. The main agent will compile the retrospective.
```

#### Agent 1: Git Deep Dive
```
Analyze git history thoroughly:
- git log --oneline -20
- git diff --stat HEAD~10
- git show --stat (last 5 commits)
- Branch activity
- Commit message patterns

Return: Timeline of changes, key commits, code churn analysis
```

#### Agent 2: File Changes Analysis
```
Analyze what files changed and why:
- git diff --name-only HEAD~10
- Read key modified files
- Identify patterns in changes
- Architecture impact

Return: Files modified summary, architectural changes, risk areas
```

#### Agent 3: Session Timeline Reconstruction
```
Reconstruct the session timeline:
- Read ψ/memory/logs/ for today
- Check git commit timestamps
- Identify session phases (start, middle, end)
- Map activities to times

Return: Detailed timeline with timestamps and activities
```

#### Agent 4: Pattern & Learning Extraction
```
Extract patterns and learnings:
- What problems were solved?
- What techniques were used?
- What could be reused?
- What mistakes were made?

Return: Key patterns, learnings, mistakes, reusable solutions
```

#### Agent 5: Oracle Memory Search
```
Search Oracle for related context:
- oracle_search("[session focus]")
- Check ψ/memory/learnings/ for similar topics
- Find past retrospectives on similar work
- What did we learn before?

Return: Related learnings, past insights, patterns to apply
```

### Step 2: Compile Results

After all agents return, main agent compiles into full retrospective:

**Location**: `ψ/memory/retrospectives/$DATE_PATH/${TIME}_[slug].md`

Include all standard sections PLUS:
- Deep git analysis (from Agent 1)
- Architecture impact (from Agent 2)
- Detailed timeline (from Agent 3)
- Extracted patterns (from Agent 4)
- Oracle connections (from Agent 5)

### Step 3: Write Lesson Learned

**Location**: `ψ/memory/learnings/${TODAY}_[slug].md`

With --deep, lesson learned should be more comprehensive:
- Multiple patterns identified
- Connections to past learnings
- Confidence levels for each insight

### Step 4: Sync to Oracle

```
oracle_learn({
  pattern: [Full lesson content],
  concepts: [tags from all 5 agents],
  source: "rrr --deep: [repo]"
})
```

### Step 5: Commit

```bash
git add ψ/memory/retrospectives/ ψ/memory/learnings/
git commit -m "rrr: deep analysis - [slug]"
```

---

## --only Mode (Minimal)

**Use when context is VERY low.** Writes minimal retrospective only, NO lesson learned. Do `/forward` manually after.

### Steps

1. **Timestamp**: `date "+🕐 %H:%M %Z (%A %d %B %Y)"`
2. **Quick git**: `git log --oneline -5`
3. **Write minimal retro** (NO lesson learned):

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

4. **Commit**: `git add ψ/ && git commit -m "rrr: minimal [slug]"`
5. **Done** - run `/forward` manually if needed

---

## --forward Mode (Retro + Handoff)

**Use for normal wrap-up.** Combines full retrospective AND handoff in one go.

### Steps

1. **Do full --direct mode** (retrospective + lesson learned)
2. **Then immediately create handoff**:

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

3. **Commit both**: `git add ψ/ && git commit -m "rrr: [slug] + handoff"`
4. **Push**: `git push origin main`
5. **Ready for /clear**

---

## --direct Mode (One-Shot)

**Use when context is running low.** Writes retrospective immediately without prompts.

### Step 1: Gather All Context (parallel)

```bash
# Timestamp
date "+🕐 %H:%M %Z (%A %d %B %Y)"

# Git context
git status --porcelain
git log --oneline -10
git diff --stat HEAD~5
git diff --name-only HEAD~10
```

### Step 2: Generate Paths

```bash
# Generate timestamp-based filename
TIMESTAMP=$(date "+%H.%M")
DATE_PATH=$(date "+%Y-%m/%d")
SLUG="session-retrospective"  # Or derive from session context

# Create directory
mkdir -p "ψ/memory/retrospectives/$DATE_PATH"

# File path
FILE="ψ/memory/retrospectives/$DATE_PATH/${TIMESTAMP}_${SLUG}.md"
```

### Step 3: Write Immediately (NO PROMPTS)

Write the full retrospective file in one shot using all gathered context. Include ALL mandatory sections:

- Session Summary
- Timeline (from session memory)
- Files Modified (from git)
- AI Diary (150+ words, MANDATORY)
- Honest Feedback (100+ words, 3 friction points, MANDATORY)
- Lessons Learned
- Next Steps

**DO NOT ASK** — just write based on available context.

### Step 4: Write Lesson Learned

```bash
LEARNING_FILE="ψ/memory/learnings/$(date '+%Y-%m-%d')_${SLUG}.md"
```

Write lesson learned file immediately.

### Step 5: Sync to Oracle (REQUIRED)

**ALWAYS sync to Oracle MCP after writing lesson learned:**

```bash
# Get repo context
REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/.git$//')
```

```
Use the oracle_learn MCP tool with:
- pattern: [Full content of the lesson learned]
- concepts: [Array of relevant tags]
- source: "rrr: ${REPO}"
```

### Step 6: Commit & Report

```bash
git add ψ/memory/retrospectives/ ψ/memory/learnings/
git commit -m "rrr: ${SLUG} + lesson learned"
```

Output: `✅ Retrospective written: [FILE]`

---

## Interactive Mode (Default)

## Step 0: Timestamp (REQUIRED)
```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

## Step 1: Gather Session Data

```bash
git diff --name-only HEAD~10
git log --oneline -10
git diff --stat HEAD~5
```

## Step 2: Draft Retrospective

Write draft following template below.

## Step 3: Review

Verify:
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

## Step 7: Sync to Oracle (REQUIRED)

**After writing the lesson learned file, ALWAYS sync to Oracle MCP:**

```bash
# Get repo context
REPO=$(git remote get-url origin 2>/dev/null | sed 's/.*github.com[:/]//' | sed 's/.git$//')
```

```
Use the oracle_learn MCP tool with:
- pattern: [Full content of the lesson learned]
- concepts: [Array of relevant tags from the lesson]
- source: "rrr: ${REPO}"
```

This ensures learnings are indexed and searchable across all Oracle instances.

## Step 8: Commit All

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
- **Oracle Sync**: REQUIRED - call `oracle_learn` MCP tool after every lesson learned
- **Time Zone**: GMT+7 (Bangkok)
- **Validation**: Check all boxes before saving
