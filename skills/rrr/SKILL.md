---
name: rrr
description: Create a session retrospective with an AI diary and reusable lessons. Supports foreground, background, and combined execution across compatible agent hosts.
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
/rrr                              # default: foreground + session-clock timestamps
/rrr --light                      # fastest: timeline + summary + lesson only
/rrr --combo                      # foreground draft, then background evidence enrichment
/rrr --bg                         # full retrospective in the background
/rrr --fg                         # foreground, no session clock at all
```

`--fg`, `--bg`, and `--combo` are mutually exclusive. If more than one is supplied,
stop and report the valid syntax. **When none is supplied, use the default foreground
path** — synchronous, no background agent, but with real timestamps from the session
clock. `--light` composes with the foreground path.

| Mode | Required behavior |
|---|---|
| *(none)* | **Default.** Synchronous. Real times from `scripts/session-clock.py` plus git commit times. No background agent, no transcript bodies read. |
| `--light` | The default path with only Timeline, Summary, Lesson, and Metrics. For quick checkpoints; skips Diary, Feedback, Blockers, Self-Audit. |
| `--combo` | Foreground artifact now, then background mining that enriches the same file with fuller evidence. Mark enrichment pending until it completes. |
| `--bg` | Mine the persisted host session and write asynchronously. Announce the destination and return without waiting. |
| `--fg` | Strict: current conversation context and repository evidence only. Do not run the session clock. Do not inspect persisted session transcripts, JSONL, rollout files, or session databases. Do not launch a hidden mining agent. |

### Why the default reads a session clock

A retrospective without a timeline cannot be audited. Git commit times alone leave a
research or browsing session with `Duration: unknown`.

The historical fix was worse: pre-2026-08-20 retros filled the gap with **estimated** times
marked `~`, back-filled from the known end time. They are recognisable by their impossible
regularity — `~04:11 ~04:12 ~04:13 …`, or neat five-minute steps — because real session
timestamps cluster unevenly (four events inside one minute, then nothing for twenty).

`scripts/session-clock.py` closes the gap without either cost. It substring-scans the
transcript for `timestamp` fields **only** — message bodies are never parsed, so a 3MB
transcript costs a few hundred bytes of context and about 40ms. That is why this is the
default rather than `--combo`: no background agent, no token burn, real times.

The ban stands: never emit an estimated timestamp, with or without a tilde. If the clock
reports `evidence: none` and no commits exist, say `unknown` — do not decorate the gap.

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

All retro times and date-stamped paths use **GMT+7 (Asia/Bangkok)**. Pin it once so
every `date` call and git timestamp below renders in GMT+7 regardless of the host's
local zone:

```bash
export TZ='Asia/Bangkok'   # GMT+7 — retro timeline, header, and path stamps
```

Use the smallest commands that accurately describe this session:

```bash
date "+%H:%M %Z (%A %d %B %Y)"
git -C "$ORACLE_ROOT" status --short
git -C "$ORACLE_ROOT" log --oneline -10
git -C "$ORACLE_ROOT" diff --stat HEAD~5 2>/dev/null || true

# Verified commit timestamps in GMT+7. --date=format-local honors the TZ above.
git -C "$ORACLE_ROOT" log --since='18 hours ago' \
  --date=format-local:'%H:%M' --format='%ad — %s (%h)' --reverse
```

**Session clock — the default path's primary time source.** Timestamps only; message
bodies are never read, so this is cheap enough to run every time (~40ms on a 3MB
transcript):

```bash
python3 "$(dirname "$0")/scripts/session-clock.py"        # current segment
python3 "$(dirname "$0")/scripts/session-clock.py" --all  # every segment today
```

It splits on idle gaps, so an overnight pause is not reported as a 19-hour session, and
prints activity **beats** — the minutes that actually had events. Beats are real evidence:
use them for row times, never interpolate between them. On `evidence: none` there is no
clock for this host — fall back to commit times, then to untimed bullets.

Skip this command entirely under `--fg`.

Repository evidence is allowed in every mode. Persisted **agent-session** evidence is
for `--bg` and `--combo` only. Commit timestamps are repository evidence, not session
mining — a `--fg` retro may and should use them to build a real timeline.

### 2. Resolve artifact paths

```bash
# TZ='Asia/Bangkok' (GMT+7) was exported in step 1, so these stamps are Bangkok-local.
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

#### Background (`--bg`)

Resolve every path and capability before delegation. Give one background writer the
current context summary, repository evidence, normalized session evidence when
available, destination paths, template requirements, and the anti-rationalization
rules. Use the active host's model routing; never require a named vendor model.

Return immediately with the resolved absolute destination. If the host cannot keep work
alive after returning, use the documented foreground fallback instead of pretending the
task remains active.

#### Light (`--light`)

The default path with the reflective sections dropped — for a quick checkpoint mid-work
where a full retro is not worth the tokens. Write **only**:

- header metadata (with real `Start / End` and `Duration` from the session clock)
- `## Timeline`
- `## Session Summary` (2–3 sentences)
- `## Lessons Learned` (or an evidence-backed `none`)
- the metrics row

Skip Diary, What Went Well / Could Improve, Blockers, Honest Feedback, Next Steps, Related
Resources, and Self-Audit. Note `mode: light` in the evidence line so a reader knows the
reflection was intentionally omitted rather than forgotten. The silent validation gate still
applies to what *is* written.

#### Foreground (`--fg`)

Write the artifact synchronously using current conversation context and repository
evidence only. Build the Timeline from the **verified GMT+7 commit timestamps** gathered
in step 1 — real `HH:MM` rows, not `unknown`. Set the header `Start / End` to the first
and last commit time (or the current clock when there are no commits this session), and
`Duration` to their span. Only events with no timestamped evidence at all fall back to
ordered untimed bullets. State `Persisted session mining: disabled by --fg` in the
evidence note.

#### Combined (`--combo`)

First write a complete, useful context-based retrospective synchronously. Its Timeline
may contain ordered untimed entries and must include `Session enrichment: pending`.
Then launch one background miner/writer using the host adapter. It updates the same file
atomically: merge verified timestamps/evidence, replace the pending marker with the
source and completion status, and preserve user edits made after the initial write.

Use `--combo` when you want more than times — full transcript evidence, quoted decisions,
tool-level detail. For times alone the default path is faster and cheaper. If the host
cannot mine, replace the pending marker with `session enrichment unavailable` and leave the
timeline as the session clock produced it — never fill it with estimates.

### 4. Retrospective content

Use [TEMPLATE.md](TEMPLATE.md) for every mode. It preserves the detailed retrospective
shape: session metadata, summary, timeline, technical details, key changes, architecture
decisions, AI Diary, wins, improvements, blockers, Honest Feedback, lessons, next steps,
related resources, and Self-Audit — the written retro ends at Self-Audit.

Before saving, silently verify the retro against TEMPLATE.md's **validation gate**. It is
an internal quality check — run it, fix what fails, and **never write the checklist into
the retrospective file**.

Small sessions may have short sections or an evidence-backed `none`; they must not drop
required reflection sections, and must still pass the silent validation gate.

### 5. Timeline rules

1. Never invent timestamps. A tilde does not license a guess — `~04:12` is a fabricated
   timestamp wearing a disclaimer. Evenly spaced rows (every 1 or 5 minutes) are the
   signature of back-filling from the end time; real ones cluster unevenly.
2. All times render in **GMT+7 (Asia/Bangkok)** — the `TZ` exported in step 1 covers
   `date` and `git --date=format-local` alike. Label rows plainly as `HH:MM` (GMT+7).
3. Prefer verified times from these sources, in order: **session clock beats**
   (`scripts/session-clock.py`, default path) → normalized session evidence
   (`--bg`/`--combo`) → git commit timestamps (any mode) → the current clock for the
   closing entry. Never interpolate a row time between two beats.
4. Same-day sessions show the date once and `HH:MM` in rows.
5. Multi-day sessions group rows under `### YYYY-MM-DD`.
6. Only fall back to ordered untimed bullets when NO timestamped evidence exists at all —
   not merely because session mining is off. If any commit landed this session, the
   timeline has real times.
7. Record the evidence source: session-clock, Claude adapter, Codex adapter,
   git-commit-times, context-only, or unknown.

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


### 7. Save and announce

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
