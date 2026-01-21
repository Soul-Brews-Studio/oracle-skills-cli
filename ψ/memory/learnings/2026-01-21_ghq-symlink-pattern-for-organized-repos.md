# ghq + Symlink Pattern for Organized Repos

**Date**: 2026-01-21
**Context**: oracle-skills-cli /learn skill refactoring
**Confidence**: High

## Key Learning

When organizing external repositories for learning or development, the cleanest pattern is to let ghq manage the actual clones in its default location, then create symlinks with a cleaner organizational structure.

The anti-pattern is overriding `GHQ_ROOT` to clone directly into your organized structure - this creates deep nesting like `ψ/learn/repo/github.com/owner/repo` which is confusing and redundant.

The correct pattern separates concerns: ghq handles git operations, your organizational structure handles human-friendly navigation.

## The Pattern

```bash
# 1. Clone to ghq default root (e.g., ~/Code/github.com/owner/repo)
ghq get -u "$URL"

# 2. Extract owner and repo
GHQ_ROOT=$(ghq root)
OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|')
REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|')

# 3. Create org/repo symlink structure
mkdir -p "ψ/learn/$OWNER"
ln -sf "$GHQ_ROOT/github.com/$OWNER/$REPO" "ψ/learn/$OWNER/$REPO"
```

**Result**:
```
ψ/learn/
└── Soul-Brews-Studio/
    └── oracle-skills-cli -> ~/Code/github.com/Soul-Brews-Studio/oracle-skills-cli
```

## Why This Matters

1. **Single source of truth**: Actual repo lives in one place (ghq root)
2. **No duplication**: Symlinks are lightweight pointers
3. **Clean paths**: `ψ/learn/owner/repo` vs `ψ/learn/repo/github.com/owner/repo`
4. **Collision-free**: org/repo structure prevents name collisions
5. **ghq integration**: `ghq get -u` updates work, `ghq list` finds repos

## Tags

`ghq`, `symlink`, `organization`, `learn-skill`, `project-skill`, `best-practice`
