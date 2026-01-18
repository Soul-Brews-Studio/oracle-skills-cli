---
description: Daily standup check - pending tasks, appointments, recent progress. Use when user says "standup", "morning check", "what's pending".
---

**EXECUTE NOW:**

# /standup - Daily Standup

Quick check: pending tasks, appointments, recent progress.

## Step 0: Timestamp
```bash
date "+🕐 %H:%M (%A %d %B %Y)"
```

---
## Usage

```
/standup          # Full standup check
```

---
## Action

Gather info from multiple sources:

### 0. Physical Location (auto)
```bash
gh api repos/laris-co/nat-location-data/contents/current.csv --jq '.content' | base64 -d | grep iPhone | head -1 | cut -d',' -f9
```
Show: "📍 Currently at: [place]"

### 1. Open Issues (งานค้าง)
```bash
gh issue list --state open --limit 10 --json number,title,updatedAt --jq '.[] | "#\(.number) \(.title)"'
```

### 2. Current Focus
```bash
cat ψ/inbox/focus*.md 2>/dev/null | head -20
```

### 3. Schedule/Appointments
```bash
cat ψ/inbox/schedule.md 2>/dev/null | head -30
```

### 4. Recent Progress (24h)
```bash
git log --since="24 hours ago" --format="%h %s" | head -10
```

### 5. Latest Retrospective
```bash
ls -t ψ/memory/retrospectives/**/*.md 2>/dev/null | head -1
```

---
## Output Format

```markdown
## Standup @ [TIME]

### Done (24h)
- [commit 1]
- [commit 2]

### In Progress
- [from focus.md]

### Pending Issues
| # | Task | Updated |
|---|------|---------|
| #N | title | date |

### Appointments Today
- [from schedule.md or "ไม่มีนัด"]

### Next Action
- [suggest based on priorities]

---
💡 `/schedule` to see full calendar
```

---
## Related

- `/schedule` - Full calendar view
- `/wip` - Work in progress
- `/recap` - Full context summary

---
ARGUMENTS: $ARGUMENTS
