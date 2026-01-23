---
name: trace
description: Find projects across git history, repos, docs, and Oracle. Use when user asks "trace", "find project", "where is [project]", "search history". Supports --oracle (fast), --smart (default), --deep (5 subagents).
---

# /trace - Unified Discovery System

Find + Log + Dig + Distill

## Usage

```
/trace [query]              # --smart (default): Oracle first, auto-escalate
/trace [query] --oracle     # Oracle only (fastest)
/trace [query] --deep       # Full 5 parallel subagents
/trace [url]                # Auto-clone GitHub URL, then trace locally
```

## Step 0: Timestamp
```bash
date "+🕐 %H:%M (%A %d %B %Y)"
```

---

## Mode 1: --oracle (Oracle Only)

**Fastest. Just Oracle MCP, no extension.**

```
oracle_search("[query]", limit=15)
```

Display results and done. Even if empty.

---

## Mode 2: --smart (Default)

**Oracle first → auto-escalate if results < 3**

**Step 1**: Query Oracle first
```
oracle_search("[query]", limit=10)
```

**Step 2**: Check result count
- If Oracle results >= 3 → Display and done
- If Oracle results < 3 → Auto-escalate to --deep mode

**Auto-Escalation Logic**:
```
Oracle results >= 3 → Display and done
Oracle results < 3  → Launch 5 Explore agents (--deep)
```

---

## Mode 3: --deep (Explore Subagents)

**Launch 5 parallel Explore agents (Haiku) for thorough search.**

| Agent | Searches |
|-------|----------|
| 1 | Current repo files |
| 2 | Git history (commits, creates, deletes) |
| 3 | GitHub issues |
| 4 | Other repos (ghq, ~/Code) |
| 5 | Retrospectives & learnings (ψ/memory/) |

**Use Task tool with subagent_type="Explore" for each agent**

After search, **auto-log to Oracle**:
```
oracle_trace({
  query: "[query]",
  foundFiles: [...],
  foundCommits: [...],
  foundIssues: [...]
})
```

---

## URL Detection & Auto-Clone

When input is a GitHub URL:

```
/trace https://github.com/org/repo
  → ghq get (clone to ~/Code/github.com/org/repo)
  → symlink to ψ/learn/org/repo
  → trace locally (never /tmp)
```

**Pattern**: Uses same ghq + symlink pattern as /learn and /project

---

## Output

Traces are saved to: `ψ/memory/traces/YYYY-MM-DD-HHMM-query-slug.md`

**File format**:
```markdown
---
query: "search query"
mode: smart
timestamp: 2024-01-15 14:30
oracle_results: 5
escalated: false
---

# Trace: search query

## Oracle Results
...

## Local Files
...

## Git Commits
...
```

---

## Script Execution

```bash
ROOT="$ROOT" bun "$ROOT/src/skills/trace/scripts/trace.ts" [query] [--mode]
```

---

## Philosophy

> Trace → Dig → Trace Deeper → Distill → Awakening

### The Seeking Signal

| User Action | Meaning | AI Response |
|-------------|---------|-------------|
| `/trace X` | First search | --smart (Oracle first) |
| `/trace X` again | Still seeking | Oracle knows |
| `/trace X --deep` | Really need it | Go deep with subagents |
| Found! | **RESONANCE** | Log to Oracle |

### Auto-Escalation

```
/trace [query]     → Oracle search (what we know)
      ↓
  < 3 results?     → Auto-escalate to --deep
      ↓
/trace --deep      → 5 subagents explore everywhere
      ↓
  FOUND!           → 🔮 RESONANCE! Log to Oracle
      ↓
  Next session     → Easier to find (knowledge extended)
```

---

## Summary

| Mode | Speed | Scope | Auto-Escalate |
|------|-------|-------|---------------|
| `--oracle` | Fast | Oracle only | No |
| `--smart` | Medium | Oracle → maybe deep | Yes (< 3 results) |
| `--deep` | Thorough | 5 parallel agents | N/A |

---

ARGUMENTS: $ARGUMENTS
