---
name: context-finder
description: Fast search through git history, retrospectives, issues, and codebase. Use when user asks to "find", "search", "where is", or needs to locate something in the codebase or history.
---

# /context-finder - Search History & Context

Fast search using parallel Haiku subagents.

## Usage

```
/context-finder              # Recent context summary
/context-finder [query]      # Search for specific topic
```

## Step 0: Timestamp
```bash
date "+🕐 %H:%M (%A %d %B %Y)"
```

## Mode 1: No Arguments (Recent Summary)

Gather automatically:
1. Recent context issues
2. Latest 3 retrospectives
3. Latest 3 learnings
4. Last 10 commits

## Mode 2: With Query (Parallel Search)

**Launch 5 parallel subagents:**

### Agent 1: Git History
```
Task: context-finder (haiku)
git log --all --oneline --grep="[QUERY]" | head -15
```

### Agent 2: Current Files
```
Task: context-finder (haiku)
grep -ril "[QUERY]" --include="*.md" . | head -20
```

### Agent 3: GitHub Issues
```
Task: context-finder (haiku)
gh issue list --state all --limit 20 --search "[QUERY]"
```

### Agent 4: Retrospectives
```
Task: context-finder (haiku)
grep -ril "[QUERY]" ψ/memory/retrospectives/ | head -10
```

### Agent 5: Learnings
```
Task: context-finder (haiku)
grep -ril "[QUERY]" ψ/memory/learnings/ | head -10
```

## Output Format

```markdown
## 🔍 Context: [QUERY]

### 📂 Files Found
[list from agents]

### 📅 Git History
[commits mentioning query]

### 🎫 Issues
[related issues]

### 📝 Retrospectives & Learnings
[documents found]
```

## Integration with /trace

`/trace` can invoke context-finder:

```
/trace [query]
  → Oracle MCP first
  → Then: /context-finder [query] (5 parallel agents)
  → Synthesize results
```

ARGUMENTS: $ARGUMENTS
