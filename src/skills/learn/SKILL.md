---
name: learn
description: Explore a codebase with 3 parallel Haiku agents and create documentation. Use when user says "learn [repo]", "explore codebase", "study this repo", or wants to understand a project.
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
rm ψ/learn/owner/repo/origin   # Remove symlink
ghq rm owner/repo              # Remove source
# Docs remain in ψ/learn/owner/repo/
```

## /learn --init

Restore all origins after cloning (like `git submodule init`):

```bash
# Read .origins manifest and restore symlinks
while read repo; do
  ghq get -u "https://github.com/$repo"
  OWNER=$(dirname "$repo")
  REPO=$(basename "$repo")
  mkdir -p "ψ/learn/$OWNER/$REPO"
  ln -sf "$(ghq root)/github.com/$repo" "ψ/learn/$OWNER/$REPO/origin"
  echo "✓ Restored: $repo"
done < ψ/learn/.origins
```

## Step 0: Detect Input Type + Resolve Path

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
```

### If URL (http* or owner/repo format)

**Clone, create docs dir, symlink origin, update manifest:**
```bash
# Replace [URL] with actual URL
URL="[URL]"
ghq get -u "$URL" && \
  GHQ_ROOT=$(ghq root) && \
  OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|') && \
  REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|') && \
  mkdir -p "ψ/learn/$OWNER/$REPO" && \
  ln -sf "$GHQ_ROOT/github.com/$OWNER/$REPO" "ψ/learn/$OWNER/$REPO/origin" && \
  echo "$OWNER/$REPO" >> ψ/learn/.origins && \
  sort -u -o ψ/learn/.origins ψ/learn/.origins && \
  echo "✓ Ready: ψ/learn/$OWNER/$REPO/origin → source"
```

**Verify:**
```bash
ls -la ψ/learn/$OWNER/$REPO/
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

## Step 1: Launch 3 Haiku Agents (PARALLEL)

Target directory for docs: `ψ/learn/$OWNER/$REPO/`
Source code path: `ψ/learn/$OWNER/$REPO/origin/`

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

## Step 2: Main Agent Writes Files

```bash
cat > ψ/learn/$OWNER/$REPO/[TODAY]_ARCHITECTURE.md << 'EOF'
[Agent 1 output]
EOF

cat > ψ/learn/$OWNER/$REPO/[TODAY]_CODE-SNIPPETS.md << 'EOF'
[Agent 2 output]
EOF

cat > ψ/learn/$OWNER/$REPO/[TODAY]_QUICK-REFERENCE.md << 'EOF'
[Agent 3 output]
EOF
```

## Step 3: Create Hub File ([REPO].md)

```markdown
# [REPO] Learning Index

## Source
- **Origin**: ψ/learn/$OWNER/$REPO/origin/
- **GitHub**: https://github.com/$OWNER/$REPO

## Latest Exploration
**Date**: [TODAY]

**Files**:
- [[YYYY-MM-DD_ARCHITECTURE|Architecture]]
- [[YYYY-MM-DD_CODE-SNIPPETS|Code Snippets]]
- [[YYYY-MM-DD_QUICK-REFERENCE|Quick Reference]]

## Timeline
### YYYY-MM-DD (First exploration)
- Initial discovery
- Core: [main pattern]
```

## Output Summary

```markdown
## 📚 Learning Complete: [REPO]

**Date**: [TODAY]

### Created Documentation
| File | Description |
|------|-------------|
| [REPO].md | Hub + timeline |
| [TODAY]_ARCHITECTURE.md | Structure |
| [TODAY]_CODE-SNIPPETS.md | Code examples |
| [TODAY]_QUICK-REFERENCE.md | Usage guide |

### Key Insights
[2-3 interesting things learned]

### Location
ψ/learn/$OWNER/$REPO/
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

- 3 agents in parallel = fast
- Haiku for exploration = cost effective
- Main reviews = quality gate
- `origin/` structure allows easy offload
- `.origins` manifest enables `--init` restore
