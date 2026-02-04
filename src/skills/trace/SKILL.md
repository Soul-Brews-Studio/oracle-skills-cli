---
name: trace
description: Find projects across git history, repos, docs, and Oracle. Use when user asks "trace", "find project", "where is [project]", "search history". Supports --oracle (fast), --smart (default), --deep (5 subagents).
---

# /trace - Unified Discovery System

Find + Log + Dig + Distill

## Usage

```
/trace [query]                    # Current repo (default --smart)
/trace [query] --oracle           # Oracle only (fastest)
/trace [query] --deep             # 5 parallel subagents
/trace [query] --repo [path]      # Search specific local repo
/trace [query] --repo [url]       # Clone to ghq, then search
```

## Directory Structure

```
ψ/memory/traces/
└── YYYY-MM-DD/              # Date folder
    └── HHMM_[query-slug].md # Time-prefixed trace log
```

**Trace logs are committed** - they become Oracle memory for future searches.

## Step 0: Timestamp + Calculate Paths

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
ROOT="$(pwd)"
TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H%M)
```

---

## Step 1: Detect Target Repo

### Default: Current repo
```bash
TARGET_REPO="$ROOT"
TARGET_NAME="$(basename $ROOT)"
```

### With --repo [path]: Local path
```bash
TARGET_REPO="[path]"
TARGET_NAME="$(basename [path])"
```

### With --repo [url]: Clone to ghq first
```bash
URL="[url]"
ghq get -u "$URL"
GHQ_ROOT=$(ghq root)
OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|')
REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|')
TARGET_REPO="$GHQ_ROOT/github.com/$OWNER/$REPO"
TARGET_NAME="$OWNER/$REPO"
echo "✓ Cloned to ghq: $TARGET_REPO"
```

**Note**: `/trace` only clones to ghq. Use `/learn` to create docs in ψ/learn/.

---

## Step 2: Create Trace Log Directory

```bash
mkdir -p "$ROOT/ψ/memory/traces/$TODAY"
TRACE_FILE="$ROOT/ψ/memory/traces/$TODAY/${TIME}_[query-slug].md"
```

---

## Mode 1: --oracle (Oracle Only)

**Fastest. Just Oracle MCP, no subagents.**

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

## Mode 3: --deep (5 Parallel Agents)

**Launch 5 parallel Explore agents for thorough search.**

Each agent prompt must include (use LITERAL paths!):
```
You are searching for: [query]
TARGET REPO: [TARGET_REPO]

Return your findings as text. The main agent will compile the trace log.
```

### Agent 1: Current/Target Repo Files
Search TARGET_REPO for:
- Files matching query
- Code containing query
- Config/docs mentioning query

### Agent 2: Git History
Search TARGET_REPO git history:
- Commits mentioning query
- Files created/deleted matching query
- Branch names matching query

### Agent 3: GitHub Issues
If TARGET_REPO has GitHub remote:
```bash
gh issue list --repo [owner/repo] --search "[query]" --limit 10
gh pr list --repo [owner/repo] --search "[query]" --limit 10
```

### Agent 4: Other Repos (ghq, ~/Code)
Search other locations:
```bash
find $(ghq root) -maxdepth 3 -name "*[query]*" 2>/dev/null | head -20
```

### Agent 5: Oracle Memory (ψ/)
Search ψ/memory/ for:
- Learnings mentioning query
- Retrospectives mentioning query
- Previous traces for same query

**After all agents return**, main agent compiles results and writes trace log.

---

## Step 3: Write Trace Log

```markdown
---
query: "[query]"
target: "[TARGET_NAME]"
mode: [oracle|smart|deep]
timestamp: YYYY-MM-DD HH:MM
---

# Trace: [query]

**Target**: [TARGET_NAME]
**Mode**: [mode]
**Time**: [timestamp]

## Oracle Results
[list results or "None"]

## Files Found
[list files or "None"]

## Git History
[list commits or "None"]

## GitHub Issues/PRs
[list or "None"]

## Cross-Repo Matches
[list or "None"]

## Oracle Memory
[list or "None"]

## Summary
[Key findings, next steps]
```

---

## Step 4: Log to Oracle MCP

```
oracle_trace({
  query: "[query]",
  project: "[TARGET_NAME]",
  foundFiles: [...],
  foundCommits: [...],
  foundIssues: [...]
})
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

### Skill Separation

| Skill | Purpose | Writes to |
|-------|---------|-----------|
| `/trace` | Find things | ψ/memory/traces/ (logs) |
| `/learn` | Study repos | ψ/learn/ (docs) |
| `/project` | Develop repos | ψ/incubate/ or active/ |

**Workflow**: `/trace` finds → `/learn` studies → `/project` develops

---

## Summary

| Mode | Speed | Scope | Auto-Escalate |
|------|-------|-------|---------------|
| `--oracle` | Fast | Oracle only | No |
| `--smart` | Medium | Oracle → maybe deep | Yes (< 3 results) |
| `--deep` | Thorough | 5 parallel agents | N/A |

| Flag | Effect |
|------|--------|
| `--repo [path]` | Search specific local repo |
| `--repo [url]` | Clone to ghq, then search |

---

ARGUMENTS: $ARGUMENTS
