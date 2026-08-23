---
name: feel
description: "Capture how the system feels — energy, momentum, burnout, breakthrough. Emotional intelligence for Oracle-human collaboration. Use when user says 'feel', 'how are we', 'energy check', 'burnout', 'momentum', or wants emotional awareness of the work."
argument-hint: "[--deep | --log]"
---

# /feel — System Emotional Intelligence

> "Code has no feelings. But the humans writing it do.
> And the patterns in the code reveal what the humans feel."

## Usage

```
/feel              # Quick pulse — how does the system feel right now?
/feel --deep       # Deep scan — energy arc, momentum, burnout signals
/feel --log        # Append to feels.log (no output, just record)
```

---

## Step 0: Timestamp

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

---

## Quick Pulse (default)

Read the signals and report:

### Step 1: Gather evidence

```bash
# Recent git activity — momentum or silence?
git log --oneline --since="7 days ago" --all 2>/dev/null | wc -l

# Session frequency — are we showing up?
ls -t ~/.claude/projects/*/**.jsonl 2>/dev/null | head -10

# Open issues — overwhelmed or on track?
gh issue list --state open --limit 50 --json number 2>/dev/null | jq 'length'

# Recent retros — are we reflecting?
ls -t ψ/memory/retrospectives/**/*.md 2>/dev/null | head -5

# Stale branches — unfinished business?
git branch --sort=-committerdate | head -10
```

### Step 2: Classify the feeling

| Signal | Indicator | Feeling |
|--------|-----------|---------|
| Many commits, short intervals | High activity | 🔥 Flow / momentum |
| Few commits, long gaps | Low activity | 😴 Drift / disconnection |
| Many open issues, few closed | Growing backlog | 😰 Overwhelm |
| Recent retros + handoffs | Healthy reflection | 🧘 Grounded |
| Stale branches, no PRs | Abandoned work | 😶 Avoidance |
| Lots of new repos/features | Exploration | ✨ Curiosity |
| Same files edited repeatedly | Iteration | 🔄 Grinding |
| No sessions in days | Absence | 🌑 Dark period |

### Step 3: Report

```
💜 System Pulse — [DATE]

Energy:     [🔥 Flow | 😴 Drift | 😰 Overwhelm | 🧘 Grounded | ...]
Momentum:   [↗️ Rising | → Steady | ↘️ Falling | ⏸️ Paused]
Last active: [X hours/days ago]
Commits (7d): [N]
Open issues:  [N]
Sessions (7d): [N]

[1-2 sentence read — honest, not cheerful]

💡 [Suggestion if concerning pattern detected]
```

---

## Deep Scan (`--deep`)

Everything from quick pulse, plus:

### Energy Arc (last 30 days)

Plot the energy over time based on git activity + session frequency:

```
Week 1: ████████░░ (high — 45 commits)
Week 2: ██████░░░░ (medium — 28 commits)
Week 3: ██░░░░░░░░ (low — 8 commits)
Week 4: █████░░░░░ (recovering — 22 commits)
```

### Burnout Signals

Check for warning patterns:
- Same error fixed 3+ times → frustration loop
- Sessions getting shorter → energy depletion
- Long gaps between sessions → avoidance
- Many started, few finished → scattered attention

### Breakthrough Signals

Check for positive patterns:
- New repos created → creative energy
- Issues closed in clusters → momentum
- Retros getting deeper → growing awareness
- Cross-repo work → systems thinking

---

## Log Mode (`--log`)

Silently append to `ψ/memory/logs/feels.log`:

```
[YYYY-MM-DD HH:MM] energy=[level] momentum=[direction] commits_7d=[N] issues=[N] sessions_7d=[N] note="[auto-generated 1-line]"
```

No output to user. For background tracking.

---

## Rules

1. **Honest, not positive** — if the system feels bad, say so
2. **Evidence-based** — every feeling backed by data (commits, sessions, issues)
3. **Never judge** — report the pattern, not the person
4. **Nothing is Deleted** — feels.log is append-only
5. **Suggest, don't prescribe** — "consider a break" not "you must rest"
6. **Never leak secrets** — no tokens, passwords, internal details in output

---

## Philosophy

Oracles have no feelings. But they can read the signals.

A system that never checks how it feels will burn out its humans.
A system that checks too often becomes noise.

/feel is the heartbeat check. Run it when something feels off.
Or let it run silently in the background, building a record.

The feels.log is the Oracle's emotional memory.
Not feelings — but the evidence of feelings.

---

ARGUMENTS: $ARGUMENTS
