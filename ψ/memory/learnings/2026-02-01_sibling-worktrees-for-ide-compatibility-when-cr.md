---
title: # Sibling Worktrees for IDE Compatibility
tags: [git, worktree, vscode, ide, parallel-development, maw]
created: 2026-02-01
source: rrr: Soul-Brews-Studio/oracle-skills-cli
---

# # Sibling Worktrees for IDE Compatibility

# Sibling Worktrees for IDE Compatibility

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
REPO_NAME=$(basename $(pwd))
PARENT_DIR=$(dirname $(pwd))
WT_DIR="$PARENT_DIR/$REPO_NAME.wt"
git worktree add "$WT_DIR/1" -b agents/1
```

Each worktree can be opened as a separate VS Code window. This is compatible with MAW (Multi-Agent Workflow Kit) branch naming.

---
*Added via Oracle Learn*
