---
name: worktree
description: >-
  Create, inspect, exit, or clean an isolated Git worktree using a fetched explicit
  base and exact ownership proof. Stop if the live root is dirty, detached, or
  diverged. Use for parallel edits, spikes, or safe isolation.
argument-hint: "[<name> | list | exit | clean]"
hidden: true
explicit-only: true
metadata:
  internal: true
---

# /worktree — Isolated Work From an Explicit Base

**Fail-closed invariant:** if the live/root checkout is dirty, detached, on the
wrong branch, ahead, behind, or diverged from its fetched integration ref, STOP.
Do not create a task worktree and do not repair the root implicitly.

## Create

1. Read the applicable repo instructions and current-session authority. Discover
   the canonical/root checkout from `git worktree list --porcelain`; the current
   directory may already be another worktree.
2. Record root path/branch/HEAD/status, all registered worktree path/branch pairs,
   and all remotes. Require the live/root checkout to be on its declared integration
   branch, clean, non-detached, and neither ahead, behind, nor diverged from its
   freshly fetched integration ref. Fail closed; do not switch, pull, reset, clean,
   stash, or otherwise repair the live root.
3. Read repo policy before choosing the integration base. If policy selects a
   remote/ref such as `upstream/alpha`, record that choice and SHA. With no policy,
   use `origin/main` only after `git ls-remote --symref origin HEAD` proves the
   remote HEAD is `refs/heads/main`; a non-main HEAD without policy is ambiguous
   and must stop. Missing remote/ref or failed fetch is a stop condition. Never
   fall back to current HEAD.
4. Choose an absolute owner-writable path and unique task branch. Reject a path or
   branch already present in `git worktree list --porcelain`.
5. Create from the exact fetched commit:

   ```bash
   git fetch --prune <base-remote> <base-branch>
   BASE_SHA=$(git rev-parse --verify <base-remote>/<base-branch>^{commit})
   git worktree add -b <task-branch> <absolute-task-path> "$BASE_SHA"
   ```

6. Verify the task worktree path, branch, HEAD=`BASE_SHA`, clean status, ownership,
   and writability. Report the tuple. Work only there; leave the root untouched.

## List

Use porcelain output and show every registered worktree's exact path, HEAD, branch
or detached state, and dirty status. Do not infer ownership from age, directory name,
or naming convention. A concurrent worktree is unrelated unless this session created
it and recorded its exact tuple.

## Exit

Leaving a directory does not imply removal. Preserve the branch and worktree by
default and report their exact state. Worktree removal is a separate cleanup action:
require task ownership, no active consumer, a clean status, and proof that required
commits are durably reachable. Dirty removal or `--force` needs explicit destructive
authority plus a durable backup; otherwise stop.

## Clean

Never loop over globs and remove every clean-looking directory. Build an exact
allow-list from worktrees created by this task/session, then re-check path, branch,
HEAD, cleanliness, ownership, consumer, and durable reachability immediately before
each removal. `git worktree prune` and local branch deletion are separate actions.
Remote-ref deletion is never automatic and requires its own current-session scope.

ARGUMENTS: $ARGUMENTS
