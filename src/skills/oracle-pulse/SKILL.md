---
name: oracle-pulse
description: Quantitative heartbeat from ~/.claude/ session data. Use when user says "pulse", "stats", "usage", "how much have I used", "session count", "activity".
allowed-tools: Read, Write, Bash, Grep, Glob
---

# /oracle-pulse

> Quantitative heartbeat — read-only analytics from `~/.claude/` session data.

```
/oracle-pulse              # This project + today's heartbeat (read-only, fast)
/oracle-pulse --global     # Cross-project rankings + cost estimate (read-only, fast)
/oracle-pulse --dig        # Deep scan .jsonl files → write snapshots (slow, accurate)
```

`/oracle-pulse` and `/oracle-pulse --project` are the same.

---

## Default — Project + Heartbeat

**Read-only. Fast. Uses `sessions-index.json` + `stats-cache.json`.**

### 1. Read

```bash
cat ~/.claude/stats-cache.json
```

```bash
pwd
```

Encode `pwd`: replace `/` with `-`, prepend `-`.
Example: `/Users/nat/Code/repo` → `-Users-nat-Code-repo`

```bash
cat ~/.claude/projects/{encoded_path}/sessions-index.json
```

Also count actual `.jsonl` files to show coverage:
```bash
ls ~/.claude/projects/{encoded_path}/*.jsonl 2>/dev/null | wc -l
```

### 2. Display

```
━━━ ORACLE PULSE ━━━━━━━━━━━━━━━━━━━━━

📊 Today (YYYY-MM-DD)
   Messages: X,XXX  |  Sessions: XX  |  Tool calls: X,XXX
   🔥 Streak: X days  |  📈 Week: ±XX% msgs, ±XX% sessions

⚡ Lifetime: X,XXX sessions  |  XXX,XXX msgs  |  since YYYY-MM-DD (X days)
🤖 opus-4.5: XX% | sonnet-4.5: XX% | opus-4.6: XX% | other: XX%

━━━ PROJECT: {name} ━━━━━━━━━━━━━━━━━━

📁 {pwd}

📊 Overview
   Total sessions: XX  |  Messages: X,XXX  |  Sidechains: X
   Avg messages/session: XX
   First: YYYY-MM-DD  |  Latest: YYYY-MM-DD
   Index coverage: XX/YY sessions (run --dig for full scan)

📋 Last 5 Sessions (GMT+7)
   • [YYYY-MM-DD HH:MM] (XX msgs, branch) — Summary text
   ...

🌿 Branches (by session count)
   main: XX sessions  |  feature-x: X sessions  |  ...

📏 Session Sizes
   Tiny (1-5): XX  |  Small (6-20): XX  |  Medium (21-50): XX
   Large (51-100): XX  |  Marathon (100+): XX
```

**Heartbeat calculations** (from `stats-cache.json`):
- **Today**: find today's date in `dailyActivity` array. If not found, show latest available date.
- **Week**: last 7 days including today vs 7 days before that. Sum from `dailyActivity`.
- **Streak**: iterate `dailyActivity` backwards from today, count consecutive days with entries.
- **Model split**: by `outputTokens` from `modelUsage`. Simplify names (strip version suffixes).

**Project calculations** (from `sessions-index.json`):
- Sort last 5 by `modified` descending. Times in GMT+7 (+7h from UTC).
- Session sizes by `messageCount`: tiny 1-5, small 6-20, medium 21-50, large 51-100, marathon 100+.
- Index coverage: indexed entries vs actual `.jsonl` file count.

---

## --global (Cross-Project)

**Read-only. Uses file counts + stats-cache (fast).**

### 1. Read

```bash
# Count .jsonl files per project (fast, accurate count)
for dir in ~/.claude/projects/*/; do
  name=$(basename "$dir")
  count=$(ls "$dir"*.jsonl 2>/dev/null | wc -l)
  if [ "$count" -gt 0 ]; then
    latest=$(ls -t "$dir"*.jsonl 2>/dev/null | head -1)
    latest_date=$(python3 -c "import os; from datetime import datetime; print(datetime.fromtimestamp(os.path.getmtime('$latest')).strftime('%Y-%m-%dT%H:%M:%S'))" 2>/dev/null)
    echo "$name|$count|$latest_date"
  fi
done | sort -t'|' -k2 -rn
```

Also read `~/.claude/stats-cache.json` for model usage and hour counts.

### 2. Display

```
━━━ GLOBAL PULSE ━━━━━━━━━━━━━━━━━━━━━

🏆 Top 10 Projects (by sessions)
    1. project-name        XX sessions  (last: YYYY-MM-DD)
   ...

💰 Estimated Cost (API pricing)
   Opus 4.5:   $XXX.XX  (in XX.XM + out XX.XM + cache read XX.XB + cache write XXX.XM)
   Opus 4.6:   $XX.XX
   Sonnet 4.5: $XX.XX
   Haiku 4.5:  $X.XX
   ─────────────────────────────────
   TOTAL: ~$X,XXX.XX (estimated, excludes Max plan savings)

   Pricing (per 1M tokens):
   • Opus: $15 in / $75 out / $1.50 cache-read / $18.75 cache-write
   • Sonnet: $3 in / $15 out / $0.30 cache-read / $3.75 cache-write
   • Haiku: $0.80 in / $4 out / $0.08 cache-read / $1 cache-write

⏰ Activity by Hour (GMT+7, Bangkok)
   07-08: ████ XXX    09-10: ████ XXX    11-12: ███░ XXX
   13-14: ███░ XXX    15-16: ████ XXX    17-18: ███░ XXX
   19-20: ██░░ XXX    21-22: ██░░ XXX    23-00: █░░░ XXX
   01-02: █░░░ XXX    03-04: ░░░░ XXX    05-06: ░░░░ XXX

💤 Dormant Projects (7+ days inactive, up to 10)
   • project-name — last active YYYY-MM-DD (XX days ago)
```

**Hour shift**: `hourCounts` keys are UTC, add 7 for GMT+7. Block chars `░▒▓█` scaled to max.
**Cost formula**: `(inputTokens/1M × in) + (outputTokens/1M × out) + (cacheRead/1M × cacheRead) + (cacheCreation/1M × cacheWrite)`
**Model mapping**: `claude-opus-4-5-*` / `claude-opus-4-6*` → Opus, `claude-sonnet-4-5-*` → Sonnet, `claude-haiku-4-5-*` → Haiku.
**Project names**: decode path, take last 2 segments (org/repo).
**Dormant**: latest `.jsonl` mtime > 7 days ago.

---

## --dig (Deep Scan → Write Snapshots)

**Reads .jsonl files directly. Writes snapshots to `ψ/data/pulse/`.**

This is the slow, accurate mode. Scans every `.jsonl` session file, extracts metadata, writes structured JSON snapshots that other skills (like `/rrr`) can consume.

### 1. Setup

```bash
mkdir -p ψ/data/pulse
grep -q 'ψ/data/' .gitignore 2>/dev/null || echo 'ψ/data/' >> .gitignore
```

### 2. Scan current project

```bash
pwd
```

Encode `pwd`: replace `/` with `-`, prepend `-`.

```bash
PROJECT_DIR="$HOME/.claude/projects/{encoded_path}"
```

Scan every `.jsonl` file for metadata:

```bash
python3 -c "
import json, os, glob, sys
from datetime import datetime, timezone, timedelta

project_dir = '$PROJECT_DIR'
bkk = timedelta(hours=7)
sessions = []

for f in sorted(glob.glob(os.path.join(project_dir, '*.jsonl'))):
    sid = os.path.basename(f).replace('.jsonl', '')
    msgs = 0
    first_ts = None
    last_ts = None
    branch = None
    summary = None
    is_sidechain = False
    first_prompt = None

    with open(f) as fh:
        for line in fh:
            try:
                obj = json.loads(line)
            except:
                continue
            msgs += 1
            ts = obj.get('timestamp')
            if ts:
                if not first_ts or ts < first_ts:
                    first_ts = ts
                if not last_ts or ts > last_ts:
                    last_ts = ts
            t = obj.get('type', '')
            if t == 'summary':
                summary = obj.get('summary', '')
                branch = obj.get('gitBranch', '')
                is_sidechain = obj.get('isSidechain', False)
            if not first_prompt and t == 'user':
                content = obj.get('message', {}).get('content', [])
                text = ''
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get('type') == 'text':
                            text = c.get('text', '').strip()
                            break
                elif isinstance(content, str):
                    text = content.strip()
                if text and len(text) > 5 and not text.startswith('[Request interrupted'):
                    first_prompt = text[:80]

    if msgs > 0:
        sessions.append({
            'sessionId': sid,
            'messageCount': msgs,
            'created': first_ts,
            'modified': last_ts,
            'gitBranch': branch or 'unknown',
            'summary': summary or first_prompt or 'No summary',
            'isSidechain': is_sidechain,
            'fileSize': os.path.getsize(f)
        })

sessions.sort(key=lambda s: s.get('modified') or '', reverse=True)
print(json.dumps(sessions, indent=2))
"
```

Also enrich with `sessions-index.json` summaries where available:
```bash
cat "$PROJECT_DIR/sessions-index.json" 2>/dev/null
```

Merge: prefer index summaries/branches when available, use .jsonl scan for complete session list and accurate message counts.

### 3. Write project snapshot

Write `ψ/data/pulse/project.json`:

```json
{
  "generated": "2026-02-06T22:00:00+07:00",
  "project": "oracle-skills-cli",
  "path": "/Users/nat/Code/github.com/...",
  "totalSessions": 40,
  "indexedSessions": 10,
  "totalMessages": 1234,
  "sidechains": 2,
  "avgMessagesPerSession": 31,
  "firstSession": "2026-01-23",
  "latestSession": "2026-02-06",
  "sessions": [
    {
      "sessionId": "...",
      "messageCount": 88,
      "created": "...",
      "modified": "...",
      "gitBranch": "main",
      "summary": "...",
      "isSidechain": false,
      "fileSize": 173212
    }
  ],
  "branches": { "main": 35, "feature-x": 5 },
  "sizes": { "tiny": 10, "small": 8, "medium": 12, "large": 6, "marathon": 4 }
}
```

### 4. Write heartbeat snapshot

Read `~/.claude/stats-cache.json` and write `ψ/data/pulse/heartbeat.json`:

```json
{
  "generated": "2026-02-06T22:00:00+07:00",
  "today": { "date": "...", "messages": 0, "sessions": 0, "toolCalls": 0 },
  "thisWeek": { "messages": 0, "sessions": 0, "from": "...", "to": "..." },
  "lastWeek": { "messages": 0, "sessions": 0, "from": "...", "to": "..." },
  "weekChange": { "messages": "+XX%", "sessions": "+XX%" },
  "streak": { "days": 0, "from": "...", "to": "..." },
  "lifetime": { "sessions": 0, "messages": 0, "since": "...", "days": 0, "peakDay": "...", "peakMessages": 0 },
  "modelSplit": { "opus-4.5": "86%", "sonnet-4.5": "12%", "opus-4.6": "1%", "other": "1%" }
}
```

### 5. Write global snapshot

Scan all projects + stats-cache and write `ψ/data/pulse/global.json`:

```json
{
  "generated": "2026-02-06T22:00:00+07:00",
  "projects": [
    { "name": "org/repo", "encodedPath": "...", "sessions": 40, "latestDate": "...", "totalSize": "3.2M" }
  ],
  "cost": {
    "opus45": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "total": 0 },
    "opus46": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "total": 0 },
    "sonnet45": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "total": 0 },
    "haiku45": { "input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0, "total": 0 },
    "grandTotal": 0
  },
  "hourlyActivity": { "07": 293, "08": 370 },
  "dormant": [ { "name": "...", "lastActive": "...", "daysAgo": 14 } ]
}
```

### 6. Display all

Show combined output: heartbeat + project + global (all three dashboards).

Show at the end:
```
📦 Snapshots written to ψ/data/pulse/
   heartbeat.json  |  project.json  |  global.json
```

---

## Rules

- **Default/--project** = same thing: project + heartbeat, read-only, fast
- **--global** = cross-project, read-only, fast
- **--dig** = scan .jsonl files, write snapshots, slow but accurate
- **No subagents** — everything runs in main agent
- **GMT+7** — all displayed times in Bangkok timezone
- **Numbers** — comma formatting for thousands (1,234)
- **Graceful** — if a file is missing, show "no data", don't error
- **Snapshots not committed** — `ψ/data/` is gitignored working data
