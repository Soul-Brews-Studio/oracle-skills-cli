---
name: merged
description: >-
  Verify an exact task head was merged, then perform only separately authorized
  deployment and cleanup tiers. Use after a PR is reported merged.
argument-hint: "[<pr-number-or-url>]"
hidden: true
explicit-only: true
metadata:
  internal: true
---

# /merged — Verified Post-Merge Lifecycle

"Merged" is a claim to verify, not permission to pull a live checkout or delete refs.

## 1. Establish the exact task

Record repository identity, PR URL/number, task branch, expected head SHA, merge
method, merge commit (when present), base remote/ref, and current-session authority.
Fetch the named refs. Fail closed on a missing remote/ref, ambiguous PR, detached
task state, unexpected head SHA, or failed fetch.

## 2. Prove integration

Use the hosting API as primary evidence: the PR must be merged into the expected base
and its recorded `headRefOid` must equal the reviewed/pushed task SHA. Bind required
CI checks to that exact head SHA.

Then classify local reachability rather than assuming one merge shape:

- merge commit or fast-forward: `merge-base --is-ancestor <task-sha> <base-sha>`;
- rebase merge: verify the PR/API head and compare the committed change against the
  merged base, because original commit IDs may not be ancestors;
- squash merge: verify PR/API head plus merge commit and compare the task diff/patch
  against the squash result, because the task head is normally not an ancestor.

If API and ancestry/diff evidence disagree, stop. Do not delete anything.

## 3. Keep action tiers separate

1. Verification is read-only.
2. Updating a live/root checkout is deployment. It requires explicit deployment
   authority, an exact approved merged SHA, rollback, and a root that is on its
   declared integration branch, clean, non-detached, owner-writable, and ff-only.
   A dirty/ahead/behind/diverged root fails closed; never switch, pull, reset, clean,
   or stash it as an implicit repair.
3. Removing the exact task worktree requires task ownership, no active consumer,
   clean status, and durable reachability proof.
4. Deleting the local task branch is separate. `git branch -d` is valid only when
   Git's ancestry check accepts it (normally merge/fast-forward). For rebase or
   squash evidence, preserve the branch by default: never substitute `-D`; if safe
   deletion refuses, stop and report the exact remaining ref.
5. Deleting a remote task ref is a final, separate tier. Never run `git push --delete`
   unless the current session directly names the remote-ref deletion scope. A merged
   PR, cleanup request, successful local deletion, or hosting auto-delete setting is
   not authority.

Never force-push or rewrite history. Report exact SHAs, evidence for the merge shape,
deployment state, each cleanup action actually performed, rollback, and remaining refs.

ARGUMENTS: $ARGUMENTS
