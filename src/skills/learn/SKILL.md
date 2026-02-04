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

**IMPORTANT: Capture ROOT directory first (before any cd):**
```bash
ROOT="$(pwd)"
echo "Learning from: $ROOT"
```

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

## Step 1: Detect Mode

Check arguments for `--fast` or `--deep`:
- `--fast` → Single overview agent
- `--deep` → 5 parallel agents
- (neither) → 3 parallel agents (default)

---

## Mode: --fast (1 agent)

Target directory for docs: `$ROOT/ψ/learn/$OWNER/$REPO/`
Source code path: `$ROOT/ψ/learn/$OWNER/$REPO/origin/`

### Single Agent: Quick Overview
- What is this project? (1 sentence)
- Key files to look at
- How to use it (install + basic example)
- Notable patterns or tech
- Output: `[TODAY]_OVERVIEW.md`

**Skip to Step 2 (fast)** after this agent completes.

---

## Mode: Default (3 agents)

Target directory for docs: `$ROOT/ψ/learn/$OWNER/$REPO/`
Source code path: `$ROOT/ψ/learn/$OWNER/$REPO/origin/`

### Agent 1: Architecture Explorer
- Directory structure
- Entry points
- Core abstractions
- Dependencies

### Agent 2: Code Snippets Collector
- Main entry point code
- Core implementations
- Interesting patterns

### Agent 3: Quick Reference Builder
- What it does
- Installation
- Key features
- Usage patterns

---

## Mode: --deep (5 agents)

Target directory for docs: `$ROOT/ψ/learn/$OWNER/$REPO/`
Source code path: `$ROOT/ψ/learn/$OWNER/$REPO/origin/`

### Agent 1: Architecture Explorer
- Directory structure & organization philosophy
- Entry points (all of them)
- Core abstractions & their relationships
- Dependencies (direct + transitive patterns)

### Agent 2: Code Snippets Collector
- Main entry point code
- Core implementations with context
- Interesting patterns & idioms
- Error handling examples

### Agent 3: Quick Reference Builder
- What it does (comprehensive)
- Installation (all methods)
- Key features with examples
- Configuration options

### Agent 4: Testing & Quality Patterns
- Test structure and conventions
- Test utilities and helpers
- Mocking patterns
- Coverage approach
- Output: `[TODAY]_TESTING.md`

### Agent 5: API & Integration Surface
- Public API documentation
- Extension points / hooks
- Integration patterns
- Plugin/middleware architecture
- Output: `[TODAY]_API-SURFACE.md`

## Step 2: Main Agent Writes Files

### --fast mode (1 file)

```bash
cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_OVERVIEW.md << 'EOF'
[Single agent output]
EOF
```

### Default mode (3 files)

```bash
cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_ARCHITECTURE.md << 'EOF'
[Agent 1 output]
EOF

cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_CODE-SNIPPETS.md << 'EOF'
[Agent 2 output]
EOF

cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_QUICK-REFERENCE.md << 'EOF'
[Agent 3 output]
EOF
```

### --deep mode (5 files)

```bash
cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_ARCHITECTURE.md << 'EOF'
[Agent 1 output]
EOF

cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_CODE-SNIPPETS.md << 'EOF'
[Agent 2 output]
EOF

cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_QUICK-REFERENCE.md << 'EOF'
[Agent 3 output]
EOF

cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_TESTING.md << 'EOF'
[Agent 4 output]
EOF

cat > $ROOT/ψ/learn/$OWNER/$REPO/[TODAY]_API-SURFACE.md << 'EOF'
[Agent 5 output]
EOF
```

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
