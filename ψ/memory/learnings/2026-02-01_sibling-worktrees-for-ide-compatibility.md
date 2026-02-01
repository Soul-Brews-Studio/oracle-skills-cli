# Sibling Worktrees for IDE Compatibility

**Date**: 2026-02-01
**Context**: Designing /worktree skill for oracle-skills-cli
**Confidence**: High

## Key Learning

When creating git worktrees for parallel development, place them as **siblings** to the main repository, not nested inside it. This prevents IDEs like VS Code from indexing all worktree files when the main project is opened.

**Wrong approach** (nested):
```
repo/
├── agents/1/    ← VS Code indexes this too!
├── agents/2/    ← And this!
└── src/
```

**Right approach** (sibling):
```
parent/
├── repo/        ← Main workspace (open this)
└── repo.wt/     ← Worktrees live here
    ├── 1/       ← Open separately in VS Code
    └── 2/       ← Each is isolated
```

## The Pattern

```bash
# Get sibling directory
REPO_NAME=$(basename $(pwd))
PARENT_DIR=$(dirname $(pwd))
WT_DIR="$PARENT_DIR/$REPO_NAME.wt"

# Create worktree as sibling
mkdir -p "$WT_DIR"
git worktree add "$WT_DIR/1" -b agents/1
```

Each worktree can be opened as a separate VS Code window with `code "$WT_DIR/1"`.

## Why This Matters

1. **IDE Performance**: VS Code won't slow down indexing thousands of duplicate files
2. **Clean Search**: Find-in-files won't show results from other worktrees
3. **Git Status**: Main repo's `git status` stays clean
4. **Separation of Concerns**: Each agent workspace is truly isolated

This pattern is compatible with MAW (Multi-Agent Workflow Kit) which uses the same branch naming convention (`agents/1`, `agents/2`).

## Tags

`git`, `worktree`, `vscode`, `ide`, `parallel-development`, `maw`
