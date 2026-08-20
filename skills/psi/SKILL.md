---
name: psi
description: Attach a code repo's ψ vault to a caretaker oracle — check, link, heal, unlink. Use when a plain code repo (open-source, not an oracle) should keep memory in another oracle's vault, when the user says "psi check", "psi link", "share the vault", "symlink ψ to neo", "who takes care of this repo's memory", or when a ψ symlink went missing after a checkout. Do NOT trigger for creating an oracle (use /awaken), cloning repos for development (use /incubate), or writing a retrospective (use /rrr).
argument-hint: "[check | link | heal | unlink]"
---

# /psi

> "A code repo does not need to be an oracle to have a memory."

Point a plain code repo's `ψ` at a **caretaker oracle's** vault, so the repo keeps a brain
without becoming an oracle and without committing vault content into public source history.

```text
/psi          # same as check
/psi check    # what is ψ here, who takes care of it, is it safe
/psi link     # ask which oracle, then absorb → symlink → ignore → verify
/psi heal     # symlink vanished after a checkout, or ignore rules incomplete
/psi unlink   # go back to a standalone real ψ
```

## The model

```
code repo/ψ  ──symlink──▶  caretaker oracle/ψ
   (ignored, never committed)     (tracked — it IS the brain)
```

| Repo kind | ψ | git |
|---|---|---|
| **code repo** — software someone else could clone and build | symlink to caretaker | **ignored, never tracked** |
| **oracle repo** — has an oracle identity | real directory | **tracked** |

## Pick the caretaker — show, don't guess

Never assume which oracle takes care of a repo. **Show the fleet and let the human name
it.** Linking to the wrong vault mixes two oracles' memory.

```bash
maw ls
```

Ask: *"Which oracle should take care of this repo's memory?"* The human answers with a
name (`neo`, `pulse`, `beta`). Resolve it — the short name works:

```bash
maw locate "$ORACLE_NAME"   # prints: repo: /path/to/<name>-oracle  and  ψ/: present
```

Take the `repo:` line as `CARETAKER`. If `maw locate` finds nothing, or its `ψ/` is not
`present`, stop and say so — do not fall back to a guess.

Do **not** loop over repos or scan the filesystem looking for candidates. One repo, one
question, one answer.

## `check`

Report what you verified, never what you assume. Every line is the output of a command —
`readlink -f` for the real target, `ls-files -s` for the mode bits, `check-ignore -v` for
the rule that actually matched. Close with one **FOCUS** line: the single next action.

```bash
REPO=$(git rev-parse --show-toplevel) || exit 1
GI="$REPO/.gitignore"

# ── ψ: type, size, staleness ─────────────────────────────────────────────
if [ -L "$REPO/ψ" ]; then
  TARGET=$(readlink "$REPO/ψ"); REAL=$(readlink -f "$REPO/ψ")
  [ -e "$REPO/ψ/" ] && ALIVE=alive || ALIVE='DANGLING'
  case "$TARGET" in /*) ABS=' ⚠️ absolute';; *) ABS='';; esac
  PSI="symlink → $TARGET$ABS"; PSI2="resolves  $REAL ($ALIVE)"
elif [ -d "$REPO/ψ" ]; then
  N=$(find "$REPO/ψ" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
  NEW=$(find "$REPO/ψ" -type f ! -name '.DS_Store' -exec stat -f '%m' {} \; 2>/dev/null | sort -rn | head -1)
  AGE=$(( ( $(date +%s) - ${NEW:-$(date +%s)} ) / 86400 ))
  PSI="real dir · $N files · newest $(date -r "${NEW:-0}" +%F 2>/dev/null) (${AGE}d old)"; PSI2=""
else
  PSI="absent"; PSI2=""
fi

# ── git: is any of it tracked? is the LINK itself committed? ─────────────
TRACKED=$(git -C "$REPO" ls-files ψ | wc -l | tr -d ' ')
git -C "$REPO" ls-files -s ψ | rg -q '^120000' && BLOB='⚠️ SYMLINK COMMITTED' || BLOB=no

# ── ignore: both forms, and the rule git actually matched ───────────────
rg -qx 'ψ'  "$GI" 2>/dev/null && BARE=yes || BARE='NO ⚠️'
rg -qx 'ψ/' "$GI" 2>/dev/null && SLASH=yes || SLASH=NO
RULE=$(git -C "$REPO" check-ignore -v ψ 2>/dev/null | awk '{print $1}') || RULE='NOT IGNORED ⚠️'

# ── kind + caretaker ────────────────────────────────────────────────────
[ "$TRACKED" -gt 0 ] && KIND='oracle repo (ψ is tracked — it IS the brain)' \
                     || KIND='code repo (ψ must stay ignored)'
# NOTE: no \K — this rg build rejects it, and the error would silently read as "none".
CARE=$(sed -n 's/^oracle: *//p' "$REPO/.claude/PSI_CARETAKER" 2>/dev/null)
[ -n "$CARE" ] || CARE='none recorded'

printf '%-9s %s\n' repo "$REPO" kind "$KIND" ψ "$PSI"
[ -n "$PSI2" ] && printf '%-9s %s\n' '' "$PSI2"
printf '%-9s tracked=%s  symlink-blob=%s\n' git "$TRACKED" "$BLOB"
printf '%-9s bare-ψ=%s  ψ/=%s  → %s\n' ignore "$BARE" "$SLASH" "$RULE"
printf '%-9s %s\n' caretaker "$CARE"
```

### Deciding FOCUS

Emit exactly one, first match wins — most dangerous first:

| Condition | FOCUS |
|---|---|
| `symlink-blob` committed | **leaking a machine path in git history** → `/psi heal`, then decide on a history rewrite |
| symlink `DANGLING` | **brain unreachable** → `/psi heal` |
| symlink target absolute | **breaks on every other machine** → `/psi heal` (rewrites relative) |
| code repo & `bare-ψ=NO` | **ψ will leak the moment it is linked** → add the bare rule |
| code repo & `NOT IGNORED` | **do not commit** → fix `.gitignore` first |
| code repo, real dir, no caretaker | **orphaned vault — no oracle reads these N files** → `/psi link` |
| oracle repo, ψ tracked | ✅ correct — the vault belongs here, nothing to do |
| symlink alive, relative, ignored | ✅ linked and safe |

A stale `newest` date is worth naming even on a ✅ — a vault whose newest file is weeks old
is why a later `/recap` will hand back a stale handoff as if it were current.

## `link`

### 1. Refuse bad ground

Stop, with the reason, when the repo is itself an oracle (ψ tracked with real content),
when the caretaker has no ψ, or when ψ already points at that same caretaker (say
`already linked`, exit).

### 2. Absorb — dry run first, always

Replacing a populated ψ with a symlink orphans everything inside it. Fetch the caretaker
first so a stale vault is not merged over newer content.

```bash
git -C "$CARETAKER" fetch --quiet 2>/dev/null
NS="$CARETAKER/ψ/repos/$OWNER/$NAME"          # each repo gets its own subtree
rsync -a --dry-run --itemize-changes "$REPO/ψ/" "$NS/"
```

Print the itemized list and the file count, then **wait for approval**. Only then re-run
without `--dry-run`. Never `--delete`. Copy, verify the counts match, and *then* remove the
source — never in one command.

### 3. Link with a relative target

```bash
mkdir -p "$NS"
REL=$(python3 -c 'import os,sys;print(os.path.relpath(sys.argv[1],sys.argv[2]))' "$NS" "$REPO")
rm -rf "$REPO/ψ"              # only after the absorb was verified
ln -sfn "$REL" "$REPO/ψ"      # -n: do not descend into an existing symlink
readlink -f "$REPO/ψ"         # prove it resolves
```

`ln -sfn`, never `ln -sf` — with a pre-existing symlinked directory `-f` alone creates the
link *inside* the target instead of replacing it.

### 4. Ignore it, and prove it

```bash
for pat in 'ψ' 'ψ/'; do
  rg -qx "$pat" "$REPO/.gitignore" 2>/dev/null || echo "$pat" >> "$REPO/.gitignore"
done

if git -C "$REPO" ls-files --error-unmatch ψ >/dev/null 2>&1; then
  git -C "$REPO" rm --cached -r --quiet ψ
  echo "✓ untracked previously-committed ψ (history still holds it — rewrite separately)"
fi

git -C "$REPO" check-ignore -v ψ || echo "⚠️  ψ is NOT ignored — do not commit"
```

Verification is part of the step. If `check-ignore` prints nothing, the link is not safe —
report that instead of declaring success.

### 5. Record the caretaker

```bash
mkdir -p "$REPO/.claude"
printf 'oracle: %s\nrepo: %s\nvault: %s\ndate: %s\n' \
  "$ORACLE_NAME" "$CARETAKER" "$NS" "$(date +%F)" > "$REPO/.claude/PSI_CARETAKER"
rg -qx '.claude/PSI_CARETAKER' "$REPO/.gitignore" 2>/dev/null \
  || echo '.claude/PSI_CARETAKER' >> "$REPO/.gitignore"
```

Machine-local, ignored like the link. `check` reads it to name the caretaker without asking
again.

## `heal`

`git checkout` and `git merge` silently delete an **ignored** symlink when they remove the
last tracked sibling at that path — no error is printed. Repair, reporting each fix:

1. `PSI_CARETAKER` exists but `ψ` is missing → recreate the relative symlink.
2. `ψ` is a symlink that `readlink -f` cannot resolve → report the dangling target; do not
   invent a replacement.
3. An ignore form is missing → add it.
4. `ψ` is tracked → `git rm --cached -r ψ`.

Print `✓ nothing to heal` when clean.

## `unlink`

Copy the namespaced subtree back into a real `ψ`, replace the symlink, and leave the
caretaker's copy alone — never delete the vault side. Keep the ignore lines unless asked.

## Rules

- Show `maw ls` and let the human name the caretaker. Never guess, never scan for one.
- Ask before the first destructive step; dry-run output is not consent.
- Copy, verify, then delete — never in one command.
- Both `ψ` and `ψ/` in `.gitignore`, every time — a trailing slash matches directories
  only, so a `ψ/`-only rule stops matching the moment ψ becomes a symlink.
- Relative symlink targets only — machines disagree on the ghq root.
- Never commit ψ or the symlink in a code repo; never un-track ψ in an oracle repo.
- A shared vault is shared: give each repo its own subtree, and say so when linking.
- Report what you verified (`readlink -f`, `check-ignore`), not what you intended.
