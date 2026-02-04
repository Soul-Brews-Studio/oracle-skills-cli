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
        ├── origin/      # Symlink to ghq source (gitignored)
        ├── repo.md      # Hub file (committed)
        └── *.md         # Generated docs (committed)
```

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
When spawning Haiku agents, you MUST:
1. Replace `$ROOT` with the ACTUAL absolute path (e.g., `/home/user/my-project`)
2. Replace `$OWNER` and `$REPO` with actual values
3. Tell agents the EXACT path to READ from (not variables!)
4. **Subagents do NOT write files** - they return text to main agent

Example: If ROOT=/home/user/ghq/github.com/my-org/my-oracle and learning acme-corp/cool-library:
- Tell agent: "READ from `/home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/origin/`"
- Tell agent: "Return your analysis as text. Do NOT write files."
- Main agent then writes to `/home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/`

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
DOCS_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/     ← WHERE MAIN AGENT WRITES DOCS
SOURCE_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/origin/  ← WHERE AGENTS READ CODE (symlink)

Example:
- ROOT = /home/user/ghq/github.com/my-org/my-oracle  ← current repo (where you run /learn)
- OWNER = acme-corp
- REPO = cool-library
- DOCS_DIR = /home/user/ghq/github.com/my-org/my-oracle/ψ/learn/acme-corp/cool-library/
- SOURCE_DIR = (same)/origin/  ← SYMLINK to ghq clone of target repo
```

**⚠️ CRITICAL ARCHITECTURE:**
1. **Subagents ONLY READ** - they explore SOURCE_DIR and return text
2. **Subagents NEVER WRITE** - no Write tool, no file creation
3. **Main agent WRITES ALL FILES** - collects agent output, writes to DOCS_DIR
4. Replace `[SOURCE_DIR]` with ACTUAL LITERAL path when prompting agents!

---

## Mode: --fast (1 agent)

⚠️ **SUBAGENTS DO NOT WRITE FILES** - They only RETURN text to main agent!

### Single Agent: Quick Overview

**Prompt the agent with:**
```
You are exploring a codebase. READ files from: [SOURCE_DIR]

DO NOT write any files. DO NOT use Write tool. Return your analysis as text.

Analyze and return:
- What is this project? (1 sentence)
- Key files to look at
- How to use it (install + basic example)
- Notable patterns or tech

Return your findings as markdown text. The main agent will write the file.
```

**After agent returns**, main agent writes to `[DOCS_DIR]/[TODAY]_OVERVIEW.md`

**Skip to Step 2 (fast)** after collecting agent output.

---

## Mode: Default (3 agents)

⚠️ **SUBAGENTS DO NOT WRITE FILES** - They only RETURN text to main agent!

Launch 3 agents in parallel. Each agent prompt must include:
```
You are exploring a codebase. READ files from: [SOURCE_DIR]

DO NOT write any files. DO NOT use Write tool. Return your analysis as text.
```

### Agent 1: Architecture Explorer
```
Analyze and return:
- Directory structure
- Entry points
- Core abstractions
- Dependencies

Return your findings as markdown text. The main agent will write the file.
```

### Agent 2: Code Snippets Collector
```
Analyze and return:
- Main entry point code
- Core implementations
- Interesting patterns

Return your findings as markdown text. The main agent will write the file.
```

### Agent 3: Quick Reference Builder
```
Analyze and return:
- What it does
- Installation
- Key features
- Usage patterns

Return your findings as markdown text. The main agent will write the file.
```

**After all agents return**, main agent writes files to DOCS_DIR (Step 2).

---

## Mode: --deep (5 agents)

⚠️ **SUBAGENTS DO NOT WRITE FILES** - They only RETURN text to main agent!

Launch 5 agents in parallel. Each agent prompt must include:
```
You are exploring a codebase. READ files from: [SOURCE_DIR]

DO NOT write any files. DO NOT use Write tool. Return your analysis as text.
```

### Agent 1: Architecture Explorer
```
Analyze and return:
- Directory structure & organization philosophy
- Entry points (all of them)
- Core abstractions & their relationships
- Dependencies (direct + transitive patterns)

Return your findings as markdown text. The main agent will write the file.
```

### Agent 2: Code Snippets Collector
```
Analyze and return:
- Main entry point code
- Core implementations with context
- Interesting patterns & idioms
- Error handling examples

Return your findings as markdown text. The main agent will write the file.
```

### Agent 3: Quick Reference Builder
```
Analyze and return:
- What it does (comprehensive)
- Installation (all methods)
- Key features with examples
- Configuration options

Return your findings as markdown text. The main agent will write the file.
```

### Agent 4: Testing & Quality Patterns
```
Analyze and return:
- Test structure and conventions
- Test utilities and helpers
- Mocking patterns
- Coverage approach

Return your findings as markdown text. The main agent will write the file.
```

### Agent 5: API & Integration Surface
```
Analyze and return:
- Public API documentation
- Extension points / hooks
- Integration patterns
- Plugin/middleware architecture

Return your findings as markdown text. The main agent will write the file.
```

**After all agents return**, main agent writes files to DOCS_DIR (Step 2).

## Step 2: Main Agent Writes Files

**CRITICAL: Only the MAIN agent writes files! Collect subagent output first.**

Wait for all subagents to complete. Each returns markdown text (not files).
Then use the Write tool to create files in DOCS_DIR.

### --fast mode (1 file)

Use Write tool to create:
- `[DOCS_DIR]/[TODAY]_OVERVIEW.md` ← Agent 1 output

### Default mode (3 files)

Use Write tool to create:
- `[DOCS_DIR]/[TODAY]_ARCHITECTURE.md` ← Agent 1 output
- `[DOCS_DIR]/[TODAY]_CODE-SNIPPETS.md` ← Agent 2 output
- `[DOCS_DIR]/[TODAY]_QUICK-REFERENCE.md` ← Agent 3 output

### --deep mode (5 files)

Use Write tool to create:
- `[DOCS_DIR]/[TODAY]_ARCHITECTURE.md` ← Agent 1 output
- `[DOCS_DIR]/[TODAY]_CODE-SNIPPETS.md` ← Agent 2 output
- `[DOCS_DIR]/[TODAY]_QUICK-REFERENCE.md` ← Agent 3 output
- `[DOCS_DIR]/[TODAY]_TESTING.md` ← Agent 4 output
- `[DOCS_DIR]/[TODAY]_API-SURFACE.md` ← Agent 5 output

## Step 3: Create/Update Hub File ([REPO].md)

```markdown
# [REPO] Learning Index

## Source
- **Origin**: $ROOT/ψ/learn/$OWNER/$REPO/origin/
- **GitHub**: https://github.com/$OWNER/$REPO

## Latest Exploration
**Date**: [TODAY]
**Mode**: [fast|default|deep]

**Files**:
<!-- --fast mode -->
- [[YYYY-MM-DD_OVERVIEW|Overview]]

<!-- default mode -->
- [[YYYY-MM-DD_ARCHITECTURE|Architecture]]
- [[YYYY-MM-DD_CODE-SNIPPETS|Code Snippets]]
- [[YYYY-MM-DD_QUICK-REFERENCE|Quick Reference]]

<!-- --deep mode adds -->
- [[YYYY-MM-DD_TESTING|Testing Patterns]]
- [[YYYY-MM-DD_API-SURFACE|API Surface]]

## Timeline
### YYYY-MM-DD ([mode] exploration)
- [Key insights from this run]
```

## Output Summary

### --fast mode
```markdown
## 📚 Quick Learn: [REPO]

**Mode**: fast (1 agent)
**Files**: 2

| File | Description |
|------|-------------|
| [REPO].md | Hub + timeline |
| [TODAY]_OVERVIEW.md | Quick overview |

$ROOT/ψ/learn/$OWNER/$REPO/
```

### Default mode
```markdown
## 📚 Learning Complete: [REPO]

**Mode**: default (3 agents)
**Files**: 4

| File | Description |
|------|-------------|
| [REPO].md | Hub + timeline |
| [TODAY]_ARCHITECTURE.md | Structure |
| [TODAY]_CODE-SNIPPETS.md | Code examples |
| [TODAY]_QUICK-REFERENCE.md | Usage guide |

### Key Insights
[2-3 interesting things learned]

$ROOT/ψ/learn/$OWNER/$REPO/
```

### --deep mode
```markdown
## 📚 Deep Learning Complete: [REPO]

**Mode**: deep (5 agents)
**Files**: 6

| File | Description |
|------|-------------|
| [REPO].md | Hub + timeline |
| [TODAY]_ARCHITECTURE.md | Structure & design |
| [TODAY]_CODE-SNIPPETS.md | Code examples |
| [TODAY]_QUICK-REFERENCE.md | Usage guide |
| [TODAY]_TESTING.md | Test patterns |
| [TODAY]_API-SURFACE.md | Public API |

### Key Insights
[3-5 interesting things learned]

### Deep Dive Notes
[Notable patterns, gotchas, or insights worth remembering]

$ROOT/ψ/learn/$OWNER/$REPO/
```

## .gitignore Pattern

For Oracles that want to commit docs but ignore source:

```gitignore
# Keep learned docs
!ψ/learn/

# Ignore origin symlinks (source in ghq)
ψ/learn/**/origin
```

## Notes

- `--fast`: 1 agent, quick scan for "what is this?"
- Default: 3 agents in parallel, good balance
- `--deep`: 5 agents, comprehensive for complex repos
- Haiku for exploration = cost effective
- Main reviews = quality gate
- `origin/` structure allows easy offload
- `.origins` manifest enables `--init` restore
