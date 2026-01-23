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
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

---

## URL Detection & Auto-Clone

**If input is a GitHub URL**, clone AND symlink first:

```bash
# Replace [URL] with actual URL
ghq get -u [URL] && \
  GHQ_ROOT=$(ghq root) && \
  OWNER=$(echo "[URL]" | sed -E 's|.*github.com/([^/]+)/.*|\1|') && \
  REPO=$(echo "[URL]" | sed -E 's|.*/([^/]+)(\.git)?$|\1|') && \
  mkdir -p "ψ/learn/$OWNER" && \
  ln -sf "$GHQ_ROOT/github.com/$OWNER/$REPO" "ψ/learn/$OWNER/$REPO" && \
  echo "✓ Symlinked: ψ/learn/$OWNER/$REPO"
```

**Verify:** `ls -la ψ/learn/`

Then trace using `ψ/learn/[owner]/[repo]` path.

> **Note**: Grep tool doesn't follow symlinks. Use Bash: `rg -L "pattern" ψ/learn/`

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

## Trace Logging

**Always log traces** to: `ψ/memory/traces/YYYY-MM-DD-HHMM-query-slug.md`

```bash
# Create traces directory
mkdir -p "$ROOT/ψ/memory/traces"

# Generate filename
# Example: 2026-01-23-1430-claude-code.md
```

**Write trace file** with this format:
```markdown
---
query: "[query]"
mode: [oracle|smart|deep]
timestamp: YYYY-MM-DD HH:MM
oracle_results: [count]
escalated: [true|false]
---

# Trace: [query]

**Mode**: [mode]
**Time**: [timestamp]

## Oracle Results
[list results or "None"]

## Local Files
[list files found or "None"]

## Git Commits
[list commits or "None"]
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

### Auto-Escalation Flow

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
