# /incubate --wt — crash, orphan, and recovery reference (#487)

Read this when something is **already** broken. The happy path lives inline in
`SKILL.md`; nothing here is needed to claim, work in, or retire a body.

Everything below was reproduced on git 2.50.1 / macOS APFS / stock bash 3.2.57.

---

## The registry

There is no manifest file to repair. The registry is git's own:

```bash
MOTHER="$(ghq root)/github.com/OWNER/REPO"
WT_ROOT="${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}"
git -C "$MOTHER" worktree list --porcelain -z | tr '\0' '\n'
```

**Always `-z`, never plain `--porcelain`.** git C-quotes the whole `locked` line
as soon as the reason contains a non-ASCII byte or a `"`, so a Thai `--task`
turns `locked incubate|…` into `locked "incubate|…|\340\271\201…"` and every
`awk -F'|'` parse silently reads field 1 as `"incubate`. `-z` terminates records
with NUL and therefore never quotes; `tr '\0' '\n'` restores the exact shape the
awk programs expect. Requires git ≥ 2.36.

Each block is `worktree <path>`, `HEAD <sha>`, `branch <ref>`, optionally
`locked <reason>` or `prunable <why>`, then a blank line. The first block is
always the mother.

| Question | Command |
|---|---|
| Bodies on this machine | `git -C "$MOTHER" worktree list --porcelain -z \| tr '\0' '\n'` |
| Registered but gone | a `worktree <path>` whose `[ -d "<path>" ]` is false |
| Bodies on any machine | `git -C "$MOTHER" branch --list 'incubate/*'` |
| Bodies that survive machine loss | `git -C "$MOTHER" ls-remote --heads origin 'incubate/*'` |
| Who holds a body, and why | the `locked <reason>` line — `incubate\|who\|when\|task` |
| Work that would die with the mother | `git -C "$MOTHER" log --branches='incubate/*' --not --remotes` |

Extracting a path from that stream, use `sub(/^worktree /, ""); print $0` — not
`print $2`, which truncates at the first space and silently mangles any path
under a ghq root containing one.

Three lock-reason classes, and only three:

| field 1 | means | do |
|---|---|---|
| `incubate` | ours | parse `who \| when \| task` |
| `initializing` | **git's own** lock, written during `worktree add` (E11) | report the crash, offer the unlock, allow the offload afterwards |
| anything else | another tool's | `(locked by another tool)` — never parse, never break |

`initializing` must **not** be lumped in with "another tool". Doing so refuses
the offload of the body, refuses `--all-wt`, and therefore refuses the mother
offload too — permanently, with no `--force` to escape.

> **Do not detect dead bodies by grepping for `prunable`.** Measured on git
> 2.50.1: a **locked** worktree whose directory is gone carries no `prunable`
> line at all, and `git worktree prune` silently skips it. Since `/incubate`
> locks every body it creates, that is the *common* case. Test the directory.
> (A lock only ever protects its own entry — pruning unrelated worktrees in the
> same repo still works.)

---

## Edge-case matrix

| # | State | How it is detected | What /incubate does |
|---|---|---|---|
| E1 | Slug free | — | `add --lock --reason -b` (claim+own in one command) → symlink |
| E2 | Branch exists, no worktree (resume after offload) | `add` fails, no holder in `worktree list` | `git worktree add --lock --reason … <path> incubate/<slug>` → `♻ revived` |
| E3 | Branch held by a live body | `add` fails, holder found | print holder + task + tree + join/rename commands, **exit 1** |
| E4 | This agent's body already exists | its path is in `worktree list` **and** `[ -d ]` | `↩ attached`, **exit 0** — agents retry, that is not an error |
| E5 | Target dir exists, non-empty, git does not own it | `[ -e ]` + `ls -A`, **checked before `add`** | fail loud, touch nothing |
| E6 | Target dir exists but **empty** | `ls -A` empty | `worktree add` succeeds; harmless crash residue |
| E7 | Mother missing | `[ -d "$MOTHER/.git" ]` | `run /incubate OWNER/REPO first` |
| E8 | Mother has an unborn HEAD | `rev-parse --verify HEAD` fails | body starts from the unborn HEAD; the only case where a missing `--from` is allowed |
| E9 | Body directory deleted | its `worktree <path>` is registered but `[ -d ]` is false | **report** + print the heal command; never auto-run. `--wt` refuses rather than symlink ψ at nothing |
| E10 | Admin dir deleted, body kept | set-difference vs `worktree list` | **report only** — git cannot see it, so it must not be deleted |
| E11 | `kill -9` mid-checkout | porcelain says `locked initializing` (git writes this itself) | report as *crashed mid-create*, **not** as a foreign tool; heal below |
| E12 | Stale `index.lock` | `Unable to create '…/index.lock'` | blast radius is **one body** — the lock lives in that body's private admin dir |
| E13 | `--offload` on a dirty body | `git -C "$WT" status --porcelain` non-empty, probed **before** unlocking | print the save-it command; **never `--force`**, and **never drop the lock** |
| E14 | `--offload` on a locked body | `fatal: cannot remove a locked working tree, lock reason: …` | unlock only if the reason names this agent; else refuse and name the holder |
| E15 | `--flash --purge` while bodies live | `worktree list \| grep -c '^worktree '` > 1 | refuse, list the blocking bodies, `mv` the mother aside before any `rm` |
| E16 | Two machines, same slug | — | **unsolved.** Namespace is per-mother; conflict surfaces at push |
| E17 | Body on a different filesystem | — | **works.** A worktree's `.git` is an ASCII `gitdir:` pointer file, not a hardlink |
| E18 | `.origins` has duplicate lines | — | every reader normalises through a private `sort -u` snapshot |
| E19 | Foreign `worktree lock` reason | field 1 ∉ {`incubate`, `initializing`} | render `(locked by another tool)`, never parse, never break |
| E20 | Registered, on disk, **no ψ symlink** | in `worktree list`, but `[ -L ψ/…/wt/<slug>/origin ]` false | `--status` lists it as `⚠ (registered, no ψ link)`; heal by re-running the `--wt` claim |
| E21 | Mother deleted | every body says `fatal: not a git repository` | **only pushed `incubate/*` branches survive** — see below. Not reversible |
| E22 | `--wt` slug carries non-ASCII or a `"` in `--task` | — | `"` is folded to a space; non-ASCII is kept and read back via `--porcelain -z` |

E17 is worth stating plainly because the original issue assumed the opposite:
**there is no same-filesystem requirement.** Any check enforcing one is wrong.

E5 is worth stating plainly too: the `[ -e ]` guard has to run **before**
`worktree add -b`, not after it fails. Measured on git 2.50.1 — `add -b` creates
the branch ref *before* it validates the target path, so a failed add exits 128
having left `incubate/<slug>` behind, and the slug is then unusable forever while
every error message blames the branch instead of the directory.

---

## Error catalogue

| Message | Meaning | Fix |
|---|---|---|
| `fatal: a branch named 'incubate/X' already exists` | someone else won the claim, or the branch outlived its body | join the holder, or pick `X-2` |
| `fatal: cannot lock ref 'refs/heads/incubate/X'` | lost a simultaneous race by microseconds | retry, or pick another slug |
| `fatal: 'incubate/X' is already used by worktree at '…'` | a live body holds it | `cd` to the printed path |
| `fatal: '…' already exists` | a non-empty directory sits where the body should go | inspect it; it is not git's |
| `fatal: '…' contains modified or untracked files, use --force to delete it` | **working as designed** — the body has unsaved work | commit and push, then retire |
| `fatal: cannot remove a locked working tree, lock reason: incubate\|…` | a peer holds it — the reason names them | ask them, or `git worktree unlock <path>` if it is yours |
| `fatal: not a git repository` inside every body | the mother was deleted | **not recoverable by re-cloning** — only *pushed* `incubate/*` branches survive; see "Mother deleted" |
| `division by 0 (error token is "b")` | `declare -A` under stock bash 3.2 | never use associative arrays here |

---

## Heal recipes

Each of these is safe to run more than once. **None of them deletes work.**

```bash
MOTHER="$(ghq root)/github.com/OWNER/REPO"
WT="$WT_ROOT/OWNER/REPO/SLUG"       # WT_ROOT is defined under "The registry"
```

**E9 — registered, gone from disk.** The body directory was deleted; the branch
and all its commits are untouched. `--status` prints the right one of these two.

```bash
git -C "$MOTHER" worktree unlock "$WT"   # ONLY if --status said "locked"
git -C "$MOTHER" worktree prune          # drops the dead registration only
git -C "$MOTHER" branch --list 'incubate/*'   # confirm the work is still there
/incubate OWNER/REPO --wt SLUG           # re-materialize it (takes the resume path)
```

`prune` never touches the branch — verified. Nothing you committed is at risk.

**E10 — on disk, unknown to git.** The admin dir went but the files remain. git
cannot see this state at all, so `/incubate` only ever reports it.

```bash
ls -la "$WT"                             # inspect first — these files are real work
cp -R "$WT" "$WT.rescued"                # copy out anything you need
# then, and only then, decide what to do with the directory by hand
```

**E11 — `locked initializing`** (git set this itself after a `kill -9` during
checkout; the tree is half-populated). This is **git's own** lock, not another
tool's — `/incubate` says so explicitly and keeps the offload path open.

```bash
git -C "$WT" status                      # see what landed
git -C "$WT" checkout -- .               # restore the working tree from HEAD
git -C "$MOTHER" worktree unlock "$WT"   # clear git's own initializing lock
/incubate OWNER/REPO --wt SLUG           # re-claim it under your own reason
```

Treating `initializing` as a foreign lock is what made this state fatal: the
body refuses to offload, `--all-wt` refuses, and the mother offload then refuses
because a body is still live — a closed loop with no `--force` to break it.

**E12 — stale `index.lock`.** Only this body is affected; siblings keep working.

```bash
ls -l "$MOTHER/.git/worktrees/SLUG/index.lock"   # confirm no live git process
mv "$MOTHER/.git/worktrees/SLUG/index.lock" /tmp/  # move, do not delete
```

**E14 — locked by a peer.** Do not unlock someone else's body. The reason line
names them:

```bash
git -C "$MOTHER" worktree list --porcelain -z | tr '\0' '\n' | grep -A3 "worktree $WT"
```

**Mother deleted.** Every body reports `fatal: not a git repository`. **This is
not reversible by re-cloning.** A body owns only its files; its admin directory
(`<mother>/.git/worktrees/<slug>` — HEAD, index, gitdir), its `incubate/<slug>`
ref, and **every object it ever committed** lived inside the deleted `.git`.

Measured: body `fix-auth` with one unpushed commit `d133865`; mother removed;
mother re-cloned from the remote. Result — `worktree list` shows the mother
alone, `$MOTHER/.git/worktrees` does not exist, `branch --list 'incubate/*'` is
empty, `git -C "$WT" status` still says `fatal: not a git repository`, and
`git cat-file -t d133865` says `could not get object info`. The commit is gone.

Only **pushed** branches survive. Recovery:

```bash
cp -R "$WT" "$WT.rescued"                          # FIRST — the files are still there
ghq get "https://github.com/OWNER/REPO"            # restore the mother
git -C "$MOTHER" ls-remote --heads origin 'incubate/*'   # what actually survived
/incubate OWNER/REPO --wt SLUG                     # re-materialize each survivor
# then diff $WT.rescued against the re-materialized body by hand
```

This is why `--flash --purge` refuses to `rm -rf` the mother while any body is
registered **or** while any `incubate/*` branch holds unpushed commits, and why
it `mv`s the mother aside before deleting so a peer's `--wt` cannot start
building inside a tree that is being removed. That guard is the **only**
protection; there is nothing underneath it. Push early.

---

## Cross-machine bodies

Branches, not worktrees, are what survives a machine. To see every body that
ever pushed:

```bash
git -C "$MOTHER" ls-remote --heads origin 'incubate/*' | sed 's|.*refs/heads/||'
```

To adopt one on this machine:

```bash
/incubate OWNER/REPO --wt SLUG     # resume path: branch exists, no local worktree
```

`--init` reports these as `⋯ body 'X' lives on another machine` and stops there
on purpose. Auto-materializing them would fire one `git worktree add` per
recorded body on a fresh clone.

**A body that was never pushed does not survive its machine.** Push early.

---

## Optional: maw fast-path

`/incubate --wt` deliberately depends on nothing but git and ghq, and the core
path must stay that way. If a fleet already runs `maw`, the two compose without
either knowing about the other:

```bash
/incubate OWNER/REPO --wt fix-auth --task "restore session cookie on 401 retry"
maw work "${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees/OWNER/REPO/fix-auth"
```

`/incubate` owns the worktree and the branch; `maw` owns the window. Never ask
`maw` to create the worktree instead — the branch ref claim is what makes N
agents safe, and a second creation path would bypass it.
