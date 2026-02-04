---
name: learn
description: Explore a codebase with parallel Haiku agents. Modes - --fast (1 agent), default (3), --deep (5). Use when user says "learn [repo]", "explore codebase", "study this repo".
---

# /learn - Deep Dive Learning Pattern

Explore a codebase with 3 parallel Haiku agents → create organized documentation.

## Usage

```
/learn [url]             # Auto: clone via ghq, symlink origin/, then explore
/learn [slug]            # Use slug from ψ/memory/slugs.yaml
/learn [repo-path]       # Path to repo
/learn [repo-name]       # Finds in ψ/learn/owner/repo
/learn --init            # Restore all origins after git clone (like submodule init)
```

## Depth Modes

| Flag | Agents | Files | Use Case |
|------|--------|-------|----------|
| `--fast` | 1 | 1 overview | Quick scan, "what is this?" |
| (default) | 3 | 3 docs | Normal exploration |
| `--deep` | 5 | 5 docs | Master complex codebases |

```
/learn --fast [target]   # Quick overview (1 agent, ~2 min)
/learn [target]          # Standard (3 agents, ~5 min)
/learn --deep [target]   # Deep dive (5 agents, ~10 min)
```

## Directory Structure

```
ψ/learn/
├── .origins             # Manifest of learned repos (committed)
└── owner/
    └── repo/
        ├── origin       # Symlink to ghq source (gitignored)
        ├── repo.md      # Hub file - links to all dates (committed)
        └── YYYY-MM-DD/  # Date folder for each learning session
            ├── ARCHITECTURE.md
            ├── CODE-SNIPPETS.md
            ├── QUICK-REFERENCE.md
            ├── TESTING.md       # --deep only
            └── API-SURFACE.md   # --deep only
```

**Multiple learnings**: Run `/learn` again → new date folder, history preserved.
**Same day re-run**: Agents read existing docs first, then add new insights.

**Offload source, keep docs:**
```bash
unlink ψ/learn/owner/repo/origin   # Remove symlink
ghq rm owner/repo                  # Remove source
# Docs remain in ψ/learn/owner/repo/
```

## /learn --init

Restore all origins after cloning (like `git submodule init`):

```bash
ROOT="$(pwd)"
# Read .origins manifest and restore symlinks
while read repo; do
  ghq get -u "https://github.com/$repo"
  OWNER=$(dirname "$repo")
  REPO=$(basename "$repo")
  mkdir -p "$ROOT/ψ/learn/$OWNER/$REPO"
  ln -sf "$(ghq root)/github.com/$repo" "$ROOT/ψ/learn/$OWNER/$REPO/origin"
  echo "✓ Restored: $repo"
done < "$ROOT/ψ/learn/.origins"
```

## Step 0: Detect Input Type + Resolve Path

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

**CRITICAL: Capture ABSOLUTE paths first (before spawning any agents):**
```bash
ROOT="$(pwd)"
echo "Learning from: $ROOT"
```

**IMPORTANT FOR SUBAGENTS:**
When spawning Haiku agents, you MUST give them TWO literal paths:
1. **SOURCE_DIR** (where to READ code) - the `origin/` symlink
2. **DOCS_DIR** (where to WRITE docs) - the parent directory, NOT inside origin/

⚠️ **THE BUG**: If you only give agents `origin/` path, they cd into it and write there → files end up in WRONG repo!

**FIX**: Always give BOTH paths as LITERAL absolute values (no variables!):

Example: If ROOT=/home/user/ghq/github.com/my-org/my-oracle, learning acme-corp/cool-library, TODAY=2026-02-04:
```
READ from:  /home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/origin/
WRITE to:   /home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/2026-02-04/
```

Tell each agent: "Read source from [SOURCE_DIR]. Write to [DOCS_DIR] (the date folder, NOT inside origin/)."

### If URL (http* or owner/repo format)

**Clone, create docs dir, symlink origin, update manifest:**
```bash
# Replace [URL] with actual URL
URL="[URL]"
ROOT="$(pwd)"  # CRITICAL: Save current directory!
ghq get -u "$URL" && \
  GHQ_ROOT=$(ghq root) && \
  OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|') && \
  REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|') && \
  mkdir -p "$ROOT/ψ/learn/$OWNER/$REPO" && \
  ln -sf "$GHQ_ROOT/github.com/$OWNER/$REPO" "$ROOT/ψ/learn/$OWNER/$REPO/origin" && \
  echo "$OWNER/$REPO" >> "$ROOT/ψ/learn/.origins" && \
  sort -u -o "$ROOT/ψ/learn/.origins" "$ROOT/ψ/learn/.origins" && \
  echo "✓ Ready: $ROOT/ψ/learn/$OWNER/$REPO/origin → source"
```

**Verify:**
```bash
ls -la "$ROOT/ψ/learn/$OWNER/$REPO/"
```

> **Note**: Grep tool doesn't follow symlinks. Use: `rg -L "pattern" ψ/learn/owner/repo/origin/`

### Then resolve path:
```bash
# Find by name (searches origin symlinks)
find ψ/learn -name "origin" -type l | xargs -I{} dirname {} | grep -i "$INPUT" | head -1
```

## Scope

**For external repos**: Clone with script first, then explore via `origin/`
**For local projects** (in `specs/`, `ψ/lib/`): Read directly

## Step 1: Detect Mode & Calculate Paths

Check arguments for `--fast` or `--deep`:
- `--fast` → Single overview agent
- `--deep` → 5 parallel agents
- (neither) → 3 parallel agents (default)

**Calculate ACTUAL paths (replace variables with real values):**
```
TODAY = YYYY-MM-DD (e.g., 2026-02-04)
REPO_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/
DOCS_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/[TODAY]/   ← WHERE AGENTS WRITE DOCS (date folder!)
SOURCE_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/origin/  ← WHERE AGENTS READ CODE (symlink)

Example:
- ROOT = /home/user/ghq/github.com/my-org/my-oracle
- OWNER = acme-corp
- REPO = cool-library
- TODAY = 2026-02-04
- REPO_DIR = /home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/
- DOCS_DIR = /home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/2026-02-04/
- SOURCE_DIR = .../origin/  ← SYMLINK to ghq clone
```

**⚠️ CRITICAL: Create symlink AND date folder FIRST, then spawn agents!**

1. Run the clone + symlink script in Step 0 FIRST
2. Check if today's folder already exists: `ls "$REPO_DIR/$TODAY/" 2>/dev/null`
3. **If exists**: Read existing docs first, tell agents to build on prior work
4. **If new**: Create the date folder: `mkdir -p "$DOCS_DIR"`
5. Capture DOCS_DIR and SOURCE_DIR as literal paths
6. THEN spawn agents with both paths

**Re-learning same day?** If `$REPO_DIR/$TODAY/` exists, add to agent prompts:
```
PRIOR WORK EXISTS: Read [DOCS_DIR]/*.md first.
Summarize what's already documented, then focus on:
- Gaps or areas not covered
- Updates since last exploration
- Deeper dives into interesting areas
```

---

## Mode: --fast (1 agent)

### Single Agent: Quick Overview

**Prompt the agent with (use LITERAL paths, not variables!):**
```
You are exploring a codebase.

READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/OVERVIEW.md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!

Analyze:
- What is this project? (1 sentence)
- Key files to look at
- How to use it (install + basic example)
- Notable patterns or tech
```

**Skip to Step 2** after agent completes.

---

## Mode: Default (3 agents)

Launch 3 agents in parallel. Each prompt must include (use LITERAL paths!):
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[filename]

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

### Agent 1: Architecture Explorer → `ARCHITECTURE.md`
- Directory structure
- Entry points
- Core abstractions
- Dependencies

### Agent 2: Code Snippets Collector → `CODE-SNIPPETS.md`
- Main entry point code
- Core implementations
- Interesting patterns

### Agent 3: Quick Reference Builder → `QUICK-REFERENCE.md`
- What it does
- Installation
- Key features
- Usage patterns

**Skip to Step 2** after all agents complete.

---

## Mode: --deep (5 agents)

Launch 5 agents in parallel. Each prompt must include (use LITERAL paths!):
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[filename]

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

### Agent 1: Architecture Explorer → `ARCHITECTURE.md`
- Directory structure & organization philosophy
- Entry points (all of them)
- Core abstractions & their relationships
- Dependencies (direct + transitive patterns)

### Agent 2: Code Snippets Collector → `CODE-SNIPPETS.md`
- Main entry point code
- Core implementations with context
- Interesting patterns & idioms
- Error handling examples

### Agent 3: Quick Reference Builder → `QUICK-REFERENCE.md`
- What it does (comprehensive)
- Installation (all methods)
- Key features with examples
- Configuration options

### Agent 4: Testing & Quality Patterns → `TESTING.md`
- Test structure and conventions
- Test utilities and helpers
- Mocking patterns
- Coverage approach

### Agent 5: API & Integration Surface → `API-SURFACE.md`
- Public API documentation
- Extension points / hooks
- Integration patterns
- Plugin/middleware architecture

**Skip to Step 2** after all agents complete.

## Step 2: Create/Update Hub File ([REPO].md)

```markdown
# [REPO] Learning Index

## Source
- **Origin**: ./origin/
- **GitHub**: https://github.com/$OWNER/$REPO

## Explorations

### [TODAY] ([mode])
<!-- --fast mode -->
- [[YYYY-MM-DD/OVERVIEW|Overview]]

<!-- default mode -->
- [[YYYY-MM-DD/ARCHITECTURE|Architecture]]
- [[YYYY-MM-DD/CODE-SNIPPETS|Code Snippets]]
- [[YYYY-MM-DD/QUICK-REFERENCE|Quick Reference]]

<!-- --deep mode adds -->
- [[YYYY-MM-DD/TESTING|Testing]]
- [[YYYY-MM-DD/API-SURFACE|API Surface]]

**Key insights**: [2-3 things learned]

### [OLDER-DATE] ([mode])
...
```

## Output Summary

### --fast mode
```markdown
## 📚 Quick Learn: [REPO]

**Mode**: fast (1 agent)
**Location**: ψ/learn/$OWNER/$REPO/[TODAY]/

| File | Description |
|------|-------------|
| [REPO].md | Hub (links all dates) |
| [TODAY]/OVERVIEW.md | Quick overview |
```

### Default mode
```markdown
## 📚 Learning Complete: [REPO]

**Mode**: default (3 agents)
**Location**: ψ/learn/$OWNER/$REPO/[TODAY]/

| File | Description |
|------|-------------|
| [REPO].md | Hub (links all dates) |
| [TODAY]/ARCHITECTURE.md | Structure |
| [TODAY]/CODE-SNIPPETS.md | Code examples |
| [TODAY]/QUICK-REFERENCE.md | Usage guide |

**Key Insights**: [2-3 things learned]
```

### --deep mode
```markdown
## 📚 Deep Learning Complete: [REPO]

**Mode**: deep (5 agents)
**Location**: ψ/learn/$OWNER/$REPO/[TODAY]/

| File | Description |
|------|-------------|
| [REPO].md | Hub (links all dates) |
| [TODAY]/ARCHITECTURE.md | Structure & design |
| [TODAY]/CODE-SNIPPETS.md | Code examples |
| [TODAY]/QUICK-REFERENCE.md | Usage guide |
| [TODAY]/TESTING.md | Test patterns |
| [TODAY]/API-SURFACE.md | Public API |

**Key Insights**: [3-5 things learned]
```

## .gitignore Pattern

For Oracles that want to commit docs but ignore symlinks:

```gitignore
# Ignore origin symlinks only (source lives in ghq)
# Note: no trailing slash - origin is a symlink, not a directory
ψ/learn/**/origin
```

**After running /learn**, check your repo's `.gitignore` has these patterns so docs are committed but symlinks are ignored.

## Notes

- `--fast`: 1 agent, quick scan for "what is this?"
- Default: 3 agents in parallel, good balance
- `--deep`: 5 agents, comprehensive for complex repos
- Haiku for exploration = cost effective
- Main reviews = quality gate
- `origin/` structure allows easy offload
- `.origins` manifest enables `--init` restore
