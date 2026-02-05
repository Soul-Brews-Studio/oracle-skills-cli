---
title: # Subagent Path Handling Pattern
tags: [subagent, path-handling, parallel-agents, learn-skill, variables, shell-expansion, debugging]
created: 2026-02-05
source: rrr: Soul-Brews-Studio/oracle-skills-cli
---

# # Subagent Path Handling Pattern

# Subagent Path Handling Pattern

When spawning subagents that need to write files, shell variables don't expand across agent boundaries. Passing `$ROOT/ψ/learn/$OWNER/$REPO/` to a subagent sends the literal string with dollar signs - the variables are never replaced.

**The Fix:**
1. Capture ROOT early: `ROOT="$(pwd)"`
2. Calculate ALL paths with actual values in main agent
3. Create directories BEFORE spawning agents
4. Pass LITERAL absolute paths to subagents (no variables!)

**Example:**
```
# Tell agent literal path:
Write to /home/user/repo/ψ/learn/acme/lib/2026-02-05/1033_ARCH.md
# NOT: Write to $DOCS_DIR/$TIME_ARCH.md
```

**Related:**
- Symlinks in gitignore: `ψ/learn/**/origin` (no trailing slash)
- Time-prefix files: `HHMM_filename.md` prevents collision
- Skill visibility: `user-invocable: false` hides from menu

---
*Added via Oracle Learn*
