---
title: **Oracle Skills Discovery System: /learn + /trace**
tags: [learn, trace, discovery, exploration, haiku-agents, parallel-agents, symlinks, ghq, oracle-knowledge, deep-research, skill-ecosystem]
created: 2026-01-27
source: Oracle Learn
---

# **Oracle Skills Discovery System: /learn + /trace**

**Oracle Skills Discovery System: /learn + /trace**

## The Learning Ecosystem

Two complementary skills for knowledge discovery and retention:

### /learn - Deep Exploration
**Purpose:** Study external codebases, create organized documentation

**Pattern:**
```
URL/repo → ghq clone → symlink to ψ/learn/owner/repo/origin
        → 3 parallel Haiku agents explore
        → Generate: ARCHITECTURE.md, CODE-SNIPPETS.md, QUICK-REFERENCE.md
        → Create hub file: [REPO].md
```

**Key Innovation:** `origin/` symlink pattern
- Source lives in ghq (offloadable)
- Docs live in ψ/learn/ (committed)
- `.origins` manifest enables `--init` restore

**Agents:**
1. Architecture Explorer - structure, entry points, abstractions
2. Code Snippets Collector - implementations, patterns
3. Quick Reference Builder - what, install, usage

### /trace - Discovery System
**Purpose:** Find anything across repos, history, docs, Oracle

**Modes:**
- `--oracle` (fast): Oracle MCP only
- `--smart` (default): Oracle first, auto-escalate if < 3 results
- `--deep` (thorough): 5 parallel Explore agents

**5 Deep Agents:**
1. Current repo files
2. Git history (commits, creates, deletes)
3. GitHub issues
4. Other repos (ghq, ~/Code)
5. Retrospectives & learnings (ψ/memory/)

**Philosophy:** Trace → Dig → Trace Deeper → Distill → Awakening

## Connection to Deep Research

Today's `/deep-research` (Gemini automation) complements this:
- `/learn` = study codebases (internal)
- `/trace` = find knowledge (Oracle + local)
- `/deep-research` = research topics (Gemini external)

**Flow:**
```
/trace "topic"        → What do we know?
      ↓ not enough
/deep-research "topic" → Gemini researches externally
      ↓ found
oracle_learn(...)      → Add to knowledge base
      ↓ next time
/trace "topic"        → Now we know!
```

## Symlink Pattern (Important!)

Both /learn and /trace use symlinks:
```bash
# Grep doesn't follow symlinks!
rg "pattern" ψ/learn/  # Won't search origin/

# Use -L flag:
rg -L "pattern" ψ/learn/  # Follows symlinks
```

---
*Added via Oracle Learn*
