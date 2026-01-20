# RICH MODE — 18-Path Detection

Full detection for edge cases. Use when:
- Something feels wrong
- Need detailed diagnosis
- Session is confused

## Data Gathering

```bash
ROOT=$(git rev-parse --show-toplevel)

# Git state
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
MODIFIED=$(git status --short 2>/dev/null | wc -l)
CONFLICTS=$(git diff --name-only --diff-filter=U 2>/dev/null | wc -l)

# Focus file
FOCUS_FILE="$ROOT/ψ/inbox/focus-agent-main.md"
if [ -f "$FOCUS_FILE" ]; then
  FOCUS_STATE=$(head -1 "$FOCUS_FILE" | sed 's/STATE: //')
  FOCUS_MTIME=$(stat -f%m "$FOCUS_FILE" 2>/dev/null)
  NOW=$(date +%s)
  FOCUS_HOURS=$(( (NOW - FOCUS_MTIME) / 3600 ))
  grep -q "^STATE:" "$FOCUS_FILE" || FOCUS_STATE="corrupted"
else
  FOCUS_STATE="missing"
fi

# Activity log
ACTIVITY_LOG="$ROOT/ψ/memory/logs/activity.log"
[ -f "$ACTIVITY_LOG" ] && LAST_ACTIVITY=$(tail -1 "$ACTIVITY_LOG" | cut -d'|' -f3 | xargs)

# Latest retro
LATEST_RETRO=$(find "$ROOT/ψ/memory/retrospectives" -name "*.md" -type f 2>/dev/null | grep -v CLAUDE | sort -r | head -1)
```

## Detection Precedence (In Order)

**Priority matters. Check conditions in this exact order, stop at first match.**

| Order | Condition | Return Path | Why |
|-------|-----------|-------------|-----|
| 1 | Git in merge/rebase state | GIT_CONFLICT_STATE | Prevents accidental commands |
| 2 | CONFLICTS > 0 | BLOCKER | Technical blocker—must resolve |
| 3 | FOCUS_STATE == "corrupted" | CORRUPTED_FOCUS | Can't parse, must fix |
| 4 | FOCUS_STATE == "pending" + has reason | BLOCKER | User explicitly waiting |
| 5 | FOCUS_STATE == "pending" + no reason | PENDING_NO_REASON | Incomplete state—clarify |
| 6 | FOCUS focusing + age < 4h | DEEP_WORK | Continue uninterrupted |
| 7 | FOCUS hours > 24 + recent commits | ASYNC_WORK | Work continued off-book |
| 8 | Both focus files exist | MULTI_FOCUS | Pattern collision—consolidate |
| 9 | Branch 100+ commits ahead | BRANCH_DIVERGED | Strategy needed before sync |
| 10 | "completed" in activity + files modified | INCOMPLETE_AFTER_MARKED_DONE | State inconsistency |
| 11 | MODIFIED > 5 + not focusing | UNCLEAN | Need attention |
| 12 | FOCUS_STATE == "completed" | TRANSITION | Clear finish line |
| 13 | FOCUS age >= 4h | STALE_FOCUS | Verify still current |
| 14 | No focus + clean git + gap | FRESH_START | Complete blank slate |
| 15 | No activity.log | NO_ACTIVITY_LOG | First session or reset |
| 16 | Tracks untouched 7+ days | TRACKS_DORMANT | Momentum loss |
| 17 | Retro corrupted (missing sections) | CORRUPTED_RETRO | Data integrity issue |
| 18 | (else) | CONFUSED | Doesn't fit patterns |

---

## Output Paths

### Path: BLOCKER (Conflicts or Pending)

```markdown
# RECAP — BLOCKED

[TIME]

**Blocker**: [reason from focus or conflict list]

---

What's needed to unblock?
```

**When**: Conflicts exist OR `STATE: pending` with reason

---

### Path: GIT_CONFLICT_STATE

```markdown
# RECAP — 🚩 Git In Merge/Rebase

[TIME]

Git is active in merge/rebase. All commands will fail.

**Steps**:
1. Resolve: `git status`
2. Continue: `git merge --continue` or `git rebase --continue`
3. Or abort: `git merge --abort` or `git rebase --abort`

Ready?
```

---

### Path: DEEP_WORK

```markdown
# RECAP

[TIME]

## On It

**Task**: [from focus file]
**Working**: [FOCUS_HOURS] min

**Git**: [MODIFIED] modified, last commit [time ago]

What's next?
```

**When**: `STATE: focusing` AND FOCUS_HOURS < 4

---

### Path: STALE_FOCUS

```markdown
# RECAP

[TIME]

## Focus File Stale

Last recorded: **[task]** ([FOCUS_HOURS] hours ago)

Git: [MODIFIED] modified

Recent: [last 2 activity entries]

---

Still current? Or reset?
```

**When**: FOCUS_HOURS >= 4 (and not other categories)

---

### Path: ASYNC_WORK

```markdown
# RECAP — Async Work Detected

[TIME]

Focus last updated: [FOCUS_HOURS] hours ago

But commits found: [last 2 commits]

---

Did work continue without updating focus?

Recent: `git log -3 --oneline`

Update focus or continue?
```

**When**: FOCUS_HOURS > 24 AND last_commit < 2 hours

---

### Path: CORRUPTED_FOCUS

```markdown
# RECAP — Focus File Broken

[TIME]

Can't parse: [filename]

Content:
[first 3 lines]

---

Recreate? Pattern:
STATE: [state]
TASK: [task]
SINCE: [HH:MM]
```

---

### Path: PENDING_NO_REASON

```markdown
# RECAP — Pending But Unclear

[TIME]

Marked as pending, no reason given.

Recent activity:
[last 5 log entries]

---

What were you waiting on?
```

---

### Path: MULTI_FOCUS

```markdown
# RECAP — Two Focus Files

[TIME]

**focus-agent-main.md**: [STATE + TASK]

**focus.md**: [STATE + TASK]

---

Which is current? Delete the other.
```

---

### Path: BRANCH_DIVERGED

```markdown
# RECAP — Branch Heavily Diverged

[TIME]

**Branch**: [name], [count] commits ahead of main

Last sync: [when]

---

Choose:
1. Prepare PR: `git log origin/main..[branch]`
2. Rebase: `git rebase origin/main`
3. Start over: `git checkout main`
```

---

### Path: INCOMPLETE_AFTER_MARKED_DONE

```markdown
# RECAP — Incomplete After Done

[TIME]

Activity log says: completed

Git shows: [N] modified files

---

What needs resolving?
```

---

### Path: UNCLEAN

```markdown
# RECAP

[TIME]

**Git State**: [MODIFIED] modified

[git status --short | head -5]

---

Commit first? Or reset?
```

**When**: MODIFIED > 5 + not focusing

---

### Path: TRANSITION

```markdown
# RECAP

[TIME]

## Complete

**Task**: [from focus] ✓

**Session did**: [from handoff or last retro—2 bullet points max]

**Last commit**: [git log -1 --oneline]

---

## Board

Hot tracks: [from ψ/inbox/tracks/ or "None"]

---

What's next?
```

**When**: FOCUS_STATE == "completed"

**Data gathering for TRANSITION**:
```bash
# Get session summary from handoff (if exists)
HANDOFF=$(ls -t "$ROOT/ψ/inbox/handoff/"*.md 2>/dev/null | head -1)
[ -f "$HANDOFF" ] && grep -A5 "## What We Did" "$HANDOFF" | head -6

# Get last commit
git -C "$ROOT" log -1 --oneline

# Get hot tracks
ls "$ROOT/ψ/inbox/tracks/"*.md 2>/dev/null | head -3
```

---

### Path: FRESH_START

```markdown
# RECAP

[TIME]

## Context

Last work: [from retro AI Diary—exact, 2 sentences]

**Learning**: [from retro Honest Feedback—one point]

---

## Board

Hot tracks: [list or "None"]

---

What to tackle?
```

**When**: No focus + clean + gap

---

### Path: NO_ACTIVITY_LOG

```markdown
# RECAP — No Activity History

[TIME]

First session? Log was deleted?

**State**: [branch] | [git status] | [focus exists?]

---

What to work on?
```

---

### Path: TRACKS_DORMANT

```markdown
# RECAP — Tracks Cold

[TIME]

No touches for 7+ days.

Last: [X days ago]

---

Restart a cold track? Consolidate? Fresh work?
```

---

### Path: CORRUPTED_RETRO

```markdown
# RECAP — Retro Corrupted

[TIME]

File: **[filename]**

Missing expected sections.

---

1. View: `cat [path]`
2. New: `rrr`
3. Ignore: continue

?
```

---

### Path: CONFUSED

```markdown
# RECAP — Let Me Check

[TIME]

**Focus**: [state] ([hours] old)
**Git**: [modified] modified, [conflicts] conflicts
**Activity**: [last entry]
**Branch**: [branch]

---

What's the situation?
```
