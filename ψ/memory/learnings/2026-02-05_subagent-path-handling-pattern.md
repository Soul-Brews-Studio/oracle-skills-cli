# Subagent Path Handling Pattern

**Date**: 2026-02-05
**Context**: Fixing /learn skill where subagents wrote files to wrong location
**Confidence**: High

## Key Learning

When spawning subagents that need to write files, **shell variables don't expand across agent boundaries**. Passing `$ROOT/ψ/learn/$OWNER/$REPO/` to a subagent sends the literal string with dollar signs - the variables are never replaced.

The fix is to calculate ALL paths in the main agent with actual values, then pass literal absolute paths to subagents.

## The Pattern

```bash
# Step 1: Capture root FIRST (before any cd or operations)
ROOT="$(pwd)"
TODAY=$(date +%Y-%m-%d)
TIME=$(date +%H%M)

# Step 2: Calculate paths with actual values
DOCS_DIR="$ROOT/ψ/learn/$OWNER/$REPO/$TODAY"
SOURCE_DIR="$ROOT/ψ/learn/$OWNER/$REPO/origin"

# Step 3: Create directories BEFORE spawning agents
mkdir -p "$DOCS_DIR"

# Step 4: Pass LITERAL paths to agents (no variables!)
# Tell agent: "Write to /home/user/repo/ψ/learn/acme/lib/2026-02-05/1033_ARCH.md"
# NOT: "Write to $DOCS_DIR/$TIME_ARCH.md"
```

**Subagent prompt template:**
```
READ source from: [LITERAL_SOURCE_DIR]
WRITE output to: [LITERAL_DOCS_DIR]/[TIME]_FILENAME.md

⚠️ Write to DOCS_DIR, NOT inside origin/ (origin is a symlink!)
```

## Why This Matters

- Prevents files being written to wrong repository (via symlink confusion)
- Enables reliable parallel agent coordination
- Makes debugging easier (paths are explicit in prompts)
- Applies to ALL skills that spawn subagents: /learn, /trace, /rrr

## Related Patterns

- Symlinks in gitignore: `ψ/learn/**/origin` (no trailing slash - symlinks are files)
- Time-prefix files: `HHMM_filename.md` prevents same-day collision
- Skill visibility: `user-invocable: false` hides from menu but allows auto-invoke

## Tags

`subagent`, `path-handling`, `parallel-agents`, `learn-skill`, `debugging`
