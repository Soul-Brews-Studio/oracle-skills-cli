---
name: learn
description: Explore a codebase with 3 parallel Haiku agents and create documentation. Use when user says "learn [repo]", "explore codebase", "study this repo", or wants to understand a project.
---

# /learn - Deep Dive Learning Pattern

Explore a codebase with 3 parallel Haiku agents → create organized documentation.

## Usage

```
/learn [url]             # Auto: clone via /project learn, then explore
/learn [slug]            # Use slug from ψ/memory/slugs.yaml
/learn [repo-path]       # Path to repo
/learn [repo-name]       # Finds in ψ/learn/repo/
```

## Step 0: Detect Input Type + Resolve Path

```bash
date "+🕐 %H:%M (%A %d %B %Y)"
```

### If URL (http* or owner/repo format)

**Clone using ghq directly:**
```bash
# Clone to ψ/learn/repo/ using ghq
GHQ_ROOT="ψ/learn/repo" ghq get "$INPUT"
```

This uses ghq to clone to ψ/learn/repo/github.com/owner/name

### Then resolve path:
```bash
# Fast path from slugs
grep "^$INPUT:" ψ/memory/slugs.yaml | cut -d: -f2

# Or find symlink
find ψ/learn/repo -maxdepth 6 -type l | grep -i "$INPUT" | head -1
```

## Scope

**For external repos**: Clone with script first, then explore
**For local projects** (in `specs/`, `ψ/lib/`): Read directly

## Step 1: Launch 3 Haiku Agents (PARALLEL)

```bash
mkdir -p ψ/learn/[REPO_NAME]
```

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
cat > ψ/learn/[REPO_NAME]/[TODAY]_ARCHITECTURE.md << 'EOF'
[Agent 1 output]
EOF

cat > ψ/learn/[REPO_NAME]/[TODAY]_CODE-SNIPPETS.md << 'EOF'
[Agent 2 output]
EOF

cat > ψ/learn/[REPO_NAME]/[TODAY]_QUICK-REFERENCE.md << 'EOF'
[Agent 3 output]
EOF
```

## Step 3: Create Hub File ([REPO-NAME].md)

```markdown
# [REPO_NAME] Learning Index

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
## 📚 Learning Complete: [REPO_NAME]

**Date**: [TODAY]

### Created Documentation
| File | Description |
|------|-------------|
| [REPO-NAME].md | Hub + timeline |
| [TODAY]_ARCHITECTURE.md | Structure |
| [TODAY]_CODE-SNIPPETS.md | Code examples |
| [TODAY]_QUICK-REFERENCE.md | Usage guide |

### Key Insights
[2-3 interesting things learned]

### Location
ψ/learn/[REPO_NAME]/
```

## Notes

- 3 agents in parallel = fast
- Haiku for exploration = cost effective
- Main reviews = quality gate
