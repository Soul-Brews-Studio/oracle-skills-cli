---
description: v1.4.0 (Static) | Create session retrospective with AI diary and lessons learned. Use when user says "rrr", "retrospective", "wrap up session", "session summary", or at end of work session.
---

**EXECUTE NOW:**

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

## Step 5: Save Files (NO ASKING - just do it)

Write both files immediately. Don't ask for confirmation.

## Step 6: Create Lesson Learned (REQUIRED)

**Location**: `ψ/memory/learnings/YYYY-MM-DD_slug.md`

## Step 7: Commit All

```bash
git add ψ/memory/retrospectives/ ψ/memory/learnings/
git commit -m "rrr: [slug] + lesson learned"
git push origin main
```

## Critical Requirements

- **AI Diary**: 150+ words, vulnerability
- **Honest Feedback**: 100+ words, 3 friction points
- **Lesson Learned**: REQUIRED after every rrr
- **Time Zone**: GMT+7 (Bangkok)
