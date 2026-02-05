---
title: ## Multi-Agent Path Management: Literal Paths vs Variables
tags: [subagent, parallel-agents, path-handling, symlink, gitignore, learn-skill, file-structure, git-workflow]
created: 2026-02-05
source: Oracle Learn
---

# ## Multi-Agent Path Management: Literal Paths vs Variables

## Multi-Agent Path Management: Literal Paths vs Variables

**Problem**: When spawning subagents to execute tasks in parallel, passing shell variables ($ROOT, $DOCS_DIR, etc) fails because:
- Subagents don't have access to the parent agent's shell environment
- Variables aren't expanded when agents are spawned across sessions
- File writes end up in wrong locations (e.g., inside symlinks instead of target directory)

**Solution**: 
1. Calculate ALL absolute paths in the main agent (before spawning)
2. Replace variables with literal, actual values when telling subagents where to read/write
3. Explicitly warn subagents: "Write to /full/path/here, NOT inside origin/"

**Example - WRONG**:
```
Tell agent: "Read from $ROOT/ψ/learn/$OWNER/$REPO/origin/"
Tell agent: "Write to $ROOT/ψ/learn/$OWNER/$REPO/"
```

**Example - CORRECT**:
```
Capture: ROOT=/home/oracle/myrepo, OWNER=acme, REPO=coolLib, TODAY=2026-02-04, TIME=1349
Tell agent: "Read from /home/oracle/myrepo/ψ/learn/acme/coolLib/origin/"
Tell agent: "Write to /home/oracle/myrepo/ψ/learn/acme/coolLib/2026-02-04/1349_[FILENAME].md"
```

**Key Pattern**: Expand early, tell explicitly, warn clearly.

---

## Symlink + Gitignore Pattern: Source Lives Elsewhere

**Problem**: Wanted to track documentation in git but not the source code (which lives in ghq).

**Solution**: Use symlinks + gitignore to separate concerns:
- Clone code to ghq (global, shared storage)
- Create symlink in project: `ψ/learn/owner/repo/origin/ → /path/to/ghq/github.com/owner/repo`
- Gitignore only the symlink: `ψ/learn/**/origin` (no trailing slash - it's a symlink)
- Commit all `.md` docs in `ψ/learn/`

**Benefits**:
- Docs are tracked (git blame, history, sharing)
- Source code is deduplicated across projects (ghq)
- Can remove symlink anytime without losing docs
- Easy cleanup: `unlink origin && ghq rm owner/repo`

**Gitignore must NOT have trailing slash on symlink paths** - symlinks are files, not directories.

---

## Date-Folder + Time-Prefix Structure: Multiple Same-Day Runs

**Problem**: Running /learn multiple times same day would overwrite previous files.

**Solution**: Two-level temporal hierarchy
```
ψ/learn/owner/repo/
├── YYYY-MM-DD/          ← Date folder (mkdir if missing)
│   ├── 1349_ARCH.md     ← Time prefix (HHMM_)
│   ├── 1349_CODE.md
│   ├── 1520_ARCH.md     ← Second run same day
│   └── 1520_CODE.md
└── repo.md              ← Hub file linking all dates
```

**Key insight**: Time prefix prevents collisions, date folders organize by session.

---

## Separation of Concerns: Learn vs Trace vs Project

**Pattern**:
- `/learn` → Create docs from repos in `ψ/learn/` (with origin/ symlinks)
- `/trace` → Log search results in `ψ/memory/traces/` (timestamped logs)
- `/project` → Clone for development (worktrees, branches, PR workflow)

**Each skill handles one concern**:
- Learn: Study a codebase → organized docs → committed
- Trace: Find something → log results → Oracle memory
- Project: Work on code → development branches → PR flow

**Prevents feature creep**: Don't let trace create symlinks or learn do git operations.

---

## Reading vs Writing Separation: Subagents Can Write with Clear Boundaries

**Evolution**:
1. First attempt: Subagents read-only (no Write tool) - too restrictive
2. Problem: Main agent has to collect output and write files - bottleneck
3. Better: Subagents CAN write IF given explicit paths + warnings

**Current pattern**:
- Subagents get READ source: `SOURCE_DIR=/absolute/path/to/origin/`
- Subagents get WRITE target: `DOCS_DIR=/absolute/path/to/date/folder/`
- Clear instruction: "Write to DOCS_DIR, NOT inside origin/"
- Main agent doesn't have to be bottleneck

**Key safety measure**: If they write to origin/ by mistake, those files are gitignored anyway (symlink).

---

## Root Directory Capture: First Step Before Any Operations

**Pattern**:
```bash
# Step 0: CRITICAL - Capture before anything else
ROOT="$(pwd)"
TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H%M)

# Step 1: Do cloning/setup
ghq get -u "$URL"

# Step 2: Build paths with actual values
DOCS_DIR="$ROOT/ψ/learn/$OWNER/$REPO/$TODAY"
mkdir -p "$DOCS_DIR"

# Step 3: Create symlink
ln -sf "$(ghq root)/github.com/$OWNER/$REPO" "$ROOT/ψ/learn/$OWNER/$REPO/origin"

# Step 4: Now spawn agents with literal paths
```

**Why it matters**: If you don't capture ROOT first, then cd somewhere, you lose the original context. ghq operations and symlink creation must all be relative to ROOT.

**Related bug**: Origin symlink was created in target repo instead of calling repo's ψ/learn/ - fixed by capturing ROOT early.

---
*Added via Oracle Learn*
