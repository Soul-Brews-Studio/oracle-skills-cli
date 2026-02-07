---
name: recap
description: Fresh-start orientation—adaptive synthesis with bulletproof edge case handling. Use when starting a session, after /jump, lost your place, or before switching context.
trigger: /recap
---

# /recap — Fresh Start Context

**Goal**: Orient yourself fast. Rich context by default.

## Usage

```
/recap           # Rich: retro summary, handoff, tracks, git, pulse
/recap --quick   # Minimal: git + focus only, no file reads
```

---

## DEFAULT MODE (Rich)

**Run the rich script, then add suggestions:**

```bash
bun ~/.claude/skills/recap/recap-rich.ts
```

Script reads retro summaries, handoff content, tracks, git state. Then LLM adds:
- **What's next?** (2-3 options based on context)

Also check pulse context:

```bash
cat ψ/data/pulse/project.json 2>/dev/null
cat ψ/data/pulse/heartbeat.json 2>/dev/null
```

If pulse data exists, add one line after the script output:
```
⚡ Session #X of Y | Streak: N days | Week: ±X% msgs
```

If pulse files don't exist, skip silently.

**Total**: 1 bash call + optional pulse read + LLM analysis

---

## QUICK MODE (`/recap --quick`)

**Minimal, no content reads:**

```bash
bun ~/.claude/skills/recap/recap.ts
```

Script outputs git status + focus state (~0.1s). Then LLM adds:
- **What's next?** (2-3 options based on git state)

---

## "What's next?" Rules

| If you see... | Suggest... |
|---------------|------------|
| Handoff exists | Continue from handoff |
| Untracked files | Commit them |
| Focus = completed | Pick from tracks or start fresh |
| Branch ahead | Push or create PR |
| Streak active | Keep momentum going |

---

## Hard Rules

1. **ONE bash call** — never multiple parallel calls (adds latency)
2. **No subagents** — everything in main agent
3. **Ask, don't suggest** — "What next?" not "You should..."

---

**Philosophy**: Detect reality. Surface blockers. Offer direction.

**Version**: 7.0 (Rich default + pulse context)
**Updated**: 2026-02-07
