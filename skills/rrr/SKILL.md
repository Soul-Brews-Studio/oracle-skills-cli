---
installer: arra-oracle-skills-cli v26.8.17-alpha.1127
origin: Nat Weerawan's brain, digitized — how one human works with AI, captured as code — Soul Brews Studio
name: rrr
description: '[standard] v26.8.17-alpha.1127 G-SKLL | Create a session retrospective with an AI diary and reusable lessons. Supports foreground, background, and combined execution across compatible agent hosts.'
argument-hint: "[--fg | --bg | --combo]"
---

# /rrr

> "Reflect to grow, document to remember."

Create a truthful session retrospective, record reusable learning, and append the
session-metrics row. Never invent timestamps or claim evidence that the active host
cannot provide.

## Mode router

Choose one execution mode:

```text
/rrr                              # same as --fg
/rrr --bg                         # full retrospective in the background
/rrr --fg                         # foreground, current-context only; never mines persisted sessions
/rrr --combo                      # foreground draft, then background evidence enrichment
```

`--fg`, `--bg`, and `--combo` are mutually exclusive. If more than one is supplied,
stop and report the valid syntax. When none is supplied, use `--fg`.

| Mode | Required behavior |
|---|---|
| `--bg` | Mine the persisted host session and write the retrospective asynchronously. Announce the destination and return without waiting. |
| `--fg` | Write synchronously from current conversation context and repository evidence. Do not inspect persisted session transcripts, JSONL, rollout files, or session databases. Do not launch a hidden mining agent. |
| `--combo` | Write a useful foreground artifact immediately, then launch background session mining that enriches the same artifact with verified timestamps and evidence. Clearly mark enrichment pending until it completes. |

Plain `/rrr` is the safe, lean foreground path. Persisted session mining happens only in
`--bg` and `--combo`.


## Host capability contract

Before mining or delegation, read [HOSTS.md](HOSTS.md). Detect capabilities rather
than assuming Claude Code paths, Claude JSONL, a particular agent API, or a model name.

Public output should say **session mining**, not **JSONL mining**. A host adapter may
internally read JSONL, rollout files, or another supported source, but it must normalize
the result and preserve source attribution.

If background execution is unavailable:

- `--fg` is unaffected.
- `--bg` falls back to `--fg` and clearly reports that persisted mining was unavailable.
- `--combo` keeps the foreground artifact, marks session enrichment unavailable, and
  does not fabricate a completion notification.

## Oracle root detection

Run this before every `ψ/` write. Do not assume the current directory is the Oracle repo.

```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)

if [ -n "$ORACLE_ROOT" ] && { [ -f "$ORACLE_ROOT/CLAUDE.md" ] || [ -f "$ORACLE_ROOT/AGENTS.md" ]; } \
   && { [ -d "$ORACLE_ROOT/ψ" ] || [ -L "$ORACLE_ROOT/ψ" ]; }; then
  PSI="$ORACLE_ROOT/ψ"
elif { [ -f "$(pwd)/CLAUDE.md" ] || [ -f "$(pwd)/AGENTS.md" ]; } \
   && { [ -d "$(pwd)/ψ" ] || [ -L "$(pwd)/ψ" ]; }; then
  ORACLE_ROOT="$(pwd)"
  PSI="$ORACLE_ROOT/ψ"
else
  echo "⚠️ Not in an Oracle repo. Writing under the current repository."
  ORACLE_ROOT="${ORACLE_ROOT:-$(pwd)}"
  PSI="$ORACLE_ROOT/ψ"
fi

PSI_RESOLVED=$(readlink -f "$PSI" 2>/dev/null || printf '%s' "$PSI")
```

## Shared workflow

### 1. Gather repository evidence

Use the smallest commands that accurately describe this session:

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git -C "$ORACLE_ROOT" status --short
git -C "$ORACLE_ROOT" log --oneline -10
git -C "$ORACLE_ROOT" diff --stat HEAD~5 2>/dev/null || true
```

Repository evidence is allowed in every mode. Persisted **agent-session** evidence is
for `--bg` and `--combo` only.

### 2. Resolve artifact paths

```bash
DATE_PATH=$(date +%Y-%m/%d)
TODAY=$(date +%Y-%m-%d)
HHMM=$(date +%H.%M)
mkdir -p "$PSI/memory/retrospectives/$DATE_PATH" "$PSI/memory/learnings"
```

Write:

- retrospective: `$PSI/memory/retrospectives/$DATE_PATH/${HHMM}_${SLUG}.md`
- lesson: `$PSI/memory/learnings/${TODAY}_${SLUG}.md`
- metrics: `$PSI/memory/learnings/session-metrics.md`

### 3. Execute the selected mode

#### Background (`--bg`, default)

Resolve every path and capability before delegation. Give one background writer the
current context summary, repository evidence, normalized session evidence when
available, destination paths, template requirements, and the anti-rationalization
rules. Use the active host's model routing; never require a named vendor model.

Return immediately with the resolved absolute destination. If the host cannot keep work
alive after returning, use the documented foreground fallback instead of pretending the
task remains active.

#### Foreground (`--fg`)

Write the artifact synchronously using current conversation context and repository
evidence only. Timeline entries without verified times must be ordered but untimed.
State `Persisted session mining: disabled by --fg` in the evidence note.

#### Combined (`--combo`)

First write a complete, useful context-based retrospective synchronously. Its Timeline
may contain ordered untimed entries and must include `Session enrichment: pending`.
Then launch one background miner/writer using the host adapter. It updates the same file
atomically: merge verified timestamps/evidence, replace the pending marker with the
source and completion status, and preserve user edits made after the initial write.

### 4. Retrospective content

The standard artifact includes:

- Session Summary
- Timeline
- Files Modified
- AI Diary (150+ words, first person)
- Honest Feedback (100+ words, exactly 3 session-specific friction points)
- Lessons Learned (generalizable rules only)
- Next Steps
- Self-Audit

The AI Diary must contain one line labeled `[→ AGENT DECISION]` naming a decision the
agent made wrong. Tool and environment failures belong under friction, not that label.

### 5. Timeline rules

1. Never invent timestamps.
2. Use normalized session evidence when available.
3. Same-day sessions show the date once and `HH:MM` in rows.
4. Multi-day sessions group rows under `### YYYY-MM-DD`.
5. With context-only evidence, use ordered untimed bullets rather than estimated times.
6. Record the evidence source: Claude adapter, Codex adapter, context-only, or unknown.

### 6. Lesson and metrics

Write a lesson only when it transfers to another project:

```yaml
---
pattern: <generalizable lesson in one line>
date: <today>
source: rrr: <repo>
concepts: [<tags>]
---
```

Create the metrics file when absent:

```markdown
# Oracle Session Metrics

| when | session | done | stuck | win | friction | error |
|---|---|---|---|---|---|---|
```

Append exactly one row for every run. Use `unknown` when the host cannot provide a
session ID. Never skip a trivial session; record `trivial` where appropriate.

Review the last seven metrics rows. If a theme appears at least three times in either
`friction` or `error`, surface a recurring-pattern section in the retrospective. Do not
open an issue automatically.

### 7. Self-audit

Append this filled block as the final section:

```markdown
## 🔍 Self-Audit
- shipped: <N items — list commit hash or file path for each, or "none shipped">
- blocked: <N items — list the specific reason for each, or "none blocked">
- uncomfortable truth: [→ AGENT DECISION] <one decision the agent made wrong>
- friction: <N points> (operational: <list> | strategic: <list>)
- next steps: <N — each actionable without a follow-up question>
- rationalizations caught: <N — name them, or "none">
```

Reject vague success claims, blame shifting, inflated metrics, unsupported assertions,
and “mostly done” without a concrete remainder.

### 8. Save and announce

Do not `git add ψ/`; it may resolve to a shared vault.

Announce absolute paths only:

```text
📝 Retrospective:  <absolute path>
💡 Lesson learned: <absolute path, or "not created — no generalizable lesson">
📊 Metrics row:    <absolute path>
```

## Rules

- Default execution mode is `--fg`.
- `--fg` never mines persisted session data and never launches a hidden miner.
- `--bg` and `--combo` are the only modes allowed to mine persisted session data.
- `--combo` is the only foreground-plus-background-enrichment mode.
- Never hard-code Claude storage, JSONL schema, agent APIs, team APIs, or model names in
  the shared flow; isolate host details in [HOSTS.md](HOSTS.md).
- Never invent timestamps, session IDs, commits, files, or completed background work.
- Do not create coordinated teams or multi-agent analysis trees for `/rrr`.
- Keep vault writes outside git staging.
