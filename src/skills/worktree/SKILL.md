---
name: worktree
description: Git worktree for parallel work. Use when user says "worktree", "parallel work", "new agent", "start parallel".
---

# /worktree

Manage git worktrees for parallel agent work.

## Usage

```
/worktree              # List all worktrees
/worktree new          # Create next agents/N
/worktree <N>          # Show path to agents/N
/worktree remove <N>   # Remove agents/N worktree
```

---

## Step 0: Parse Arguments

```
ARGUMENTS: $ARGUMENTS
```

- No args, `list`, or `status` → **List with Status**
- `new` → **Create New**
- Number (1, 2, 3...) → **Show Path**
- `remove N` → **Remove**

---

## List Worktrees (default)

Aliases: `/worktree`, `/worktree list`, `/worktree status`

Just run:

```bash
git worktree list
```

Output is already clean and readable:
```
/path/to/repo       abc1234 [main]
/path/to/repo.wt/1  def5678 [agents/1]
/path/to/repo.wt/2  ghi9012 [agents/2]
```

---

## Create New Agent Worktree

When user says `/worktree new`:

Worktrees are created as **siblings** (not nested) to avoid VS Code indexing issues:

```bash
# Get repo name and parent dir
REPO_NAME=$(basename $(pwd))
PARENT_DIR=$(dirname $(pwd))
WT_DIR="$PARENT_DIR/$REPO_NAME.wt"

# Find next available number
mkdir -p "$WT_DIR"
EXISTING=$(ls -d "$WT_DIR"/*/ 2>/dev/null | wc -l | tr -d ' ')
NEXT=$((EXISTING + 1))

# Create worktree with new branch
git worktree add "$WT_DIR/$NEXT" -b agents/$NEXT

# Report
echo "Created: $WT_DIR/$NEXT"
echo "Branch: agents/$NEXT"
```

**After creating, display prominently:**

```
Worktree Created

  Path:   /path/to/repo.wt/N
  Branch: agents/N

Open in VS Code: code /path/to/repo.wt/N
```

**Structure:**
```
parent/
├── repo/           # main (this workspace)
└── repo.wt/        # worktrees (sibling)
    ├── 1/          # branch: agents/1
    └── 2/          # branch: agents/2
```

---

## Show Agent Path

When user says `/worktree N` (where N is a number):

```bash
REPO_NAME=$(basename $(pwd))
PARENT_DIR=$(dirname $(pwd))
WT_PATH="$PARENT_DIR/$REPO_NAME.wt/$N"

if [ -d "$WT_PATH" ]; then
  echo "Path: $WT_PATH"
  echo "Branch: agents/$N"
  echo ""
  echo "Open: code $WT_PATH"
else
  echo "Worktree $N not found. Use /worktree new to create."
fi
```

---

## Remove Agent Worktree

When user says `/worktree remove N`:

```bash
REPO_NAME=$(basename $(pwd))
PARENT_DIR=$(dirname $(pwd))
WT_PATH="$PARENT_DIR/$REPO_NAME.wt/$N"

# Remove the worktree
git worktree remove "$WT_PATH"

# Optionally delete the branch
git branch -d agents/$N
```

**Confirm before removing** - ask user if they want to also delete the branch.

---

## Philosophy

- **Sibling worktrees** - Not nested, so VS Code/IDE indexes separately
- **Each agent = own branch + directory** - Open as separate workspace
- **Use `git -C path`** not cd - respect worktree boundaries
- **Sync via PR to main** - never force push
- **Nothing is deleted** - branches can be recovered

---

## Quick Reference

| Command | Result |
|---------|--------|
| `/worktree` | List all worktrees |
| `/worktree new` | Create `agents/N` (auto-numbered) |
| `/worktree 1` | Show path to `agents/1` |
| `/worktree remove 2` | Remove `agents/2` |
