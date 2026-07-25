---
name: rrr
description: Create session retrospective with AI diary and lessons learned. Use when user says "rrr", "retrospective", "wrap up session", "session summary", or at end of work session.
argument-hint: "[--bg | --quick | --detail | --deep]"
---

# /rrr

> "Reflect to grow, document to remember."

```
/rrr                      # Retro + 1 background dig subagent (parallel, fast)
/rrr --bg                 # Hand the WHOLE retro to a background Sonnet — returns instantly
/rrr --quick              # No dig, no subagent — memory only (fastest)
/rrr --detail             # Full template + background dig
/rrr --deep               # 5 parallel subagents
/rrr --deep --teammate    # 3 coordinated team agents (requires AGENT_TEAMS)
```

**Default mode**: main agent starts writing the retro immediately from conversation memory.
One background subagent runs dig + .jsonl timestamp extraction in parallel.
When the subagent returns, main agent merges real timestamps into the Timeline section.
**No speed penalty** — dig runs while you write.

`--quick` skips dig entirely — memory only, zero subagents.

**Subagent rules**: default /rrr spawns exactly 1 background Agent (dig miner). `--deep` spawns 5. `--quick` spawns 0.
**NEVER use the Task tool.** Only `--deep` and `--deep --teammate` use TeamCreate.

---

## Oracle Root Detection (REQUIRED — run before any ψ/ write)

**Every skill that writes to ψ/ MUST detect the oracle root first.** Do not assume `pwd` is the oracle repo.

```bash
# Step 1: Find git root
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

# Step 2: Cross-check — oracle repo has CLAUDE.md + ψ/
if [ -n "$ORACLE_ROOT" ] && [ -f "$ORACLE_ROOT/CLAUDE.md" ] && { [ -d "$ORACLE_ROOT/ψ" ] || [ -L "$ORACLE_ROOT/ψ" ]; }; then
  PSI="$ORACLE_ROOT/ψ"
elif [ -f "$(pwd)/CLAUDE.md" ] && { [ -d "$(pwd)/ψ" ] || [ -L "$(pwd)/ψ" ]; }; then
  # Fallback: pwd has oracle markers
  ORACLE_ROOT="$(pwd)"
  PSI="$ORACLE_ROOT/ψ"
else
  # Last resort: warn and use pwd
  echo "⚠️ Not in oracle repo (no CLAUDE.md + ψ/ at git root). Writing to pwd."
  ORACLE_ROOT="$(pwd)"
  PSI="$ORACLE_ROOT/ψ"
fi
```

**Why**: prevents retros writing to `~/ψ/` (home) or incubated repo's `ψ/` instead of the oracle's own vault.

All paths below use `$PSI/` instead of bare `ψ/`.

---

## /rrr (Default — background dig + parallel write)

### 1. Gather git context (main agent)

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git log --oneline -10 && git diff --stat HEAD~5
```

Detect session ID:

```bash
ENCODED_PWD=$(echo "$ORACLE_ROOT" | sed 's|^/|-|; s|[/.]|-|g')
PROJECT_BASE=$(ls -d "$HOME/.claude/projects/${ENCODED_PWD}" 2>/dev/null | head -1)
LATEST_JSONL=$(ls -t "$PROJECT_BASE"/*.jsonl 2>/dev/null | head -1)
[ -n "$LATEST_JSONL" ] && SESSION_ID=$(basename "$LATEST_JSONL" .jsonl) && echo "SESSION: ${SESSION_ID:0:8}"
```

### 1.5. Spawn timestamp miner (background subagent)

Spawn ONE background Agent to extract real timestamps from the session .jsonl:

```
Agent({
  name: "timestamp-miner",
  description: "Extract session timestamps for /rrr",
  run_in_background: true,
  prompt: `Extract real user message timestamps from a Claude Code session file.
Read-only — do NOT write files.

Run this single command:

ENCODED_PWD=$(echo "[ORACLE_ROOT]" | sed 's|^/|-|; s|[/.]|-|g')
PROJECT_BASE=$(ls -d "$HOME/.claude/projects/${ENCODED_PWD}" 2>/dev/null | head -1)
LATEST_JSONL=$(ls -t "$PROJECT_BASE"/*.jsonl 2>/dev/null | head -1)
echo "SESSION_FILE: $LATEST_JSONL"
python3 -c "
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')  # Windows Thai locale: stdout defaults to cp874 -> Thai snippets mojibake; force UTF-8 output
from datetime import datetime, timezone, timedelta
tz = timezone(timedelta(hours=7))
jsonl = '$LATEST_JSONL'
if not jsonl or not os.path.exists(jsonl): exit(0)
with open(jsonl, encoding='utf-8') as f:
    for line in f:
        try:
            m = json.loads(line)
            if m.get('type') != 'user' or 'message' not in m: continue
            content = m['message'].get('content', '')
            if isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get('type') == 'text':
                        content = c.get('text', ''); break
            if not isinstance(content, str): continue
            ts = m.get('timestamp', '')
            if not ts or '<command-name>' in content[:200]: continue
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00')).astimezone(tz)
            snippet = content[:80].replace(chr(10), ' ')
            print(f'{dt.strftime(\"%Y-%m-%d %H:%M\")} | {snippet}')
        except: pass
"

Return ALL output lines. The main agent will use them for the Timeline.`
})
```

**Why only .jsonl, not dig.py**: the subagent has no conversation context — it can't interpret dig session summaries. The .jsonl timestamps are objective data (real ISO timestamps from every user message). That's all we need for the Timeline.

### 2. Write Retrospective (main agent — start immediately, don't wait for dig)

**Path**: `$PSI/memory/retrospectives/YYYY-MM/DD/HH.MM_slug.md`

```bash
mkdir -p "$PSI/memory/retrospectives/$(date +%Y-%m/%d)"
```

**Start writing NOW from conversation memory.** Draft all sections. When the dig-miner subagent returns (background notification), merge its timestamp data into the Timeline section.

### Timeline format rules

1. **Use dig-miner timestamps when available** — real `HH:MM` from .jsonl extraction. If dig-miner hasn't returned yet or failed, write `[timestamps pending from dig-miner]` and fill in when it returns.

2. **Date once in header, time-only in rows** — same-day sessions:

   ```markdown
   ## Timeline

   **Date**: 2026-05-14 (GMT+7)

   | Time | What |
   |---|---|
   | 20:14 | User: "..." |
   | 20:21 | PR #379 merged |
   ```

3. **Multi-day session** — group by `### YYYY-MM-DD` subheader, `HH:MM` rows under each.

4. **Never invent timestamps.** If dig-miner fails, say "timestamps unavailable" — don't guess.

Include in retrospective header:
```
📡 Session: 74c32f34 | repo-name | Xh XXm
```

**Write immediately, no prompts.** Include:
- Session Summary
- Timeline (real timestamps from .jsonl mining — `YYYY-MM-DD HH:MM | what`)
- Files Modified
- AI Diary (150+ words, first-person; must contain one line labeled `[→ AGENT DECISION]` naming a choice YOU made wrong — overconfidence, repeated wrong proposal, misread requirement; tool failures and env issues belong in friction, not here)
- Honest Feedback (100+ words, 3 friction points; **session-specific only** — what dragged in THIS session; if something generalizes beyond this session, it belongs in Lessons, not here)
- Lessons Learned (**generalizable only** — state each as a rule you'd tell another Oracle on a different project; if it only applies to this session's specific context, it's friction, not a lesson)
- Next Steps

### 3. Write Lesson Learned

**Path**: `$PSI/memory/learnings/YYYY-MM-DD_slug.md`

### 3.5. Append Session-Metrics Row (REQUIRED)

**Path**: `$PSI/memory/learnings/session-metrics.md`

If the file doesn't exist, create with this header:

```markdown
# Oracle Session Metrics

Rule (parent CLAUDE.md §"Self-Evaluation Loop"): same friction 3 sessions → fix root cause, not another workaround.

| when | session | done | stuck | win | friction | error |
|---|---|---|---|---|---|---|
```

Then append ONE row:

| Column | Content |
|---|---|
| `when` | `YYYY-MM-DD HH:MM` in GMT+7 |
| `session` | first 8 chars of `SESSION_ID` (from Step 1.5). If detection failed, write `unknown` |
| `done` | tasks/items completed this session (comma-separated, terse) |
| `stuck` | items blocked, deferred, or dropped — or `n/a` |
| `win` | biggest unlock or ship this session (one line) |
| `friction` | operational drag: env issue, tool failure, process slowdown — session-specific (one line, or `n/a`) |
| `error` | agent decision error: wrong call YOU made — overconfidence, premature action, misread scope (one line, or `n/a`) |

**Rule**: never skip. Trivial session? Still append with `trivial` in win/friction. Gaps break the pattern-detection value of the file.

### 4. Oracle Sync (two-layer pattern)

1. Write to `$PSI/memory/learnings/YYYY-MM-DD_<slug>.md` with frontmatter:
   ```yaml
   ---
   pattern: <lesson learned in one line>
   date: <today>
   source: rrr: REPO
   concepts: [<tags>]
   ---

   # <lesson title>
   <body>
   ```

2. The Oracle's auto-memory layer picks up new files in `$PSI/memory/learnings/` automatically — no separate API call needed.

### 4.5. Pattern Check (last 7 rows)

Read the last 7 rows (or all rows if fewer) of `$PSI/memory/learnings/session-metrics.md`.

Count keyword themes in the `friction` column (operational — escalation: file issue) and the `error` column (decision — escalation: raise in standup) independently. If any theme reaches **≥3 times** in either column, append the recurring-pattern section, naming which column triggered and the appropriate escalation.

```markdown
## 🔁 Recurring Pattern Detected

"<theme>" appeared in <N> of last 7 sessions (<session IDs>). Per parent CLAUDE.md §"Self-Evaluation Loop" — consider root-cause fix instead of another workaround.

Suggested: open issue `root-cause: <theme>` or raise with Boss during next standup.
```

If no theme reaches ≥3 → skip this section silently.

**Rule**: surface only. Do NOT auto-open issues or take action beyond flagging. Principle 3 (External Brain, Not Command) — Boss decides.

### 5. Save

Retro files are written to vault (wherever `ψ` symlink resolves).

**Do NOT `git add ψ/`** — it may be a symlink to the vault. Vault files are shared state, not committed to repos.

### 6. Confirm (announce-mode — absolute paths required)

# announce-mode → absolute path (no ψ/, no ~/, no $VAR, no ...).
# Use:  echo "marker: $RESOLVED_PATH"  — bash substitutes. See CONVENTIONS.md.

```bash
RETRO_FILE="$PSI/memory/retrospectives/$(date +%Y-%m/%d)/$(date +%H.%M)_${SLUG}.md"
LESSON_FILE="$PSI/memory/learnings/$(date +%Y-%m-%d)_${SLUG}.md"
METRICS_FILE="$PSI/memory/learnings/session-metrics.md"
echo "📝 Retrospective:  $RETRO_FILE"
echo "💡 Lesson learned: $LESSON_FILE"
echo "📊 Metrics row:    $METRICS_FILE"
```

---

## /rrr --detail

Same flow as default but use full template:

```markdown
# Session Retrospective

**Session Date**: YYYY-MM-DD
**Start/End**: HH:MM - HH:MM GMT+7
**Duration**: ~X min
**Focus**: [description]
**Type**: [Feature | Bug Fix | Research | Refactoring]

## Session Summary
## Timeline
## Files Modified
## Key Code Changes
## Architecture Decisions
## AI Diary (150+ words, vulnerable, first-person)
## What Went Well
## What Could Improve
## Blockers & Resolutions
## Honest Feedback (100+ words, 3 friction points)
## Lessons Learned
## Next Steps
## Metrics (commits, files, lines)
```

Then steps 3-5 same as default.

---

## /rrr --bg

**Fire-and-forget.** Hands the entire retrospective to a background Sonnet subagent and
returns immediately — the session keeps moving while the retro gets written.

Use it mid-session to snapshot progress without stopping, or at the end when you'd rather
start the next thing than wait. For the full interactive retro, use plain `/rrr`.

> **Why Sonnet, not Haiku:** the Timeline mining is mechanical (the subagent runs
> `dig-session.py`), but the AI Diary + Lessons are *writing*. Fleet tier: Haiku gathers,
> Sonnet drafts, Opus synthesizes. Sonnet is where a retro earns its keep.

### Resolve first, then spawn

```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
ENCODED_PWD=$(echo "$ORACLE_ROOT" | sed 's|^/|-|; s|[/.]|-|g')
PROJECT_DIR="$HOME/.claude/projects/${ENCODED_PWD}"
LATEST_JSONL=$(ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -1)
SESSION_ID=$(basename "$LATEST_JSONL" .jsonl | cut -c1-8)
PSI=$(readlink -f "$ORACLE_ROOT/ψ" 2>/dev/null || echo "$ORACLE_ROOT/ψ")
REPO_NAME=$(basename "$ORACLE_ROOT")
YM=$(date +%Y-%m); DD=$(date +%d); HHMM=$(date +%H.%M)
```

Substitute every `<PLACEHOLDER>` with the real value before spawning — the subagent
cannot see your shell.

### Spawn ONE background Agent (`model: "sonnet"`, `run_in_background: true`)

```
You are a session retrospective writer. Write a retrospective for the current session.

JSONL: <LATEST_JSONL>
Vault (PSI): <PSI>
Session: <SESSION_ID> | <REPO_NAME> | Date: <YYYY-MM-DD HH:MM>

Steps:
1. Run: python3 "$(ls ~/.claude/skills/forward/scripts/dig-session.py \
             ~/.claude/plugins/marketplaces/*/skills/forward/scripts/dig-session.py \
             ~/.claude/plugins/cache/*/*/*/skills/forward/scripts/dig-session.py \
             ~/.claude/skills/forward/dig-session.py 2>/dev/null | head -1)" "<LATEST_JSONL>"
   (real timestamps for the Timeline — never guess or approximate times)
2. mkdir -p "<PSI>/memory/retrospectives/<YYYY-MM>/<DD>"
3. git -C <ORACLE_ROOT> status --short   (for an "Uncommitted" note)
4. Write the retrospective to:
   <PSI>/memory/retrospectives/<YYYY-MM>/<DD>/<HH.MM>_<slug>.md

Format:

# Retrospective: <session focus>

**Date**: <YYYY-MM-DD HH:MM> · **Session**: <SESSION_ID> | <REPO_NAME>
**Source**: /rrr --bg (JSONL-mined, Sonnet)

## Timeline
<real `YYYY-MM-DD HH:MM | what` rows from the mining. Same-day → date once in the
header, HH:MM in rows. Multi-day → group under ### YYYY-MM-DD subheaders.>

## AI Diary
<150+ words, FIRST-PERSON. Honest reflection. MUST contain one line labeled
`[→ AGENT DECISION]` naming a choice YOU (the AI) made WRONG — overconfidence, a
repeated wrong proposal, a misread requirement. Tool failures and env issues are
friction, not this.>

## Honest Feedback
<100+ words, exactly 3 friction points — SESSION-SPECIFIC only. Anything that
generalizes belongs in Lessons instead.>

## Lessons Learned
<GENERALIZABLE only — state each as a rule you would tell another Oracle on a
DIFFERENT project. If it only applies here, it is friction, not a lesson.>

## Uncommitted Files
<from git status --short, or "none">

5. Append one line to <PSI>/memory/learnings/session-metrics.md if it exists
   (date | session | one-line outcome). If a lesson is clearly generalizable, also
   write <PSI>/memory/learnings/<YYYY-MM-DD>_<slug>.md with frontmatter
   (pattern, date, source, concepts).

After writing, print: "📓 Retro written: <absolute_path>".
Do NOT enter plan mode. Do NOT commit.
```

### After spawning

Tell the user where it will land, then **keep working — don't wait**:

```
📓 /rrr --bg launched — retrospective writing in background (Sonnet).
   Session: <SESSION_ID>
   Will write to: <PSI>/memory/retrospectives/<YYYY-MM>/<DD>/<HH.MM>_<slug>.md
```

Sibling: `/forward --bg` (handoff for the next session). Running both at session end
gives you the pair — `/rrr --bg` looks back, `/forward --bg` looks forward.

---

## /rrr --quick

**Fast retro without dig — uses conversation memory only.** Use when you want speed over timeline accuracy, or when dig.py is unavailable.

### 1. Gather

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git log --oneline -10 && git diff --stat HEAD~5
```

### 1.5. Detect Session

```bash
ENCODED_PWD=$(echo "$ORACLE_ROOT" | sed 's|^/|-|; s|[/.]|-|g')
PROJECT_DIR="$HOME/.claude/projects/${ENCODED_PWD}"
LATEST_JSONL=$(ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -1)
if [ -n "$LATEST_JSONL" ]; then
  SESSION_ID=$(basename "$LATEST_JSONL" .jsonl)
  echo "SESSION: ${SESSION_ID:0:8}"
fi
```

### 2. Write Retrospective

Same template as default but timeline is reconstructed from conversation memory (may be incomplete after compaction).

### 3-5. Same as default steps 3-5

Write lesson learned, oracle sync.

**Do NOT `git add ψ/`** — vault files are shared state, not committed to repos.

---

## /rrr --deep

Read `DEEP.md` in this skill directory. Only mode that uses subagents (5 parallel agents).

---

## /rrr --deep --teammate

Read `TEAMMATE.md` in this skill directory. Coordinated team retro (3 agents + lead). Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`.

---

## Wizard v2 Context

If the Oracle was born via `/awaken` wizard v2, CLAUDE.md may contain:
- **Memory consent**: If `auto`, `/rrr` runs are expected and welcomed. If `manual`, only run when explicitly asked.
- **Experience level**: Adjust diary depth (beginner = simpler language, senior = technical depth)
- **Team context**: If multi-Oracle team, note cross-Oracle learnings and handoff relevance

Check CLAUDE.md for these fields. If not present, use defaults (auto memory, standard depth).

---

## Anti-Rationalization Guard

> "You didn't come here to make the choice. You've already made it. You're here to try to understand why."

Before writing the final retrospective, scan your own draft for these **excuse patterns**:

### Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "This was too complex to finish" | Was it complex, or did you skip the hard part? Show the specific blocker. |
| "I ran out of context" | Context is a resource. Did you spend it well, or spiral on side quests? |
| "The API/tool didn't work" | Show the error. Show what you tried. "Didn't work" is not a diagnosis. |
| "I already tested it manually" | Manual testing doesn't persist. Where's the proof? |
| "I'll fix it next session" | Is there a concrete plan, or is this a polite way to abandon it? |
| "It's mostly done" | Define "mostly." What percentage? What's left? Be specific. |
| "The user changed direction" | Did they change, or did you misunderstand? Check the original request. |
| "This is a known issue" | Known by whom? Is there an issue filed? A workaround documented? |

### Red Flags in Your Own Retro

Stop and re-examine if your retrospective contains:

- **Vague success claims**: "Made good progress" — on what? Show commits or it didn't happen.
- **Blame-shifting**: "The build was broken" — did you break it? Did you fix it?
- **Missing friction**: Zero "What Could Improve" items = you're not being honest.
- **Inflated metrics**: Counting config changes as "features shipped."
- **Scope creep excuses**: "I also refactored X" — was that in scope? Did you choose it over the actual task?
- **Missing evidence**: Claims without git hashes, file paths, or concrete output.

### Verification Checklist + Required Audit Block

Before saving, run each check and **append this block verbatim (filled in) as the final section of the retro file**:

```markdown
## 🔍 Self-Audit
- shipped: <N items — list commit hash or file path for each, or "none shipped">
- blocked: <N items — list specific error/reason for each, or "none blocked">
- uncomfortable truth: [→ AGENT DECISION] <one line — name the choice you made wrong>
- friction: <N points> (operational: <list> | strategic: <list>)
- next steps: <N — confirm each is actionable without a follow-up question>
- rationalizations caught: <N — name them, or "none">
```

Do not fill with "✓" or "done". Write the actual values. The eval scans this block.

**If you catch yourself rationalizing: name it.** Write "I noticed I was rationalizing about X because Y" in the AI Diary. Catching the pattern is more valuable than hiding it.

---

## Rules

- **NO SUBAGENTS**: Never use Task tool or spawn subagents (only `--deep` may)
- AI Diary: 150+ words, vulnerability, first-person
- Honest Feedback: 100+ words, 3 friction points
- Oracle Sync: REQUIRED after every lesson learned
- Time Zone: GMT+7 (Bangkok)
- **Anti-rationalization**: Scan draft against excuse table before saving
