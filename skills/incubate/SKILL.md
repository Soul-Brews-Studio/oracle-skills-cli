---
name: incubate
description: Clone or create repos for active development — the right hand of /learn. Use when user says "incubate [repo]", "work on [repo]", "clone for dev", or wants to set up a dev workflow. Use --wt SLUG to give each agent its own git worktree body when several agents develop the same repo in parallel. Do NOT trigger for study/exploration (use /learn), finding projects (use /trace), or session mining (use /dig).
argument-hint: "<repo-url|slug|name> [--wt <slug> [--task \"...\"] [--from <ref>]] [--flash | --contribute | --status | --offload [--wt <slug> | --all-wt]]"
---

# /incubate — Active Development Workflow

Clone or create repos for active development → set up branches, make changes, push PRs.

> "/learn reads the book. /incubate writes the next chapter."

## Usage

```
/incubate [url]                          # Clone via ghq, symlink, ready for dev
/incubate [slug]                         # Use slug from ψ/memory/slugs.yaml
/incubate [repo-name]                    # Finds in ghq or creates with default org
/incubate [url] --flash "fix desc"       # Issue → branch → fix → PR → offload
/incubate [url] --contribute             # Fork if needed → branch per feature → PRs
/incubate --status                       # List all active ψ/incubate/ with git status
/incubate --status --include-offloaded   # Also list offloaded entries from .origins (#280)
/incubate --offload [slug]               # Remove symlink, keep ghq clone
/incubate --offload [slug] --purge       # Also drop entry from .origins manifest (#280)
/incubate --init                         # Restore all origins after git clone

# Parallel bodies — one git worktree per agent, same mother clone (#487)
/incubate [slug] --wt <name>             # Claim a body on branch incubate/<name>
/incubate [slug] --wt <name> --task "…"  # Same, recording who + why (worktree lock reason)
/incubate [slug] --wt <name> --from <ref># Branch from <ref> (default: origin/HEAD)
/incubate --offload [slug] --wt <name>   # Retire ONE body (branch survives)
/incubate --offload [slug] --all-wt      # Retire every body on this machine
```

---

## Workflow Modes

| Flag | Scope | Duration | Cleanup |
|------|-------|----------|---------|
| (default) | Long-term dev | Weeks/months | Manual offload |
| `--wt <slug>` | One agent's parallel body | Hours/days | `--offload --wt <slug>` (branch survives) |
| `--flash` | Single fix | Minutes | Issue → PR → auto-offload + purge |
| `--contribute` | Multi-feature | Days/weeks | Offload when all PRs done |
| `--status` | Query | — | Read-only listing |
| `--offload` | Cleanup | — | Remove symlink (keep ghq) |

```
incubate        → Long-term dev (manual cleanup)
    ↓
--wt <slug>     → N agents, N worktrees, 1 mother clone (parallel bodies)
    ↓
--contribute    → Push → offload (keep ghq)
    ↓
--flash         → Issue → Branch → PR → offload → purge (complete cycle)
```

**Mother and bodies (#487).** One `ghq` clone per repo per machine = one working
tree = one checked-out branch, so N agents on the same repo stomp each other.
`--wt` gives each agent a **body**: a `git worktree` on its own branch
`incubate/<slug>`, sharing the mother's object store. The mother clone is
untouched — on the `--wt` path it is **fetch-only**, never pulled, never stashed.

The claim is atomic for free: `git worktree add -b` creates the branch ref in a
single ref transaction, so of N agents racing for the same slug **exactly one
wins** and the losers touch nothing. No lockfiles, no `flock` (unreliable on NFS,
meaningless across machines), no claim directory.

---

## Directory Structure

```
ψ/incubate/
├── .origins                          # Manifest of incubated MOTHERS (committed)
└── OWNER/
    └── REPO/
        ├── origin                    # Symlink to mother ghq clone (gitignored)
        ├── REPO.md                   # Hub file — tracks incubation sessions (committed)
        └── wt/                       # Parallel bodies (#487)
            └── <slug>/
                └── origin            # Symlink to the worktree (gitignored)
```

Machine-local side (never in ψ, never committed):

```
$(ghq root)/github.com/OWNER/REPO   # mother clone — one per repo per machine
$WT_ROOT/OWNER/REPO/<slug>/         # body — branch incubate/<slug>

WT_ROOT="${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}"
```

**ψ is the committed soul; worktrees are machine-local scratch.** Bodies live
outside ψ **and** outside `$(ghq root)`. ψ gets one gitignored symlink per body
and nothing else.

**Bodies must not live under `$(ghq root)` (#487).** ghq decides "this is a
repository" by `stat`-ing `<dir>/.git`, and a linked worktree's `.git` is a
regular file that passes that test. Measured on ghq 1.10.1, with bodies under
`$(ghq root)/.worktrees/`:

```
$ ghq list
.worktrees/acme/api/fix-auth      ← phantom
github.com/acme/api
```

Every consumer of `ghq list` then sees phantom repos, and `.worktrees` sorts
*before* `github.com`, so any "first match wins" resolver returns the body
instead of the repo. That is a regression in **other** skills caused by this
one, so the body root lives in the XDG state directory. `$INCUBATE_WT_ROOT`
relocates it; any path outside `$(ghq root)` works, including a different
filesystem (E17).

**The body link filename is literally `origin` — this is load-bearing.** It means
the existing `.gitignore` rule `ψ/incubate/**/origin` already covers bodies (no
new rule), `wt/<slug>/` contains nothing git tracks (no `.gitkeep`), and the
`--status`/`--offload` finders keep working unmodified.

**There is no per-body manifest file.** The registry is
`git -C <mother> worktree list --porcelain -z`, which git maintains atomically
and which cannot drift from reality. A committed `.origins.d/<slug>.yaml` was
rejected (#487): committed files mean N agents each `git add`/commit/push into
ψ, converting a benign file race into a git non-fast-forward race one layer up.

Per-body metadata (who, when, why) rides in the **worktree lock reason** —
machine-local at `<mother>/.git/worktrees/<slug>/locked`, surviving `kill -9`,
never committed:

```
incubate|<owner-id>|<iso8601>|<task text>
```

**Read the registry with `--porcelain -z | tr '\0' '\n'`, never plain
`--porcelain` (#487).** git C-quotes the *entire* `locked` line the moment the
reason holds a non-ASCII byte or a `"`. Measured on git 2.50.1 with
`--task "แก้บั๊ก auth"`:

```
locked "incubate|nat@m5|2026-07-27T…|\340\271\201\340\270\201…"   ← --porcelain
locked incubate|nat@m5|2026-07-27T…|แก้บั๊ก auth                   ← --porcelain -z
```

Under the quoted form `awk -F'|'` sees field 1 as `"incubate`, so every
ownership guard silently misses, the body is misreported as another tool's, and
`--offload` refuses it forever. `-z` never quotes (it terminates records with
NUL, so there is nothing to escape) and `tr '\0' '\n'` restores the exact shape
every existing `awk` expects. Requires git ≥ 2.36.

Three reason classes, and only three:

| field 1 | means | do |
|---|---|---|
| `incubate` | ours | parse `who \| when \| task` |
| `initializing` | **git's own** lock, written during `worktree add` and left by a `kill -9` mid-checkout (E11) | report as crashed-mid-create, offer the heal, allow offload once unlocked |
| anything else | another tool's | report as `(locked by another tool)`, never parse, never break |

`initializing` is deliberately **not** in the "another tool" bucket — treating
it as foreign wedges the body, the slug, and the mother's offload permanently.
The full set of registry queries is in
[`references/worktree-recovery.md`](references/worktree-recovery.md).

**Offload source, keep hub:**
```bash
unlink ψ/incubate/OWNER/REPO/origin   # Remove symlink
# ghq clone preserved for future use
# Hub file (REPO.md) remains in ψ/incubate/OWNER/REPO/
```

---

## /incubate --init

Restore all origins after cloning (like `git submodule init`):

```bash
ROOT="$(pwd)"
GHQ_ROOT=$(ghq root)                     # hoisted — ~24ms per call (#487)
WT_ROOT="${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}"

# Read .origins through a de-duplicated private copy, NEVER the shared file
# directly (#487). The guarded append at Step 0 can leave a duplicate line
# (measured: 15/30 trials with 4 concurrent runs) and every reader must absorb
# it. Redirected, not piped — a pipe would run the loop in a subshell.
ORIGINS_SNAP=$(mktemp "${TMPDIR:-/tmp}/incubate-origins.XXXXXX")
sort -u "$ROOT/ψ/incubate/.origins" > "$ORIGINS_SNAP"

while IFS= read -r repo; do
  [ -z "$repo" ] && continue
  OWNER=$(dirname "$repo")
  REPO=$(basename "$repo")
  ghq get -u "https://github.com/$repo"
  MOTHER="$GHQ_ROOT/github.com/$repo"
  mkdir -p "$ROOT/ψ/incubate/$OWNER/$REPO"
  # ln -sfn, NEVER ln -sf: onto an EXISTING symlink-to-directory, `ln -sf`
  # follows the link and creates a stray link INSIDE the old target, leaving
  # the ψ link still pointing at the old path. Measured (#487).
  ln -sfn "$MOTHER" "$ROOT/ψ/incubate/$OWNER/$REPO/origin"
  echo "✓ Restored: $repo"

  # Body relink pass (#487). Re-points ψ at any worktrees this machine already
  # has. No-ops on a vault with zero bodies — `worktree list` reports only the
  # mother — so old vaults behave exactly as before.
  #   -z: mandatory, see "Directory Structure" — plain --porcelain C-quotes.
  #   sub(/^worktree /,"") + $0: `print $2` truncates at the first space, and
  #   `$(ghq root)` on a macOS home directory with a space in its name is
  #   ordinary. Measured: relinking `/…/my ghq root/…` produced `/…/my` (#487).
  git -C "$MOTHER" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n' \
    | awk '/^worktree /{sub(/^worktree /,""); print $0}' | while IFS= read -r wt; do
      [ "$wt" = "$MOTHER" ] && continue
      s=$(basename "$wt")
      # Registered but gone from disk (E9) — relinking would manufacture a
      # DANGLING ψ symlink and report it as a restored body. Report instead.
      [ -d "$wt" ] || { echo "  ⋯ body wt/$s registered but gone from disk — /incubate --status"; continue; }
      mkdir -p "$ROOT/ψ/incubate/$OWNER/$REPO/wt/$s"
      ln -sfn "$wt" "$ROOT/ψ/incubate/$OWNER/$REPO/wt/$s/origin"
      echo "  ↳ relinked body wt/$s"
    done

  # Bodies that exist only on ANOTHER machine — report, never auto-materialize.
  # A vault with 20 recorded bodies would otherwise detonate 20 `worktree add`
  # calls on a fresh clone. The human opts in per body (#487).
  git -C "$MOTHER" ls-remote --heads origin 'incubate/*' 2>/dev/null \
    | sed 's|.*refs/heads/incubate/||' | while IFS= read -r s; do
        [ -z "$s" ] && continue
        [ -d "$WT_ROOT/$OWNER/$REPO/$s" ] \
          || echo "  ⋯ body '$s' lives on another machine — /incubate $OWNER/$REPO --wt $s"
      done
done < "$ORIGINS_SNAP"

rm -f "$ORIGINS_SNAP"
```

`.origins` keeps its exact format — flat, one `OWNER/REPO` per line, committed.
**Bodies are never recorded in it**, because `.origins` answers "which mothers
must `--init` re-clone" and a body's mother is already listed. No migration, no
dual-read, no version marker.

---

## Step 0: Detect Input Type + Resolve Path

**CRITICAL: Capture ABSOLUTE paths first:**
```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)" && ROOT="$(pwd)"
echo "Incubating from: $ROOT"
```

### If URL (http* or owner/repo format)

Clone or create, symlink origin, update manifest:

```bash
# Replace [URL] with actual URL
URL="[URL]"
ROOT="$(pwd)"
OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|')
REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|')
SLUG="$OWNER/$REPO"

# Auto-stash unstaged changes in source clone before pulling (#279).
# `ghq get -u` runs `git pull` under the hood and aborts on dirty trees,
# stranding the ritual. Detect + stash with a clear log + restore hint.
GHQ_ROOT_PRECHECK=$(ghq root 2>/dev/null)
SOURCE_PRECHECK="$GHQ_ROOT_PRECHECK/github.com/$SLUG"
if [ -d "$SOURCE_PRECHECK/.git" ]; then
  if [ -n "$(git -C "$SOURCE_PRECHECK" status --porcelain 2>/dev/null)" ]; then
    STASH_NAME="pre-incubate-$(date +%Y-%m-%d)"
    echo "⚠️  Source clone has uncommitted changes — auto-stashing as '$STASH_NAME'"
    git -C "$SOURCE_PRECHECK" stash push -u -m "$STASH_NAME"
    echo "    (run \`git -C $SOURCE_PRECHECK stash pop\` to restore)"
  fi
fi

# Check if repo exists on GitHub
if gh repo view "$SLUG" --json name &>/dev/null; then
  ghq get -u "https://github.com/$SLUG"
else
  echo "Repo not found — creating private repo..."
  gh repo create "$SLUG" --private --clone=false
  ghq get "https://github.com/$SLUG"
  GHQ_ROOT=$(ghq root)
  LOCAL="$GHQ_ROOT/github.com/$SLUG"
  if [ ! -f "$LOCAL/README.md" ]; then
    echo "# $REPO" > "$LOCAL/README.md"
    git -C "$LOCAL" add README.md
    git -C "$LOCAL" commit -m "Initial commit"
    git -C "$LOCAL" push origin main 2>/dev/null || git -C "$LOCAL" push origin master
  fi
fi

GHQ_ROOT=$(ghq root)
mkdir -p "$ROOT/ψ/incubate/$OWNER/$REPO"
# ln -sfn, NEVER ln -sf (#487) — see the comment in --init above.
ln -sfn "$GHQ_ROOT/github.com/$OWNER/$REPO" "$ROOT/ψ/incubate/$OWNER/$REPO/origin"

# Auto-add gitignore pattern if missing (#250)
GITIGNORE="$ROOT/.gitignore"
if [ -f "$GITIGNORE" ]; then
  if ! grep -q 'ψ/incubate/\*\*/origin' "$GITIGNORE" 2>/dev/null; then
    echo 'ψ/incubate/**/origin' >> "$GITIGNORE"
    echo "✓ Added ψ/incubate/**/origin to .gitignore"
  fi
else
  # Also check ψ/.gitignore as fallback
  PSI_GITIGNORE="$ROOT/ψ/.gitignore"
  if [ -f "$PSI_GITIGNORE" ] && ! grep -q 'incubate/\*\*/origin' "$PSI_GITIGNORE" 2>/dev/null; then
    echo 'incubate/**/origin' >> "$PSI_GITIGNORE"
    echo "✓ Added incubate/**/origin to ψ/.gitignore"
  fi
fi

# Update manifest — guarded O_APPEND, never read-modify-write (#487).
# The `sort -u -o F F` that lived here re-read and rewrote the whole file:
# measured 8 concurrent writers x 10 trials -> 8/10 trials LOST entries (worst
# kept 5 of 8), and 5 trials emitted `sort: No such file or directory` because
# the file transiently does not exist — so a concurrent --init or --status read
# an EMPTY manifest. A guarded append measured 0/10 lost. Residual TOCTOU can
# only ever produce a DUPLICATE line, never a missing one, and every reader
# absorbs duplicates via `sort -u`. .origins is no longer kept sorted; nothing
# ever consumed its sortedness.
ORIGINS="$ROOT/ψ/incubate/.origins"
mkdir -p "$ROOT/ψ/incubate"
grep -qxF "$OWNER/$REPO" "$ORIGINS" 2>/dev/null || printf '%s\n' "$OWNER/$REPO" >> "$ORIGINS"

echo "✓ Ready: $ROOT/ψ/incubate/$OWNER/$REPO/origin → source"
```

### Step 0.5: Drop INCUBATED_BY Breadcrumb (#226, #228)

After clone/symlink, write `.claude/INCUBATED_BY` in the **target repo** (not the oracle repo):

```bash
TARGET_REPO="$GHQ_ROOT/github.com/$OWNER/$REPO"
mkdir -p "$TARGET_REPO/.claude"

# Check if this repo was previously /learn'd
LEARNED_FROM=""
if [ -d "$ROOT/ψ/learn/$OWNER/$REPO" ]; then
  LEARNED_FROM="learned-from: ψ/learn/$OWNER/$REPO/"
fi

cat > "$TARGET_REPO/.claude/INCUBATED_BY" << BREADCRUMB
oracle: $(basename "$ROOT")
oracle-repo: $(git -C "$ROOT" remote get-url origin 2>/dev/null || echo "local")
date: $(date +%Y-%m-%d)
mode: ${MODE:-default}
source: https://github.com/$OWNER/$REPO
${LEARNED_FROM}
BREADCRUMB

echo "✓ Breadcrumb dropped: $TARGET_REPO/.claude/INCUBATED_BY"

# Keep the breadcrumb OUT of the target repo's git history (#447).
# .git/info/exclude is local-only (never committed) — right home for
# machine-local metadata. Do NOT touch the target's .gitignore.
if [ -d "$TARGET_REPO/.git" ]; then
  grep -qxF '.claude/INCUBATED_BY' "$TARGET_REPO/.git/info/exclude" 2>/dev/null \
    || echo '.claude/INCUBATED_BY' >> "$TARGET_REPO/.git/info/exclude"
  echo "✓ Excluded from git: .claude/INCUBATED_BY (local .git/info/exclude)"

  # If a PRIOR incubation already committed the breadcrumb, exclude alone
  # won't hide it — git keeps tracking a tracked file. Auto-untrack it
  # (index-only; the file stays on disk). This makes "must be ignored"
  # actually hold instead of leaving a manual git-rm note.
  if git -C "$TARGET_REPO" ls-files --error-unmatch .claude/INCUBATED_BY >/dev/null 2>&1; then
    git -C "$TARGET_REPO" rm --cached --quiet .claude/INCUBATED_BY
    echo "✓ Untracked previously-committed .claude/INCUBATED_BY (git rm --cached)"
  fi
fi
```

The breadcrumb enables:
- **Orphan detection**: Any Claude session can check who tracks this repo
- **Provenance chain**: `learned-from` links /learn → /incubate (#232)
- **/recap awareness**: /recap shows a warning when INCUBATED_BY exists (#229)

The breadcrumb is machine-local — it must never appear in the target repo's
git history (#447). Step 0.5 enforces this in both directions: it adds the
local exclude for future runs, and auto-untracks the file if a prior
incubation already committed it (`git rm --cached`, index-only — the
breadcrumb stays on disk). Nothing manual is left for you to remember.

### Step 0.6: Share the vault — symlink target ψ → parent oracle vault

An incubated repo that writes its own memory (retros, learnings, traces) into a
standalone `ψ/` strands that brain — the parent oracle never sees it. Point the
target's `ψ` at the parent vault so incubated work lands in one shared brain.

```bash
# Only if the parent actually has a vault to share
if [ -e "$ROOT/ψ" ]; then
  ln -sfn "$ROOT/ψ" "$TARGET_REPO/ψ"   # -n: don't descend into an existing symlink
  echo "✓ Vault shared: $TARGET_REPO/ψ → $ROOT/ψ"

  # Keep it OUT of the target's git history via LOCAL exclude (never the
  # committed .gitignore — target may be public; #447 rule).
  # GOTCHA (neo, 2026-08-16): a bare symlink `ψ` is NOT matched by `ψ/` — the
  # trailing slash only matches a directory. Exclude BOTH forms or the symlink
  # shows up as untracked.
  if [ -d "$TARGET_REPO/.git" ]; then
    for pat in 'ψ' 'ψ/'; do
      grep -qxF "$pat" "$TARGET_REPO/.git/info/exclude" 2>/dev/null \
        || echo "$pat" >> "$TARGET_REPO/.git/info/exclude"
    done
    echo "✓ Excluded from git: ψ and ψ/ (local .git/info/exclude)"
  fi
fi
```

**Consequence — the vault is now GLOBAL, not per-repo.** Once the target's `ψ`
symlinks into the parent, `incubate/`, `learn/`, and `memory/` are the same
directory on disk across every repo that shares that vault. `/incubate` or
`/learn` in one shows up for all of them. If the parent vault itself is a
symlink into a **private** companion repo (e.g. `neo-oracle/ψ → neo-oracle-vault`),
that's deliberate: it keeps memory out of open-source-bound repos while still
sharing one brain. Don't assume an incubated repo's memory is private to it.

### If just a name (no slash, no URL)

Try ghq first, then create with default org:

```bash
NAME="[NAME]"
ROOT="$(pwd)"
DEFAULT_ORG="laris-co"  # Configurable via --org flag

# Anchor to github.com/ (#487) — ghq enumerates dot-directories and non-GitHub
# hosts alike, so an unanchored match can select a backup tree, a gitlab clone,
# or any stray directory holding a `.git`. Measured on one machine: 54 dot-dir
# entries, 156 non-github.com. (Bodies deliberately live outside $(ghq root)
# entirely, so they never appear here — see "Directory Structure".)
MATCH=$(ghq list | grep '^github\.com/' | grep -i "/$NAME$" | head -1)
if [ -n "$MATCH" ]; then
  OWNER=$(echo "$MATCH" | cut -d'/' -f2)
  REPO=$(echo "$MATCH" | cut -d'/' -f3)
else
  OWNER="$DEFAULT_ORG"
  REPO="$NAME"
fi
# Then proceed with URL flow using OWNER/REPO
```

### Verify

```bash
ls -la "$ROOT/ψ/incubate/$OWNER/$REPO/"
```

---

## Step 1: Detect Workflow Mode

Check arguments for workflow flags:

| Argument | Mode | Action |
|----------|------|--------|
| (none) | Default | Clone + symlink + show status |
| `--wt <slug>` | Body | Claim `incubate/<slug>` + add worktree + symlink (**skip clone — the mother must already exist**) (#487) |
| `--flash` | Flash | Issue → branch → fix → PR → offload |
| `--contribute` | Contribute | Fork if needed → multi-feature PRs |
| `--status` | Status | List all incubations + bodies (skip clone) |
| `--offload` | Offload | Remove symlink (skip clone); `--wt`/`--all-wt` retire bodies |

> **Steps 0 and 0.5 do not run for `--wt`, `--status` or `--offload`.** Read the
> mode first, then jump straight to that mode's section. Running Step 0 on the
> `--wt` path would `git stash push -u` a *peer's* uncommitted work in the mother
> and then `ghq get -u` (a `git pull`) underneath them — the exact operation the
> `--wt` section forbids, printing the restore hint into the wrong transcript
> (#487). The `[ -d "$MOTHER/.git" ]` check at Step W2 is the entry gate.

`--wt` **always takes a value**. Bare `--wt` on create is an error — list the
existing slugs instead of guessing one. The branch is **always** `incubate/<slug>`,
never configurable.

**Calculate ACTUAL paths (replace variables with real values):**
```
REPO_DIR   = [ROOT]/ψ/incubate/[OWNER]/[REPO]/
SOURCE_DIR = [ROOT]/ψ/incubate/[OWNER]/[REPO]/origin/          ← symlink to mother
WORK_DIR   = [GHQ_ROOT]/github.com/[OWNER]/[REPO]/             ← mother working dir
BODY_LINK  = [ROOT]/ψ/incubate/[OWNER]/[REPO]/wt/[SLUG]/origin ← symlink to body
BODY_DIR   = [WT_ROOT]/[OWNER]/[REPO]/[SLUG]/                  ← agent working dir

WT_ROOT    = ${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}
```

⚠️ With `--wt`, **BODY_DIR is your working directory**, not WORK_DIR. The mother
is fetch-only.

⚠️ IMPORTANT: Always use literal paths. Never pass shell variables to subagents.

---

## Mode: Default (long-term dev)

After Step 0 (clone + symlink), the repo is ready for development.

**Verify working state:**
```bash
WORK_DIR="$ROOT/ψ/incubate/$OWNER/$REPO/origin"
echo "Branch: $(git -C "$WORK_DIR" branch --show-current)"
echo "Status: $(git -C "$WORK_DIR" status --short | wc -l) changed files"
echo "Remote: $(git -C "$WORK_DIR" remote get-url origin)"
echo "Last commit: $(git -C "$WORK_DIR" log --oneline -1)"
```

**Skip to Step 2** (create/update hub file).

---

## Mode: --wt (parallel bodies, one per agent) — #487

Use when **more than one agent develops the same repo at once**. Each agent gets
its own worktree on its own branch; they share the mother's object store and
never touch each other's files.

**Step 0 and Step 0.5 do NOT run on this path.** No clone, no `ghq get -u`, no
auto-stash — the mother must already exist, and the `[ -d "$MOTHER/.git" ]`
check at the top of W2 is the entry gate. Run plain `/incubate OWNER/REPO`
first if it does not.

### Step W1: Validate the slug

Two stages, both needed. `git check-ref-format` **accepts** `-lead` (which would
be read as an option by the next command) and `a/b` (which would nest inside
`wt/`), so the `case` guard is load-bearing — it runs first.

```bash
SLUG="[SLUG]"
case "$SLUG" in
  ''|-*|*/*|*[!a-zA-Z0-9._-]*)
    echo "✗ invalid slug '$SLUG' — [a-zA-Z0-9._-] only, no slashes, no leading dash"
    exit 2 ;;
esac
git check-ref-format --branch "incubate/$SLUG" >/dev/null 2>&1 \
  || { echo "✗ invalid slug '$SLUG'"; exit 2; }
```

### Step W2: Claim the body — and own it in the same command

The **only** atomic primitive is `git worktree add`. Branch creation is a ref
transaction (`O_EXCL` + `rename(2)` inside `.git`), so 8 concurrent adds of the
same slug yield exactly one `rc=0` and seven loud fatals — measured. `git worktree
add` also creates missing nested parent directories itself, so there is no `mkdir`
to race on either.

The claim and the ownership record must be **one** command, not two. With
`add -b` followed by a separate `worktree lock`, a body is observable *unowned*
for the ~10–20 ms between them, and a peer running `--offload --all-wt` in that
window finds an unlocked clean worktree, passes both ownership guards, and
retires it — measured, `✓ wt/<slug> retired` while the claiming agent was still
running. `git worktree add --lock --reason … -b …` closes the window; verified
on git 2.50.1.

```bash
ROOT="$(pwd)"
GHQ_ROOT=$(ghq root)
WT_ROOT="${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}"
MOTHER="$GHQ_ROOT/github.com/$OWNER/$REPO"
[ -d "$MOTHER/.git" ] || { echo "✗ no mother clone — run: /incubate $OWNER/$REPO"; exit 1; }

# -z is MANDATORY, never plain --porcelain (#487): git C-quotes the WHOLE
# `locked` line once the reason holds a non-ASCII byte or a `"`, and every
# `awk -F'|'` guard below then silently misses. See "Directory Structure".
wtlist() { git -C "$MOTHER" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n'; }

# FETCH-ONLY mother (#487). NEVER `ghq get -u` on this path: it runs `git pull`,
# which is exactly why the auto-stash at Step 0 exists (#279) — and with N agents
# that stash silently pockets a PEER's uncommitted work, printing the restore
# hint into THIS agent's transcript where the peer will never see it.
# `git fetch` has no working tree to disturb. Measured: 8 concurrent fetches, 8x rc=0.
git -C "$MOTHER" fetch --prune origin >/dev/null 2>&1 || true

# Base the body on the remote default head — never on the mother's current
# checkout, or body #2 silently inherits body #1's work.
# FAIL CLOSED (#487): `symbolic-ref` exits 128 with EMPTY stdout when
# refs/remotes/origin/HEAD is absent, which is the case for every repo Step 0
# creates itself (`gh repo create` + `ghq get` of an empty repo never sets it,
# and neither does `fetch --prune`). The old `${FROM:+…}` then expanded to
# nothing and `worktree add -b` silently based the body on the mother's HEAD —
# measured: a body born on top of an unrelated `--flash` branch, no warning.
if [ -z "$FROM" ]; then
  FROM=$(git -C "$MOTHER" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)
fi
if [ -z "$FROM" ]; then
  git -C "$MOTHER" remote set-head origin -a >/dev/null 2>&1
  FROM=$(git -C "$MOTHER" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null)
fi
if [ -z "$FROM" ]; then
  if git -C "$MOTHER" rev-parse --verify -q HEAD >/dev/null 2>&1; then
    echo "✗ cannot determine origin/HEAD on $OWNER/$REPO — refusing to guess"
    echo "  basing on the mother's checkout would inherit whatever it has checked out"
    echo "  → name the base: /incubate $OWNER/$REPO --wt $SLUG --from main"
    exit 1
  fi
  echo "ⓘ mother has no commits yet (E8) — body starts from its unborn HEAD"
fi

WT="$WT_ROOT/$OWNER/$REPO/$SLUG"
BODY="$ROOT/ψ/incubate/$OWNER/$REPO/wt/$SLUG"
ERR=$(mktemp "${TMPDIR:-/tmp}/incubate.XXXXXX")

# The ownership record is computed BEFORE the claim so `add --lock --reason`
# can write both at once. `|` is the delimiter and `"` is what makes git
# C-quote a reason, so neither survives the free-text field. Non-ASCII DOES
# survive — Thai tasks are first class, and `-z` reads them back exactly.
TASK=$(printf '%s' "${TASK:-(unstated)}" | tr '|\n"' '/  ')
OWNER_ID="${INCUBATE_AGENT:-$(id -un)@$(hostname -s)}"
REASON_NEW="incubate|$OWNER_ID|$(date -u +%Y-%m-%dT%H:%M:%SZ)|$TASK"

if wtlist | grep -qxF "worktree $WT" && [ -d "$WT" ]; then
  # Already mine (E4). Re-running the identical command is NOT an error.
  ACTION="↩ attached"
  rm -f "$ERR"
elif wtlist | grep -qxF "worktree $WT"; then
  # Registered but the directory is GONE (E9) — the 🧟 state. Testing only the
  # registry here used to fall through to W3, which symlinked ψ at a path that
  # does not exist and printed `cd <nothing>` as success (#487).
  echo "✗ wt/$SLUG is registered but its directory is gone: $WT"
  echo "  heal: git -C $MOTHER worktree unlock $WT; git -C $MOTHER worktree prune"
  echo "  then re-run: /incubate $OWNER/$REPO --wt $SLUG"
  echo "  (branch incubate/$SLUG and every commit on it are untouched)"
  rm -f "$ERR"; exit 1
elif [ -e "$WT" ] && [ -n "$(ls -A "$WT" 2>/dev/null)" ]; then
  # E5/E10: something occupies the path and git does not own it. This guard MUST
  # run before `add -b`: git creates the branch ref BEFORE it validates the path,
  # so a failed `-b` LEAVES `incubate/<slug>` behind and wedges the slug forever
  # — measured on git 2.50.1, `rc=128` yet `branch --list` shows it (#487).
  # An EMPTY directory is harmless crash residue (E6) and falls through.
  echo "✗ $WT already exists and git does not own it — nothing was touched"
  echo "  inspect it first (E10): ls -la $WT"
  rm -f "$ERR"; exit 1
elif git -C "$MOTHER" worktree add --lock --reason "$REASON_NEW" \
       -b "incubate/$SLUG" "$WT" ${FROM:+"$FROM"} >/dev/null 2>"$ERR"; then
  ACTION="🌱 created"
  rm -f "$ERR"
elif grep -q "already exists\|cannot lock ref\|already used by worktree" "$ERR"; then
  # Lost the race, or the branch outlived a previous body.
  # sub(/^worktree /,"")+$0, never $2 — `$2` truncates a path at its first space.
  HOLDER=$(wtlist | awk -v b="branch refs/heads/incubate/$SLUG" \
    '/^worktree /{sub(/^worktree /,""); p=$0; next} $0==b{print p; exit}')
  if [ -n "$HOLDER" ]; then
    # `f=0` on every `worktree` line and `exit` at the record boundary: without
    # them a holder carrying no `locked` line leaks the NEXT body's reason, and
    # the collision message names the wrong human and the wrong task (#487).
    REASON=$(wtlist | awk -v b="branch refs/heads/incubate/$SLUG" \
      '/^worktree /{f=0} $0==b{f=1} f&&/^locked /{sub(/^locked /,"");print;exit} f&&/^$/{exit}')
    WHO=$(printf '%s' "$REASON" | awk -F'|' '$1=="incubate"{print $2" · "$3}')
    WHY=$(printf '%s' "$REASON" | awk -F'|' '$1=="incubate"{print $4}')
    if [ "$REASON" = "initializing" ]; then
      WHO="(git's own lock — crashed mid-create, E11)"
      WHY="git -C $MOTHER worktree unlock $HOLDER, inspect, then retry"
    elif [ -n "$REASON" ] && [ -z "$WHO" ]; then
      WHO="(locked by another tool)"; WHY="—"
    fi
    echo "✗ Slug '$SLUG' is already claimed on $OWNER/$REPO"
    echo "    by:   ${WHO:-(unlocked)}"
    echo "    task: ${WHY:-(unstated)}"
    echo "    tree: $HOLDER"
    echo "  → join it:      cd $HOLDER"
    echo "  → or branch it: /incubate $OWNER/$REPO --wt ${SLUG}-2 --task \"...\""
    rm -f "$ERR"; exit 1
  fi
  # Branch exists but no worktree holds it — a previously offloaded body. Resume
  # it. Capture THIS attempt's stderr (2>"$ERR", never 2>&1): reporting the
  # stale `-b` error told operators the BRANCH was the blocker when the real
  # cause was the directory, and deleting the branch did not help (#487).
  if ! git -C "$MOTHER" worktree add --lock --reason "$REASON_NEW" \
         "$WT" "incubate/$SLUG" >/dev/null 2>"$ERR"; then
    cat "$ERR"; rm -f "$ERR"; exit 1
  fi
  ACTION="♻ revived"
  rm -f "$ERR"
else
  cat "$ERR"; rm -f "$ERR"; exit 1
fi
```

A slug collision is the **normal** outcome of N agents racing — it is a routing
decision, not a crash. That is why the message names the holder, the task, the
tree, and the two commands that resolve it.

### Step W3: Reconcile ownership, then link ψ

The lock reason is machine-local, it survives `kill -9`, it blocks an accidental
`worktree remove`, and it does **not** block commits inside the body. A lock
protects only its own entry — pruning unrelated worktrees still works (measured).

W2 already wrote it on the create and revive paths. W3 only handles the
`↩ attached` case, where a claim already exists and must **never** be
overwritten: re-attaching to your own body keeps the ORIGINAL owner and
timestamp, and a lock written by another tool is left completely alone.

```bash
wtlist() { git -C "$MOTHER" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n'; }

EXISTING=$(wtlist | awk -v w="worktree $WT" \
  '$0==w{f=1;next} f&&/^locked /{sub(/^locked /,"");print;exit} f&&/^$/{exit}')

if [ -z "$EXISTING" ]; then
  # Unowned — a crash between an old `add` and its `lock`, or a peer's unlock.
  # Adopt it; do not leave a body nobody owns.
  git -C "$MOTHER" worktree lock --reason "$REASON_NEW" "$WT" 2>/dev/null
elif [ "$EXISTING" = "initializing" ]; then
  # git's OWN lock, left by a kill -9 mid-checkout (E11) — not a foreign tool.
  echo "⚠ wt/$SLUG was created but never finished (git's 'initializing' lock, E11)"
  echo "  the tree is half-populated. Heal, then re-run:"
  echo "    git -C $WT status"
  echo "    git -C $WT checkout -- ."
  echo "    git -C $MOTHER worktree unlock $WT"
  exit 1
else
  TASK=$(printf '%s' "$EXISTING" | awk -F'|' '$1=="incubate"{print $4}')
  TASK="${TASK:-(locked by another tool)}"
fi

mkdir -p "$BODY"
ln -sfn "$WT" "$BODY/origin"      # -sfn, NEVER -sf (see Anti-Patterns)

echo "${ACTION:-↩ attached} body wt/$SLUG → $WT"
echo "  branch: incubate/$SLUG · task: $TASK"
echo "  cd $WT"
```

`.origins` is **not** touched, and **Step 2 does not run for `--wt`** — the
mother is already recorded, the body's record *is* its lock reason, and no new
committed file is created anywhere. That is the whole point: N agents never
contend on the vault's git index.

### Step W4: The one discipline

The mother's `.git` is genuinely shared. Concurrent `fetch` is safe (measured), but
`git gc`, `git worktree prune`, and `git branch -D` reach **every** sibling body.

> **Your worktree, your branch. No git operation outside it.**

Cross-machine slugs are **not** coordinated: two agents on two machines can each
create `incubate/fix-auth` from different bases and only discover it at push time.
The namespace is per-mother, per-machine. Known limitation (#487).

---

## Mode: --flash (single-fix cycle)

Complete contribution cycle: Issue → Branch → Fix → PR → Offload.

### Step F1: Create Issue (document intent)
```bash
WORK_DIR="$ROOT/ψ/incubate/$OWNER/$REPO/origin"
# Compose issue title and description from user's intent
ISSUE_URL=$(gh issue create --repo "$OWNER/$REPO" --title "[TITLE]" --body "[DESCRIPTION]")
ISSUE_NUM=$(echo "$ISSUE_URL" | grep -oP '\d+$')
echo "Created: #$ISSUE_NUM"
```

### Step F2: Create Branch
```bash
BRANCH="issue-${ISSUE_NUM}-[short-description]"
git -C "$WORK_DIR" checkout -b "$BRANCH"
echo "Branch: $BRANCH"
```

### Step F3: Make Changes
Let the user describe what to fix. Make changes, then:
```bash
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -m "[commit message]

Closes #$ISSUE_NUM"
git -C "$WORK_DIR" push -u origin "$BRANCH"
```

### Step F4: Create PR
```bash
PR_URL=$(gh pr create --repo "$OWNER/$REPO" \
  --title "[PR title]" \
  --body "$(cat <<'EOF'
## Summary
[what was fixed]

Closes #$ISSUE_NUM

---
**From**: [Oracle Name]
Rule 6: "Oracle Never Pretends to Be Human"
Written by an Oracle — AI speaking as itself.
EOF
)" --head "$BRANCH")
PR_NUM=$(echo "$PR_URL" | grep -oP '\d+$')
echo "PR: #$PR_NUM (closes #$ISSUE_NUM)"
```

### Step F5: Auto-offload + purge
```bash
cd "$ROOT"
MOTHER="$(ghq root)/github.com/$OWNER/$REPO"
wtlist() { git -C "$MOTHER" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n'; }

# REFUSE to purge the mother while bodies live (#487). Every body's `.git` is a
# pointer file into the mother's admin dir, and the body's COMMITS live in the
# mother's object store — so deleting the mother destroys every unpushed commit
# on every `incubate/*` branch. Measured: after `rm -rf $MOTHER` and a fresh
# re-clone, `git cat-file -t <body-commit>` → `could not get object info`, and
# `branch --list 'incubate/*'` is empty. **This guard is the only protection
# there is.** Restoring the mother does NOT heal the bodies; only PUSHED
# branches survive it.
LIVE=$(wtlist | grep -c '^worktree ')
if [ "${LIVE:-0}" -gt 1 ]; then
  echo "✗ Refusing to purge $OWNER/$REPO — $((LIVE - 1)) body/bodies still live:"
  wtlist | awk '/^worktree /{sub(/^worktree /,""); print "    "$0}' | tail -n +2
  echo "  → retire them first: /incubate --offload $OWNER/$REPO --all-wt"
  exit 1
fi

# Unpushed work on a body branch dies with the mother even when no worktree
# holds it any more. Never purge over the top of it.
UNPUSHED=$(git -C "$MOTHER" log --oneline --branches='incubate/*' --not --remotes 2>/dev/null | head -5)
if [ -n "$UNPUSHED" ]; then
  echo "✗ Refusing to purge $OWNER/$REPO — unpushed commits on incubate/* branches:"
  printf '    %s\n' "$UNPUSHED"
  echo "  → push them first, or accept the loss explicitly by deleting $MOTHER by hand"
  exit 1
fi

unlink "$ROOT/ψ/incubate/$OWNER/$REPO/origin"
rmdir "$ROOT/ψ/incubate/$OWNER" 2>/dev/null

# Rename FIRST, then delete (#487). `rm -rf` on a large clone takes seconds, and
# a peer's `--wt` only checks `[ -d "$MOTHER/.git" ]` — anywhere in that window
# it passes, then creates a branch ref and a partial checkout inside a tree being
# deleted. `mv` is atomic and fails every peer's check instantly. Re-check the
# body count against the renamed path before the point of no return.
PURGING="$MOTHER.purging.$$"
mv "$MOTHER" "$PURGING"
LIVE=$(git -C "$PURGING" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n' | grep -c '^worktree ')
if [ "${LIVE:-0}" -gt 1 ]; then
  mv "$PURGING" "$MOTHER"
  echo "✗ A body was claimed while purging — mother restored, nothing deleted"
  exit 1
fi
rm -rf "$PURGING"

# --flash owns the whole cycle, so it purges the manifest entry too. Same
# compare-and-swap as `--offload --purge`; see that section for why.
ORIGINS="$ROOT/ψ/incubate/.origins"
if [ -f "$ORIGINS" ]; then
  I=0
  while [ "$I" -lt 10 ]; do
    I=$((I + 1)); SIZE=$(wc -c < "$ORIGINS" | tr -d ' ')
    TMPFILE=$(mktemp "$ROOT/ψ/incubate/.origins.XXXXXX")
    grep -vxF "$OWNER/$REPO" "$ORIGINS" > "$TMPFILE" || true
    chmod 644 "$TMPFILE"
    if [ "$(wc -c < "$ORIGINS" | tr -d ' ')" = "$SIZE" ]; then
      mv "$TMPFILE" "$ORIGINS"; break
    fi
    rm -f "$TMPFILE"
  done
fi

echo "✓ Issue #$ISSUE_NUM → PR #$PR_NUM → Offloaded & Purged"
```

**Update hub file before offload** (Step 2), then offload.

---

## Mode: --contribute (multi-feature contribution)

For extended contribution over days/weeks. Forks if needed.

### Step C1: Fork if not your repo
```bash
WORK_DIR="$ROOT/ψ/incubate/$OWNER/$REPO/origin"
ME=$(gh api user --jq '.login')
if ! gh repo view "$OWNER/$REPO" --json viewerPermission --jq '.viewerPermission' | grep -qE 'ADMIN|MAINTAIN|WRITE'; then
  echo "No push access — forking..."
  gh repo fork "$OWNER/$REPO" --clone=false
  git -C "$WORK_DIR" remote add fork "https://github.com/$ME/$REPO.git"
  echo "Fork remote added. Push to 'fork' instead of 'origin'."
fi
```

### Step C2: Create feature branch
```bash
BRANCH="feat/[feature-name]"
git -C "$WORK_DIR" checkout -b "$BRANCH"
```

### Step C3: Work cycle (repeat per feature)
```bash
# ... make changes ...
git -C "$WORK_DIR" add -A
git -C "$WORK_DIR" commit -m "[commit message]"
REMOTE=$(git -C "$WORK_DIR" remote | grep fork || echo origin)
git -C "$WORK_DIR" push -u "$REMOTE" "$BRANCH"
gh pr create --repo "$OWNER/$REPO" \
  --title "[PR title]" \
  --body "[description]" \
  --head "$ME:$BRANCH"
```

### Step C4: Offload when all PRs done
```bash
unlink "$ROOT/ψ/incubate/$OWNER/$REPO/origin"
rmdir "$ROOT/ψ/incubate/$OWNER" 2>/dev/null
echo "✓ Offloaded (ghq kept for PR feedback)"
```

---

## Mode: --status (list incubations)

No clone needed. Lists every mother, every body under it, and everything that
needs attention. This is the only window a human has at 3am, so it names the
branch, the dirt, the owner, the task, and the absolute path.

Add `--include-offloaded` to also list entries in `.origins` whose symlinks
have been removed (#280) — surfaces the historical record without losing it.

State is carried by **glyph shape, never colour**: `●` dirty, `○` clean,
`⚠` needs attention, `🧟` registered-but-gone.

```bash
ROOT="$(pwd)"
INCLUDE_OFFLOADED="${1:-}"   # pass "--include-offloaded" to enable
GHQ_ROOT=$(ghq root 2>/dev/null)   # hoisted out of every loop — ~24ms per call (#487)
WT_ROOT="${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}"

# -z is MANDATORY, never plain --porcelain (#487) — see "Directory Structure".
wtlist() { git -C "$1" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n'; }

echo "🌱 Incubations"

# Stock /bin/bash on macOS is 3.2.57 and has NO associative arrays: `declare -A`
# there makes `${ACTIVE[acme/api]}` an ARITHMETIC subscript and aborts with
# `division by 0 (error token is "b")`, rc=1 — `--status --include-offloaded`
# was hard-broken on stock bash and only appeared to work under Homebrew bash.
# Sets now live in temp files queried with `grep -qxF` (#487).
LINKS=$(mktemp "${TMPDIR:-/tmp}/incubate-links.XXXXXX")
ACTIVE=$(mktemp "${TMPDIR:-/tmp}/incubate-active.XXXXXX")
PORC=$(mktemp "${TMPDIR:-/tmp}/incubate-porc.XXXXXX")

# `find | sort`, never `for x in $(find)` — that word-splits paths on spaces.
# Sorting full paths also makes every mother precede its own bodies, always:
# all strings sharing a prefix form one contiguous block under lexical sort.
find "$ROOT/ψ/incubate" -name origin -type l -print 2>/dev/null | sort > "$LINKS"

# ISO8601 → "2h ago"; BSD `date -j -f` first, then GNU `date -d`, else raw stamp.
incubate_age() {
  [ -n "$1" ] || return 0
  _e=$(date -j -u -f '%Y-%m-%dT%H:%M:%SZ' "$1" +%s 2>/dev/null \
       || date -u -d "$1" +%s 2>/dev/null) || { printf '%s' "$1"; return 0; }
  _d=$(( $(date -u +%s) - _e ))
  [ "$_d" -lt 0 ] && _d=0        # clocks drift across a fleet; never print "-7h ago"
  if   [ "$_d" -lt 3600 ];  then printf '%sm ago' "$((_d/60))"
  elif [ "$_d" -lt 86400 ]; then printf '%sh ago' "$((_d/3600))"
  else                           printf '%sd ago' "$((_d/86400))"; fi
}

REPOS=0; BODIES=0; LIVE=0; DIRTY=0; LASTBODY=""; PORC_FOR=""

# Redirected, NOT piped — a piped `while` runs in a subshell and loses counters.
while IFS= read -r link; do
  DIR=$(dirname "$link")
  SLUG=${DIR#"$ROOT/ψ/incubate/"}     # pure shell — a `sed` here would treat
  TARGET=$(readlink "$link")          # regex metachars in $ROOT as syntax

  case "$SLUG" in
    */wt/*)
      # ---- body ----
      NAME=${SLUG##*/wt/}
      PARENT=${SLUG%%/wt/*}
      # Derive the parent from the body's OWN path (#487). The loop used to
      # carry $PORC forward from whichever mother rendered last, so a body whose
      # mother has no ψ link was drawn as a child of an unrelated repo with its
      # owner and task blanked — measured: acme/api's orphan body rendered under
      # acme/api-gateway. Sorted full paths put a mother immediately before its
      # own bodies, but only when the mother's link exists.
      if [ "$PARENT" != "$PORC_FOR" ]; then
        if [ -L "$ROOT/ψ/incubate/$PARENT/origin" ]; then
          wtlist "$ROOT/ψ/incubate/$PARENT/origin" > "$PORC"
          PORC_FOR="$PARENT"
        else
          BODIES=$((BODIES + 1))
          echo "  ⚠  orphan body wt/$NAME — mother $PARENT is not incubated"
          echo "      $TARGET"
          echo "      heal: /incubate $PARENT   (or: /incubate --offload $PARENT --all-wt)"
          continue
        fi
      fi
      BODIES=$((BODIES + 1))
      if [ "$link" = "$LASTBODY" ]; then TEE="└─"; CONT="  "; else TEE="├─"; CONT="│ "; fi
      if [ -d "$TARGET" ]; then
        LIVE=$((LIVE + 1))
        BRANCH=$(git -C "$TARGET" branch --show-current 2>/dev/null)
        N=$(git -C "$TARGET" status --short 2>/dev/null | wc -l | tr -d ' ')
        if [ "$N" -gt 0 ]; then STATE="● dirty $N"; DIRTY=$((DIRTY + 1)); else STATE="○ clean"; fi
      else
        BRANCH="?"; STATE="⚠ missing"
      fi
      # Owner + task come from the worktree lock reason cached in $PORC.
      REASON=$(awk -v w="worktree $TARGET" '$0==w{f=1;next} f&&/^locked /{sub(/^locked /,"");print;exit} f&&/^$/{exit}' "$PORC")
      WHO=$(printf  '%s' "$REASON" | awk -F'|' '$1=="incubate"{print $2}')
      WHEN=$(printf '%s' "$REASON" | awk -F'|' '$1=="incubate"{print $3}')
      TASK=$(printf '%s' "$REASON" | awk -F'|' '$1=="incubate"{print $4}')
      if [ "$REASON" = "initializing" ]; then
        # git's OWN lock (E11), not a foreign tool's — name it as such.
        WHO="⚠ crashed mid-create — git's own lock (E11)"; TASK="(unfinished)"
      elif [ -n "$REASON" ] && [ -z "$WHO" ]; then
        WHO="(locked by another tool)"
      fi
      printf '  %s %-16s %-11s %-22s %s\n' "$TEE" "wt/$NAME" "$STATE" "${BRANCH:-?}" "\"${TASK:-(unstated)}\""
      printf '  %s %-16s %s · %s · %s\n' "$CONT" "" "${WHO:-(unlocked)}" "$(incubate_age "$WHEN")" "$TARGET"
      ;;
    *)
      # ---- mother ----
      REPOS=$((REPOS + 1))
      printf '\n  %-34s origin ' "$SLUG"
      if [ -d "$TARGET" ]; then
        BRANCH=$(git -C "$TARGET" branch --show-current 2>/dev/null)
        N=$(git -C "$TARGET" status --short 2>/dev/null | wc -l | tr -d ' ')
        if [ "$N" -gt 0 ]; then STATE="● dirty $N"; DIRTY=$((DIRTY + 1)); else STATE="○ clean"; fi
        echo "✓ ${BRANCH:-(detached)} · $STATE · $TARGET"
        wtlist "$TARGET" > "$PORC"
      else
        echo "✗ broken → $TARGET"
        : > "$PORC"
      fi
      PORC_FOR="$SLUG"
      printf '%s\n' "$SLUG" >> "$ACTIVE"
      # index()==1 is a literal prefix test — `grep "^$DIR/wt/"` would read any
      # regex metachar in the path as syntax.
      LASTBODY=$(awk -v p="$DIR/wt/" 'index($0,p)==1' "$LINKS" | tail -1)
      ;;
  esac
done < "$LINKS"

echo ""

# Orphans — REPORT ONLY, never removed (Rule 6: Nothing is Deleted).
while IFS= read -r rslug; do
  M="$GHQ_ROOT/github.com/$rslug"
  [ -d "$M/.git" ] || continue
  wtlist "$M" > "$PORC"

  # Registered but gone from disk. Do NOT grep for `prunable` alone: a LOCKED
  # worktree is never labelled prunable and `git worktree prune` skips it — and
  # /incubate locks every body, so that is the COMMON case, not the rare one
  # (measured, #487). Test the directory instead, and emit the heal command that
  # actually works for each case.
  # sub(/^worktree /,"")+$0, never $2 — `$2` truncates a path at its first space,
  # and then EVERY live body reads as gone-from-disk (measured on a ghq root
  # containing a space, #487).
  awk '/^worktree /{sub(/^worktree /,""); p=$0; k=0; next}
       /^locked/{k=1; next}
       /^$/{if(p!=""){print (k?"L":"U")"\t"p; p=""}; next}
       END{if(p!="")print (k?"L":"U")"\t"p}' "$PORC" \
  | while IFS="$(printf '\t')" read -r flag wtpath; do
      [ "$wtpath" = "$M" ] && continue
      [ -d "$wtpath" ] && continue
      if [ "$flag" = "L" ]; then
        echo "  🧟 $wtpath (registered, gone from disk, locked)"
        echo "      heal: git -C $M worktree unlock $wtpath && git -C $M worktree prune"
      else
        echo "  🧟 $wtpath (registered, gone from disk)"
        echo "      heal: git -C $M worktree prune"
      fi
    done

  # Registered, on disk, but with NO ψ symlink — a crash between `worktree add`
  # and `ln -sfn`. Invisible to the render loop above (which is driven by ψ
  # links) and to both other orphan classes, yet it still blocks the mother
  # offload, so --status used to contradict --offload about how many bodies
  # exist (#487).
  awk '/^worktree /{sub(/^worktree /,""); print $0}' "$PORC" | tail -n +2 \
  | while IFS= read -r wtpath; do
      [ -d "$wtpath" ] || continue
      [ -L "$ROOT/ψ/incubate/$rslug/wt/$(basename "$wtpath")/origin" ] && continue
      echo "  ⚠  $wtpath (registered, no ψ link)"
      echo "      heal: /incubate $rslug --wt $(basename "$wtpath")"
    done

  # The invisible orphan: admin dir deleted, body kept. `worktree list` cannot
  # see it at all, so it is found by set-difference against what IS listed.
  for d in "$WT_ROOT/$rslug"/*; do
    [ -d "$d" ] || continue
    grep -qxF "worktree $d" "$PORC" || echo "  ⚠  $d (on disk, unknown to git) — report only"
  done
done < "$ACTIVE"

# Repos and bodies are counted SEPARATELY — the old single counter printed
# "Total: 3" for 1 repo + 2 bodies (#487).
echo ""
echo "  $REPOS repo · $BODIES bodies ($LIVE live) · $DIRTY dirty"

# --include-offloaded: also list .origins entries with no live symlink (#280)
if [ "$INCLUDE_OFFLOADED" = "--include-offloaded" ] && [ -f "$ROOT/ψ/incubate/.origins" ]; then
  echo ""
  echo "📦 Offloaded (in .origins, no live symlink)"
  echo ""
  OFFLOADED_COUNT=0
  # De-dup through a private snapshot, never read the shared file raw (#487).
  # The guarded append can leave a duplicate line (measured: 15/30 trials, 4
  # concurrent runs) and this loop used to list the repo twice and print
  # `Offloaded: 3` for two repos — disagreeing with the counter below, which
  # already did `sort -u`, in the same command. A `sort -u | while` PIPE would
  # put OFFLOADED_COUNT in a subshell and lose it, hence the temp file.
  OSNAP=$(mktemp "${TMPDIR:-/tmp}/incubate-origins.XXXXXX")
  sort -u "$ROOT/ψ/incubate/.origins" > "$OSNAP"
  while IFS= read -r slug; do
    [ -z "$slug" ] && continue
    if ! grep -qxF "$slug" "$ACTIVE"; then
      if [ -d "$GHQ_ROOT/github.com/$slug" ]; then
        echo "  $slug (ghq preserved at $GHQ_ROOT/github.com/$slug)"
      else
        echo "  $slug (ghq absent — fully purged)"
      fi
      OFFLOADED_COUNT=$((OFFLOADED_COUNT + 1))
    fi
  done < "$OSNAP"
  rm -f "$OSNAP"
  echo ""
  echo "  Offloaded: $OFFLOADED_COUNT"
elif [ -f "$ROOT/ψ/incubate/.origins" ]; then
  # `sort -u` absorbs the duplicate lines a guarded append can produce (#487).
  TOTAL_RECORDED=$(sort -u "$ROOT/ψ/incubate/.origins" | grep -cv '^$')
  OFFLOADED_HIDDEN=$((TOTAL_RECORDED - REPOS))
  if [ "$OFFLOADED_HIDDEN" -gt 0 ]; then
    echo "  ($OFFLOADED_HIDDEN offloaded — use --include-offloaded to view)"
  fi
fi

rm -f "$LINKS" "$ACTIVE" "$PORC"
```

Crash states, heal recipes, and the full error catalogue live in
[`references/worktree-recovery.md`](references/worktree-recovery.md).

**Done.** No hub file update needed.

---

## Mode: --offload (cleanup)

Remove symlink, keep ghq clone and hub file.

| Invocation | Retires |
|---|---|
| `--offload <repo>` | the mother symlink — **refuses while bodies live** |
| `--offload <repo> --wt <slug>` | one body; **the branch always survives** |
| `--offload <repo> --all-wt` | every body on this machine, one outcome line each |
| `… --purge` | additionally drops `.origins` entry / deletes a merged branch |

Add `--purge` to also remove the entry from `.origins` manifest (#280) —
useful when you want the offloaded slug to NOT count toward the total any more.

```bash
ROOT="$(pwd)"
GHQ_ROOT=$(ghq root)
WT_ROOT="${INCUBATE_WT_ROOT:-${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees}"
SLUG="[OWNER/REPO or REPO]"
PURGE=""   # "--purge" — also drop from .origins / delete a merged branch
WT=""      # bare slug for ONE body (e.g. "fix-auth"), or the literal "--all-wt".
           # NOT "--wt fix-auth" — see the dispatch guard below.

# ---- Resolve the repo EXACTLY (#487) ----
# The old `grep -i "$SLUG" | head -1` picked by readdir order: with acme/api and
# acme/api-gateway both present, `--offload api` selected acme/api-gateway — the
# WRONG repo, which becomes destructive once bodies exist. Exact match wins,
# suffix match is the fallback, ties are reported instead of guessed. `/wt/` is
# excluded so a body can never be mistaken for a mother.
# NO `xargs -I` (#487): BSD xargs — macOS, the primary machine — aborts with
# `command line cannot be assembled, too long` on any input line ≥ 255 bytes
# (measured: 254 ok, 255 rc=1), which a deep ghq root reaches easily. GNU xargs
# has no such limit, so this failed only on macOS. Same `while read` shape the
# --status block already uses.
CANDS=$(find "$ROOT/ψ/incubate" -name origin -type l -print 2>/dev/null \
        | while IFS= read -r l; do d=$(dirname "$l"); printf '%s\n' "${d#"$ROOT/ψ/incubate/"}"; done \
        | grep -v '/wt/' | sort)
# Exact first, then a LITERAL suffix match. Not `grep -xE ".*/$SLUG"`: `.` is a
# regex wildcard there too, so `--offload api.js` could select `acme/apiXjs`.
SEL=$(printf '%s\n' "$CANDS" | grep -xF "$SLUG")
[ -z "$SEL" ] && SEL=$(printf '%s\n' "$CANDS" \
  | awk -v s="/$SLUG" 'length($0)>length(s) && substr($0,length($0)-length(s)+1)==s')
if [ -z "$SEL" ]; then
  echo "✗ Not found: $SLUG"
  # QUOTED — unquoted $CANDS word-splits any path containing a space.
  echo "Active incubations:"; printf '  %s\n' "$CANDS"
  exit 1
fi
if [ "$(printf '%s\n' "$SEL" | grep -c .)" -gt 1 ]; then
  echo "✗ Ambiguous '$SLUG' — name the owner too:"; printf '  %s\n' "$SEL"
  exit 2
fi
OWNER=$(dirname "$SEL"); REPO=$(basename "$SEL")
MOTHER="$GHQ_ROOT/github.com/$SEL"

# -z is MANDATORY, never plain --porcelain (#487) — see "Directory Structure".
# Without it a Thai or quoted --task makes every guard below misread its own
# lock as a foreign tool's and refuse the body forever.
wtlist() { git -C "$MOTHER" worktree list --porcelain -z 2>/dev/null | tr '\0' '\n'; }

# ---- Retire ONE body. Returns non-zero when it refuses; never destroys. ----
offload_body() {
  _s="$1"
  _wt="$WT_ROOT/$OWNER/$REPO/$_s"
  _link="$ROOT/ψ/incubate/$OWNER/$REPO/wt/$_s"
  if [ ! -d "$_wt" ]; then
    echo "  ⓘ wt/$_s — no directory on this machine"
    if wtlist | grep -qxF "worktree $_wt"; then
      echo "      still registered — heal: git -C $MOTHER worktree unlock $_wt; git -C $MOTHER worktree prune"
      return 1
    fi
    return 0
  fi
  if ! wtlist | grep -qxF "worktree $_wt"; then
    echo "  ⚠  wt/$_s — on disk but unknown to git; report only, not touched"; return 1
  fi
  _r=$(wtlist | awk -v w="worktree $_wt" \
       '$0==w{f=1;next} f&&/^locked /{sub(/^locked /,"");print;exit} f&&/^$/{exit}')
  _by=$(printf '%s' "$_r" | awk -F'|' '$1=="incubate"{print $2}')
  _me="${INCUBATE_AGENT:-$(id -un)@$(hostname -s)}"
  if [ -n "$_by" ] && [ "$_by" != "$_me" ]; then
    echo "  ✗ wt/$_s — held by $_by, refusing (their work, their call)"; return 1
  fi
  if [ "$_r" = "initializing" ]; then
    # git's OWN lock, written during `worktree add` and left by a kill -9
    # mid-checkout (E11). Classifying it as "another tool" wedged the body, the
    # slug AND the mother offload permanently, with no --force to escape (#487).
    echo "  ⚠ wt/$_s — crashed mid-create (git's own 'initializing' lock, E11)"
    echo "      git -C $_wt status                 # see what landed"
    echo "      git -C $MOTHER worktree unlock $_wt"
    echo "      then re-run this offload"
    return 1
  fi
  if [ -n "$_r" ] && [ -z "$_by" ]; then
    echo "  ✗ wt/$_s — locked by another tool, refusing"; return 1
  fi
  # Probe for dirt BEFORE unlocking (#487). `unlock` then a refused `remove`
  # left the body in place with its owner/timestamp/task erased — the only
  # ownership metadata the design has — so `--status` showed `(unlocked)`, a
  # peer could re-claim it, and the very next `--all-wt` would delete work that
  # had just been reported as "skipped, nothing was destroyed".
  if [ -n "$(git -C "$_wt" status --porcelain 2>/dev/null)" ]; then
    echo "  ✗ wt/$_s — uncommitted work, NOT removed (still locked). Save it first:"
    echo "      cd $_wt && git add -A && git commit -m 'wip' && git push -u origin incubate/$_s"
    return 1
  fi
  git -C "$MOTHER" worktree unlock "$_wt" 2>/dev/null || true
  # NO --force. EVER. Plain `remove` fails closed on modified AND untracked-only
  # trees and leaves the body intact — the one place Rule 6 matters most (#487).
  if ! git -C "$MOTHER" worktree remove "$_wt" 2>/dev/null; then
    # Lost a race with the body's own agent, or a submodule/permission problem.
    # Restore the lock we took off: a refusal must leave NOTHING changed.
    [ -n "$_r" ] && git -C "$MOTHER" worktree lock --reason "$_r" "$_wt" 2>/dev/null
    echo "  ✗ wt/$_s — could not be removed, NOT touched. Save any work first:"
    echo "      cd $_wt && git add -A && git commit -m 'wip' && git push -u origin incubate/$_s"
    return 1
  fi
  unlink "$_link/origin" 2>/dev/null
  rmdir "$_link" 2>/dev/null
  rmdir "$ROOT/ψ/incubate/$OWNER/$REPO/wt" 2>/dev/null
  echo "  ✓ wt/$_s retired — branch incubate/$_s survives"
  if [ "$PURGE" = "--purge" ]; then
    # -d only, NEVER -D: -d refuses to delete an unmerged branch.
    if git -C "$MOTHER" branch -d "incubate/$_s" 2>/dev/null; then
      echo "    ✂ branch incubate/$_s deleted"
    else
      echo "    ⓘ branch incubate/$_s kept (unmerged — branch -d refuses, and we never -D)"
    fi
  fi
  return 0
}

# ---- Dispatch ----
if [ "$WT" = "--all-wt" ]; then
  # Collect outcomes, never abort the batch: with N agents, some bodies
  # legitimately belong to live peers. Exit 1 if anything was skipped.
  #
  # The slug list is the UNION of the git registry and the disk (#487). Driving
  # it from the disk glob alone made a registered-but-gone body invisible here
  # while the mother guard below — which counts the REGISTRY — still saw it, so
  # the refusal pointed at the command that had just silently done nothing:
  # `--all-wt` rc=0 printing only its header, then `--offload` rc=1 forever.
  # offload_body already handles both halves correctly once it is reached.
  echo "🧹 Retiring all bodies of $SEL"
  RC=0
  SLUGS=$(mktemp "${TMPDIR:-/tmp}/incubate-slugs.XXXXXX")
  { wtlist | awk '/^worktree /{sub(/^worktree /,""); print $0}' | tail -n +2
    for d in "$WT_ROOT/$OWNER/$REPO"/*; do [ -e "$d" ] && printf '%s\n' "$d"; done
  } | while IFS= read -r p; do [ -n "$p" ] && basename "$p"; done | sort -u > "$SLUGS"
  while IFS= read -r s; do
    [ -z "$s" ] && continue
    offload_body "$s" || RC=1
  done < "$SLUGS"
  rm -f "$SLUGS"
  [ "$RC" -eq 0 ] || echo "  ⚠ some bodies were skipped — nothing was destroyed"
  exit $RC
elif [ -n "$WT" ]; then
  # A flag-shaped value means the caller filled $WT the way the old comment read
  # ("--wt fix-auth"). That used to fall through to a bare-slug lookup, print
  # `ⓘ wt/--wt fix-auth — no directory` and exit 0 — the one silent no-op in the
  # whole offload path (#487).
  case "$WT" in -*) echo "✗ WT must be a bare slug (e.g. fix-auth), not a flag"; exit 2 ;; esac
  offload_body "$WT"; exit $?
fi

# ---- Mother offload: refuse while bodies live (#487) ----
LIVE=$(wtlist | grep -c '^worktree ')
if [ "${LIVE:-0}" -gt 1 ]; then
  echo "✗ $SEL still has $((LIVE - 1)) live body/bodies:"
  wtlist | awk '/^worktree /{sub(/^worktree /,""); print "    "$0}' | tail -n +2
  echo "  → retire them first: /incubate --offload $SEL --all-wt"
  echo "    (it retires what it can and names the exact heal for anything it will not touch)"
  exit 1
fi

unlink "$ROOT/ψ/incubate/$SEL/origin"
rmdir "$ROOT/ψ/incubate/$OWNER" 2>/dev/null
echo "✓ Offloaded: $SEL"
echo "  Hub file remains: $ROOT/ψ/incubate/$SEL/$REPO.md"
echo "  ghq clone preserved for future use"

# --purge: remove from .origins manifest (#280)
if [ "$PURGE" = "--purge" ] && [ -f "$ROOT/ψ/incubate/.origins" ]; then
  # RACE A, second half (#487). Step 0's append is guarded and safe, but THIS is
  # still a read-modify-write of the same shared committed file, and `mv` only
  # makes the swap atomic for READERS — it does nothing about lost UPDATES.
  # Measured 20/20 trials: one purge against 8 concurrent appends, survivors
  # ranged 0/8 to 6/8. A repo whose clone, symlink and hub file all exist
  # vanished from the manifest, so --init never restored it again.
  #
  # Compare-and-swap: if a byte landed while we were rewriting, throw the
  # rewrite away and start over; after 10 attempts give up rather than lose an
  # entry. This narrows the window from the whole rewrite to a single syscall
  # — it does not erase it, which is one more reason Principle 1 prefers
  # --include-offloaded over --purge.
  #
  # mktemp in the DESTINATION directory, not $TMPDIR: $TMPDIR is often a
  # different filesystem, where `mv` is copy+unlink rather than an atomic rename,
  # and mktemp's 0600 mode would then land on a tracked file.
  ORIGINS="$ROOT/ψ/incubate/.origins"
  PURGED=""; I=0
  while [ "$I" -lt 10 ]; do
    I=$((I + 1))
    SIZE=$(wc -c < "$ORIGINS" | tr -d ' ')
    TMPFILE=$(mktemp "$ROOT/ψ/incubate/.origins.XXXXXX")
    # -xF, NEVER "^${SEL}$": `.` is a regex wildcard, so purging `acme/api.js`
    # would also delete `acme/apiXjs`.
    grep -vxF "$SEL" "$ORIGINS" > "$TMPFILE" || true
    chmod 644 "$TMPFILE"
    if [ "$(wc -c < "$ORIGINS" | tr -d ' ')" = "$SIZE" ]; then
      mv "$TMPFILE" "$ORIGINS"; PURGED=1; break
    fi
    rm -f "$TMPFILE"
  done
  if [ -n "$PURGED" ]; then
    echo "  ✂ Purged '$SEL' from .origins manifest"
    echo "  ⚠ This breadcrumb is gone — re-incubate to restore it (Principle 1: prefer --include-offloaded over --purge)"
  else
    echo "  ⓘ .origins is being appended to concurrently — purge skipped, nothing lost"
    echo "    (the symlink is already gone; re-run --offload $SEL --purge when the fleet is idle)"
  fi
fi
```

`--all-wt` is **not atomic** and cannot be without a journal — but every step is
idempotent, so re-running after a partial failure is safe. Every refusal path
also restores whatever it touched, so a re-run starts from the same state.

---

## Step 2: Create/Update Hub File (REPO.md)

Runs for **default**, `--flash` and `--contribute` only. It does **not** run for
`--status`, `--offload`, or `--wt`.

`--wt` is excluded deliberately (#487): `REPO.md` is a single **committed** file
that every body would append to, so N agents claiming bodies in the same minute
each commit and push the vault, two of three pushes are rejected
non-fast-forward, and the rebase collides in one hunk and drops a session
record. That is the ψ-git contention the `--wt` design exists to eliminate —
worse than the `.origins.d/<slug>.yaml` this file already rejects, because
`.origins.d` was at least one file per body. **A body's record is its worktree
lock reason, not a hub-file entry.**

For the modes that do run it: create or update the hub file:

```markdown
# [REPO] Incubation Log

## Source
- **Origin**: ./origin/
- **GitHub**: https://github.com/OWNER/REPO

## Sessions

### [TODAY] — [mode]
- **Branch**: [branch-name]
- **Status**: active | offloaded | flash-completed
- **Changes**: [summary of what was done]
- **PRs**: #N, #M (if any)
```

Append new sessions. Never overwrite existing entries (Nothing is Deleted).

---

## Output Summary

### Default mode

announce-mode → bash substitutes $ROOT/$OWNER/$REPO/$WORK_DIR to absolute paths;
never print "Location: ψ/..." literally. See CONVENTIONS.md.

```bash
echo "🌱 Incubating: $REPO"
echo ""
echo "  Mode:     default (long-term dev)"
echo "  Location: $ROOT/ψ/incubate/$OWNER/$REPO/"
echo "  Working:  $WORK_DIR"
echo "  Branch:   $(git -C "$WORK_DIR" branch --show-current)"
echo "  Remote:   $(git -C "$WORK_DIR" remote get-url origin)"
echo "  Status:   $(git -C "$WORK_DIR" status --short | wc -l) changed files"
echo ""
echo "  Next: make changes, commit, push, create PR"
echo "  Done: /incubate --offload $OWNER/$REPO"
```

### --wt mode

announce-mode → bash substitutes; the body path is always absolute.

```bash
echo "🌱 Body claimed: $OWNER/$REPO wt/$SLUG"
echo ""
echo "  Branch:  incubate/$SLUG"
echo "  Working: $WT"
echo "  Task:    $TASK"
echo "  Owner:   ${OWNER_ID:-${INCUBATE_AGENT:-$(id -un)@$(hostname -s)}}"
echo "  Mother:  $MOTHER (fetch-only — never pull it from here)"
echo ""
echo "  Next: cd $WT — your worktree, your branch, no git op outside it"
echo "  Done: /incubate --offload $OWNER/$REPO --wt $SLUG"
```

### --flash mode
```
⚡ Flash Complete: [REPO]

  Issue:  #N created
  Branch: issue-N-description
  PR:     #M (closes #N)
  Result: Offloaded & Purged

  ✓ Issue #N → PR #M → Done
```

### --contribute mode

announce-mode → bash substitutes; never print "Location: ψ/..." literally.

```bash
echo "🤝 Contributing: $REPO"
echo ""
echo "  Location: $ROOT/ψ/incubate/$OWNER/$REPO/"
echo "  Fork:     ${FORK_URL:-[none]}"
echo "  Branches: ${BRANCHES:-[list]}"
echo "  PRs:      ${PRS:-[list]}"
echo ""
echo "  Next: continue working, or /incubate --offload when done"
```

### --status mode

The actual emission lives in the bash block under `Mode: --status` above — every
path is resolved via `readlink`, so all of them are absolute (CONVENTIONS.md).
Ordering is stable (repo, then slug, lexical) so two runs diff cleanly.
Example rendering:

```
🌱 Incubations

  acme/hermes-gateway                origin ✓ main · ○ clean · /opt/Code/github.com/acme/hermes-gateway
  ├─ wt/fix-auth      ● dirty 3 incubate/fix-auth      "restore session cookie on 401 retry"
  │                   nat@m5 · 2h ago · ~/.local/state/incubate/worktrees/acme/hermes-gateway/fix-auth
  └─ wt/rate-limit    ○ clean   incubate/rate-limit    "add token bucket to /v1/send"
                      nat@m5 · 20m ago · ~/.local/state/incubate/worktrees/acme/hermes-gateway/rate-limit

  🧟 …/worktrees/acme/hermes-gateway/old   (registered, gone from disk) — heal: git worktree prune
  ⚠  …/worktrees/acme/hermes-gateway/half  (registered, no ψ link) — heal: /incubate acme/hermes-gateway --wt half
  ⚠  …/worktrees/acme/hermes-gateway/lost  (on disk, unknown to git) — report only

  1 repo · 2 bodies (2 live) · 1 dirty
```

Four states are reported and **none** is auto-removed (Rule 6): live bodies in
the tree, `🧟` registered-but-gone, `⚠` registered-with-no-ψ-link, and `⚠` on
disk but unknown to git. A body that is registered but has no ψ symlink is the
crash residue of dying between `worktree add` and `ln -sfn`; it must be listed
because it still blocks the mother offload, and `--status` used to be the one
command that could not see it (#487).

A mother with no bodies prints one line and nothing else. Repos and bodies are
counted separately — the old single counter reported `Total: 3` for 1 repo with
2 bodies (#487).

---

## .gitignore Pattern

The pattern is auto-added to `.gitignore` on first `/incubate` run (#250). If you need to add it manually:

```gitignore
# Ignore origin symlinks only (source lives in ghq)
# Note: no trailing slash — origin is a symlink, not a directory
ψ/incubate/**/origin
```

**Bodies need no new rule (#487).** Because every body link is also named
`origin`, `ψ/incubate/OWNER/REPO/wt/<slug>/origin` is already matched by the
`**` in the existing pattern — confirmed with `git check-ignore -v`. Naming the
link after the slug instead would leave it **untracked and unignored**, which is
exactly why the filename is fixed. Do not add a `wt/` rule.

Since the only thing inside `wt/<slug>/` is that ignored symlink, git never sees
the directory at all — no `.gitkeep`, nothing committed, nothing to conflict on
when N agents work at once.

---

## Trace Connection

After incubation work, log to Oracle so it's discoverable via `/trace`:

### Save the lesson (two-layer pattern)

1. Write to `ψ/memory/learnings/YYYY-MM-DD_incubate-<slug>.md` with frontmatter:
   ```yaml
   ---
   pattern: "Incubated [REPO]: [what was done — PR#, branch, outcome]"
   date: <today>
   source: incubate: OWNER/REPO
   concepts: ["incubate", "development", <relevant-tags>]
   ---

   # Incubated [REPO]
   <body: what was done, PR#, branch, outcome>
   ```

2. The Oracle's auto-memory layer picks up new files in `ψ/memory/learnings/` automatically — no separate API call needed.

This connects `/incubate` to the shared knowledge layer.

---

## Anti-Patterns

| Wrong | Right |
|-------|-------|
| `git clone` directly to ψ/ | `ghq get` then symlink |
| Flat: `ψ/incubate/repo-name` | Org structure: `ψ/incubate/owner/repo` |
| Copy files | Symlink always |
| Manual clone outside ghq | Everything through ghq |
| Delete ghq clone after work | Offload symlink only (Nothing is Deleted) |
| Second clone of the same repo for a second agent | One mother, N worktrees (`--wt`) |
| `ln -sf` onto an existing link | `ln -sfn` — `-sf` leaves the old target and drops a stray link *inside* it |
| `sort -u -o F F` on a shared file | Guarded append — read-modify-write loses concurrent updates |
| Rewriting `.origins` in place (`grep -v … \| mv`) | Compare-and-swap on its byte size, and give up rather than lose a peer's append |
| `grep -v "^$SEL$"` to drop a manifest line | `grep -vxF "$SEL"` — `.` is a regex wildcard, so `acme/api.js` also matches `acme/apiXjs` |
| `mkdir`/`flock`/`.lock` dirs to claim a slug | `git worktree add -b` — the ref transaction *is* the claim |
| `worktree add -b` then a separate `worktree lock` | `worktree add --lock --reason …` — two commands leave the body observable *unowned* |
| `worktree add -b` onto an existing path | Guard with `[ -e ]` first — git creates the branch *before* validating the path and leaks it on failure |
| `git worktree list --porcelain` for parsing | `--porcelain -z \| tr '\0' '\n'` — plain porcelain C-quotes any non-ASCII or quoted lock reason |
| `awk '/^worktree /{print $2}'` | `sub(/^worktree /,""); print $0` — `$2` truncates at the first space |
| Treating `locked initializing` as a foreign tool | It is **git's own** lock (E11) — report the crash, offer the unlock |
| `worktree unlock` before checking for dirt | Probe `status --porcelain` first — a refused offload must not drop the ownership record |
| `git worktree remove --force` | Plain `remove` — it fails closed on dirty *and* untracked-only trees |
| `git branch -D incubate/<slug>` | `-d` only, and only under `--purge` |
| `ghq get -u` on the mother while bodies exist | `git fetch --prune` — pulling stashes a peer's uncommitted work |
| `rm -rf` the mother while bodies live | Refuse, then `mv` aside before deleting — bodies' commits live in the mother's object store and do **not** come back |
| Bodies under `$(ghq root)` | Outside it — ghq reads a worktree's `.git` *file* as a repo and lists phantoms |
| `xargs -I{}` over a list of paths | `while IFS= read -r` — BSD xargs dies on any line ≥ 255 bytes |
| `git gc` / `worktree prune` / `branch -D` from inside a body | Your worktree, your branch — no git op outside it |
| Committing a per-body manifest — or a `REPO.md` session block — per body | `git worktree list --porcelain -z` + the lock reason (no ψ git race) |
| `declare -A` in a skill's bash | Sorted temp file + `grep -qxF` — stock macOS bash is 3.2 |

---

## Notes

- Default: clone + symlink, ready for long-term development
- `--wt <slug>`: one `git worktree` body per agent on the shared mother clone (#487)
- `--flash`: complete cycle (issue → branch → PR → offload + purge) for quick fixes
- `--contribute`: fork-aware multi-feature workflow for external repos
- `--status`: query all active incubations and their bodies without cloning
- `--offload`: remove symlink, keep ghq and hub file; `--wt`/`--all-wt` retire bodies
- Auto-creates private repos when target doesn't exist on GitHub
- `origin/` symlink structure allows easy offload without losing ghq clone
- `.origins` manifest enables `--init` restore after fresh git clone
- Mirror of `/learn`: learn = LEFT hand (study), incubate = RIGHT hand (work)

### Multi-agent notes (#487)

- **Plain `git worktree` + POSIX shell only.** No maw, no fleet, no extra
  toolchain — `--wt` works on a fresh machine with git and ghq alone.
  Needs git ≥ 2.36 for `worktree list --porcelain -z`.
- **Nothing new is committed.** Bodies leave no trace in ψ except a gitignored
  symlink — no `.origins` line, no `REPO.md` session block (Step 2 does not run
  for `--wt`) — so N agents never contend on the vault's git index.
- **`.origins` format is unchanged.** A vault written by the previous `/incubate`
  reads identically here, and vice versa. No migration, mandatory or otherwise.
- **Never typing `--wt` gives the old behaviour**, minus four measured bugs
  (lost `.origins` entries, `ln -sf` mis-linking, the bash-3.2 `--status` abort,
  and `--offload` selecting the wrong repo).
- **Bodies live outside `$(ghq root)`** — `$INCUBATE_WT_ROOT`, defaulting to
  `${XDG_STATE_HOME:-$HOME/.local/state}/incubate/worktrees` — because ghq reads
  a linked worktree's `.git` file as a repository and would list every body as a
  phantom entry to every other skill on the shelf.
- **Known limitation:** slugs are not coordinated across machines. Two agents on
  two machines can both create `incubate/fix-auth`; the conflict only surfaces at
  push time.
- **Known limitation:** `--purge` on `.origins` is compare-and-swap, not atomic.
  It gives up rather than lose a concurrent append, so the worst case is a
  breadcrumb that stays instead of a breadcrumb that vanishes.
- **A body's unpushed commits live in the mother's object store**, not in the
  body directory. Deleting the mother destroys them and no re-clone brings them
  back — which is why `--flash --purge` refuses over live bodies *and* over
  unpushed `incubate/*` commits. Push early.
- **`INCUBATE_AGENT`** overrides the owner id. Without it the fallback is
  `$(id -un)@$(hostname -s)`, which is identical for N agents on one host — so
  "is this my body?" degrades to "is this my host?".
- Crash states and heal recipes: [`references/worktree-recovery.md`](references/worktree-recovery.md).

---

ARGUMENTS: $ARGUMENTS
