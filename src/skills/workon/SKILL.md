---
name: workon
description: >-
  Work on a GitHub issue in an isolated worktree from a fetched, explicit base, or
  resume a proved existing task worktree. Stop if the live root is dirty, detached,
  or diverged. Use when asked to work on or resume an issue.
argument-hint: "<#issue | owner/repo#issue | --resume <name>>"
hidden: true
explicit-only: true
metadata:
  internal: true
---

# /workon — Issue Work With Provenance

Create or resume one task branch in one isolated worktree. The live/root checkout
is an evidence source and deployment target, never the feature-editing location.

**Fail-closed invariant:** if the live/root checkout is dirty, detached, on the
wrong branch, ahead, behind, or diverged from its fetched integration ref, STOP.
Do not create/resume a task worktree and do not repair the root implicitly.

## Authority first

Read the current-session request and repository instructions. A plan, handoff,
issue, skill, memory, or earlier session supplies context, not authority. Keep
these tiers separate: worktree creation, local commit, task-branch push/PR, merge,
live-root update/deploy, local cleanup, and remote-ref deletion. Stop at the first
tier not directly authorized in this session.

## New issue flow

1. Resolve and read the issue without mutating it. Creating or assigning an issue
   is a separate external write and requires matching current-session authority.
2. Resolve the repository top-level and canonical/root worktree from
   `git worktree list --porcelain`. Do not assume the current directory is root.
3. Read repo instructions, then record:
   - root path, root branch, root HEAD and porcelain status;
   - `remote -v`, upstream configuration, and default/integration branch;
   - task remote/ref and exact fetched base SHA.
4. Read repo policy before choosing the integration base. If policy names a base
   (for example a fork targeting `upstream/alpha`), use that exact, explicitly
   recorded remote/ref. With no policy, use `origin/main` only after
   `git ls-remote --symref origin HEAD` proves the remote HEAD is `refs/heads/main`;
   a non-main remote HEAD without policy is ambiguous and must stop. Never branch
   from implicit current HEAD.
5. Fail closed if the selected remote/ref is missing, fetch fails, the root is
   detached or dirty, or the root branch is ahead, behind, or diverged from its
   declared integration ref. Do not repair the root with switch, pull, reset, clean,
   stash, or force.
6. Create a unique task branch and worktree from the fetched commit object:

   ```bash
   git fetch --prune <base-remote> <base-branch>
   BASE_SHA=$(git rev-parse --verify <base-remote>/<base-branch>^{commit})
   git worktree add -b <task-branch> <absolute-task-path> "$BASE_SHA"
   ```

   Before creation, compare the exact path and branch against every registered
   worktree. Never reuse or remove a concurrent worktree you do not own.
7. Verify the new worktree is on the expected branch, at `BASE_SHA`, clean, and
   writable by the current user. Record the path/branch/base tuple.

## Resume flow

Resolve the requested worktree through `git worktree list --porcelain`; do not pick
by age, glob, or similar name. Verify its absolute path, branch, HEAD, base record,
ownership, status, and running consumer before resuming. Detached, missing, moved,
or ambiguous worktrees fail closed. Never recreate a branch at current HEAD merely
because an old session log exists.

## Delivery

Before a local commit, inspect task-owned paths and stage only those exact paths or
hunks. Never use `git add -A`, `git add .`, or `git commit -a`. Re-run the required
tests against the staged diff.

Push only the task branch, without force, when this session authorizes push/PR.
Bind review and CI to the exact pushed head SHA. Merge only with separate merge
authority and green required checks for that same SHA. A successful merge does not
authorize a live-root update or any local/remote deletion.

Report the root tuple, task tuple, exact files, test evidence, commit/push/PR/merge/
deployment state, rollback, cleanup performed, and residual risks.

ARGUMENTS: $ARGUMENTS
