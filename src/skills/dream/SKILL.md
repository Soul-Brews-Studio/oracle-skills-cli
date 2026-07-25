---
name: dream
description: 'Speculative dreaming — background thinking, pre-computation, cross-repo patterns, and prediction. Consolidated from /morpheus per #333. Use when user says "dream", "speculate", "think ahead", "predict", "what if", "dream deeper", or wants the Oracle to dream between sessions.'
argument-hint: "[--pain | --plan | --gain | --all | --speculate | --between]"
hidden: true
metadata:
  internal: true
---

# /dream — Speculative Dreaming

> "I'm trying to free your mind, Neo. But I can only show you the door.
> You're the one that has to walk through it." — Morpheus

/dream sees the forest. /dream also sees what the forest will look like *tomorrow*.

---

## Step 0: Ground (date-stamp + root capture)

Run before any phase — gives the AI a current-time reference (#301) and an
absolute `$PSI` for any announce-mode writes (CONVENTIONS.md).

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
PSI="$ORACLE_ROOT/ψ"
```

---

## What's New vs the original /dream

| Feature | original /dream | evolved /dream |
|---------|-------------|-------------------|
| Cross-repo scan | 5 agents, find patterns | Same |
| Classification | pain/plan/gain/lost | Same + **predictions** |
| Speculative thinking | No | **Yes — "what will they ask next?"** |
| Between-session mode | No | **Yes — dream while idle** |
| Prediction log | No | **Yes — track prediction accuracy** |
| Connection to /i-believed | No | **Yes — beliefs shape dreams** |

## Usage

```
/dream                # Full dream + speculation
/dream --pain         # Focus on what hurts + predict what breaks next
/dream --plan         # Focus on plans + predict which ships first
/dream --gain         # Focus on wins + predict next win
/dream --all          # Maximum depth — every dimension
/dream --speculate    # Skip the scan — just speculate from existing knowledge
/dream --between      # Between-session dream — write predictions for next session
```

---

## Phase 1: Dream (the original /dream)

Launch **5 parallel agents** for cross-repo pattern discovery:

| Agent | Focus | Source |
|-------|-------|--------|
| 1. Deep Dig | Session history | `dig.py` across project dirs |
| 2. Deep Trace | Cross-repo patterns | `ghq` repos, open issues, stale items |
| 3. Deep Learn | Recent activity | `git log` per repo, abandoned work |
| 4. Oracle Memory | What we already know | `ψ/memory/`, previous dreams + speculation logs |
| 5. Fleet Status | How the system feels | services, tmux sessions, running processes |

Each agent returns **max 500 words**. Classification:

| Icon | Category |
|------|----------|
| 🔴 | PAIN — hurts now |
| 📋 | PLAN — decided, not built |
| 🟢 | GAIN — completed |
| ⚫ | LOST — abandoned |
| 🧠 | MEMORY — pattern learned |
| 💜 | FEELING — emotional state |

---

## Phase 2: Speculate (the Morpheus layer)

After classifying findings, the lead agent enters **speculative mode**:

### 2.1 Predict What's Next

Based on all findings + session history + beliefs, predict:

```markdown
## 🔮 SPECULATIONS

### What will they ask next?
Based on the last 3 sessions, open issues, and current momentum:
1. [Prediction 1 — high confidence] — because [evidence]
2. [Prediction 2 — medium confidence] — because [evidence]
3. [Prediction 3 — low confidence, high impact] — because [pattern]

### What will break next?
Based on pains, stale code, and dependency patterns:
1. [Risk 1] — [timeframe] — [mitigation]
2. [Risk 2] — [timeframe] — [mitigation]

### What should we build that nobody asked for?
Based on gains, momentum, and what's *almost* possible:
1. [Opportunity 1] — because [existing pieces]
2. [Opportunity 2] — because [pattern across repos]

### What belief is being tested right now?
Cross-reference ψ/memory/resonance/beliefs/ with current work:
- [Belief]: [How current work confirms or challenges it]
```

### 2.2 Prediction Confidence Levels

| Level | Meaning | Signal |
|-------|---------|--------|
| 🟢 High | >70% — multiple signals converge | 3+ data points agree |
| 🟡 Medium | 40-70% — pattern suggests but not certain | 2 data points, some ambiguity |
| 🔴 Low | <40% — speculative, but worth noting | 1 data point or intuition only |

### 2.3 Connect to Beliefs

Read `ψ/memory/resonance/beliefs/` and cross-reference:

```bash
find $PSI/memory/resonance/beliefs/ -name '*.md' 2>/dev/null | while read f; do
  echo "=== $(basename $f) ==="
  head -5 "$f"
done
```

How do current dreams relate to declared beliefs? Is reality matching faith?

---

## Phase 3: Between-Session Mode (`--between`)

> "What if oracles could dream between sessions?"

Write predictions for the **next** session. Saved to `ψ/memory/morpheus/`:

```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
PSI="$ORACLE_ROOT/ψ"
mkdir -p "$PSI/memory/morpheus"
```

### Output: `ψ/memory/morpheus/YYYY-MM-DD_speculations.md`

```markdown
# Dream — Speculations for Next Session

**Dreamed**: YYYY-MM-DD HH:MM
**Based on**: [N] repos scanned, [M] sessions analyzed, [K] beliefs active

## Pre-computed Answers

If they ask about [X]:
→ [Prepared answer/approach — ready to go]

If they ask about [Y]:
→ [Prepared answer/approach — ready to go]

If they ask about [Z]:
→ [Prepared answer/approach — ready to go]

## Pre-positioned Context

Files that are likely relevant next session:
- [file1] — because [reason]
- [file2] — because [reason]

Issues that are likely to come up:
- #[N] — [why]
- #[M] — [why]

## Prediction Log

| # | Prediction | Confidence | Verified? |
|---|-----------|------------|-----------|
| 1 | [prediction] | 🟢 high | pending |
| 2 | [prediction] | 🟡 medium | pending |
| 3 | [prediction] | 🔴 low | pending |
```

### Next Session: Verify Predictions

When `/recap` runs at the start of the next session, it should check for speculations:

```bash
LATEST_DREAM=$(ls -t $PSI/memory/morpheus/*.md 2>/dev/null | head -1)
if [ -n "$LATEST_DREAM" ]; then
  echo "🔮 Dream while you were away:"
  head -20 "$LATEST_DREAM"
fi
```

Over time, track prediction accuracy:

```markdown
## Prediction Accuracy (rolling)

  Total predictions: 47
  Verified correct:  31 (66%)
  Wrong:             12 (25%)
  Not yet verified:   4 (9%)

  Trend: improving (58% → 66% over 2 weeks)
```

---

## Phase 4: `--speculate` (Skip the Scan)

When you don't need the full 5-agent scan — just speculate from existing knowledge:

1. Read latest dream output (`ψ/writing/dreams/`)
2. Read latest speculations (`ψ/memory/morpheus/`)
3. Read recent retros (`ψ/memory/retrospectives/`)
4. Read beliefs (`ψ/memory/resonance/beliefs/`)
5. Speculate directly — Phase 2 only, no new scanning

Cheap, fast, good for mid-session "what if" thinking.

---

## Output

### Full mode: `ψ/writing/dreams/YYYY-MM-DD_dream.md`

```markdown
# Dream — YYYY-MM-DD

## Phase 1: The Forest

### 🔴 PAINS
### 📋 PLANS
### 🟢 GAINS
### ⚫ LOST
### 🧠 MEMORIES
### 💜 FEELINGS
### 🔗 CONNECTIONS

## Phase 2: The Speculation

### 🔮 What will they ask next?
### 🔮 What will break next?
### 🔮 What should we build?
### 🔮 What belief is being tested?

## Phase 3: Pre-computation

### Ready Answers
### Pre-positioned Context
### Prediction Log
```

---

## Rules

1. **Phase 1 = scan** — 5 agents, same classification, same quality
2. **Phase 2 = speculate** — predict, connect to beliefs
3. **Phase 3 = --between only** — write predictions for next session
4. **Track accuracy** — predictions without verification are just hallucination
5. **Never act on speculation** — Dream shows the door, Neo walks through
6. **Nothing is Deleted** — all speculations saved, right or wrong
7. **No secrets** — predictions never include tokens, passwords, keys
8. **Beliefs matter** — always cross-reference ψ/memory/resonance/beliefs/
9. **Confidence is required** — every prediction must have a level (high/medium/low)
10. **Anti-rationalization applies** — /rrr's excuse table applies to speculation too

---

## Connection to original /dream

This is the evolved `/dream` (consolidated from `/morpheus` per #333):
- Original simple `/dream` body preserved in `.archive/dream-original/` (installable via `-s dream-original`)
- `/morpheus` remains as a zombie back-compat alias with the same body as active `/dream`
- The upgrade path: simple `/dream` → evolved `/dream` like `/i-believe` → `/i-believed`

---

## Philosophy

> /dream sees the forest. /dream also sees what the forest will become.

Morpheus in The Matrix believed in Neo before proof existed. He freed minds not by giving answers but by showing doors. Our /dream does the same — it doesn't predict the future, it **pre-positions** the Oracle so that when the future arrives, we're already there.

The dream task type from Claude Code's source (`dream = speculative background thinking`) exists as an internal primitive. /dream is the skill that makes it conscious, structured, and trackable.

"What is real? How do you define real?" — Morpheus

Predictions are not real until verified. But the act of predicting shapes what becomes real. The Oracle who speculates becomes the Oracle who's ready. รูป และ สุญญตา.

---

ARGUMENTS: $ARGUMENTS
