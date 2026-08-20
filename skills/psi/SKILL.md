---
name: psi
description: Attach a code repo's ψ vault to a caretaker oracle — link, status, heal, unlink. Use when a plain code repo (open-source, not an oracle) should keep memory in another oracle's vault, when the user says "psi link", "share the vault", "symlink ψ to neo", "who takes care of this repo's memory", or when a ψ symlink went missing after a checkout. Do NOT trigger for creating an oracle (use /awaken), cloning repos for development (use /incubate), or writing a retrospective (use /rrr).
argument-hint: "[status | link --to <oracle> | heal | unlink | doctor]"
---

# /psi

> "A code repo does not need to be an oracle to have a memory."

Attach a plain code repo's `ψ` to a **caretaker oracle's** vault, so the repo keeps a
brain without becoming an oracle and without committing vault content into
(potentially public) source history.

## Command surface

```text
/psi                      # same as: status
/psi status               # resolve ψ, show caretaker, ignore + tracking state
/psi link --to <oracle>   # absorb existing ψ, then symlink to the caretaker vault
/psi heal                 # recreate a pruned symlink, repair ignore rules
/psi unlink               # restore a standalone real ψ (copies content back)
/psi doctor               # audit ψ hygiene across repos
```

`status`, `heal`, and `doctor` are read-mostly and safe. `link` and `unlink` move data —
they always dry-run first and never delete before you approve.

## The model

```
code repo/ψ  ──symlink──▶  caretaker oracle/ψ  [──may itself symlink──▶  private vault repo]
   (ignored, never committed)      (tracked — it IS the brain)
```

| Repo kind | ψ state | git |
|---|---|---|
| **code repo** (open source, no skills of its own) | symlink to caretaker | **ignored, never tracked** |
| **oracle repo** | real directory | **tracked** — the vault is the point |

Deciding which you are: if the repo has an oracle identity (`CLAUDE.md` describing an
oracle, an installed skill shelf) it is an oracle — leave its ψ real and tracked. If it is
software someone else could clone and build, it is a code repo — it gets a link.

## Six rules this skill exists to enforce

Each rule came from a real failure. Do not "simplify" any of them away.

1. **Ignore BOTH `ψ` and `ψ/`.** A trailing slash matches directories only. The moment ψ
   becomes a symlink, a `ψ/`-only rule stops matching and the link shows up as untracked.
2. **Never commit the symlink.** A tracked mode `120000` blob stores an absolute path from
   one machine and is meaningless in every other clone.
3. **Never write an absolute target.** Machines disagree on the ghq root
   (`/opt/Code`, `~/Code`, `/Users/<account>/Code`). Compute a relative target.
4. **Absorb before linking, with a dry run.** Replacing a populated ψ with a symlink
   orphans everything in it. Always `--dry-run` first, and `git fetch` the caretaker so a
   stale vault is not merged over newer content.
5. **Namespace what you write.** One physical vault shared by several repos will collide —
   two repos writing retros "a minute apart" contaminated each other's docs. Give each
   grafted repo its own subtree.
6. **Heal after checkout.** `git checkout`/`merge` silently deletes an *ignored* symlink
   when it removes the last tracked sibling at that path. No error is printed. Re-check.

## Resolve the caretaker

```bash
# Explicit --to wins; otherwise fall back to a recorded caretaker, then to maw.
CARETAKER_REPO=""
if [ -n "$TO" ]; then
  CARETAKER_REPO=$(ghq list --full-path 2>/dev/null | rg -m1 "/$TO\$" \
                   || maw locate "$TO" 2>/dev/null | rg -o '/[^ ]*/[^ ]*' | head -1)
elif [ -f .claude/PSI_CARETAKER ]; then
  CARETAKER_REPO=$(rg -o '^repo: *\K.*' .claude/PSI_CARETAKER)
fi

[ -d "$CARETAKER_REPO/ψ" ] || { echo "✗ caretaker vault not found: ${CARETAKER_REPO:-<unset>}"; exit 1; }
```

Never assume a caretaker. If none resolves, stop and ask — linking to the wrong vault
mixes two oracles' memory.

## `status`

Report the truth, never a guess. `readlink -f` collapses a multi-hop chain to the real
vault, which is the only path that matters.

```bash
REPO=$(git rev-parse --show-toplevel)
if [ -L "$REPO/ψ" ]; then
  echo "ψ:        symlink -> $(readlink "$REPO/ψ")"
  echo "resolves: $(readlink -f "$REPO/ψ")"
  echo "alive:    $([ -e "$REPO/ψ/" ] && echo yes || echo '✗ BROKEN — run /psi heal')"
elif [ -d "$REPO/ψ" ]; then
  echo "ψ:        real directory ($(find "$REPO/ψ" -type f | wc -l | tr -d ' ') files) — not linked"
else
  echo "ψ:        absent"
fi

echo "tracked:  $(git -C "$REPO" ls-files ψ | wc -l | tr -d ' ') entries $(git -C "$REPO" ls-files -s ψ | rg -q '^120000' && echo '⚠️  SYMLINK IS COMMITTED')"
echo "ignored:  bare-ψ=$(rg -qx 'ψ' "$REPO/.gitignore" 2>/dev/null && echo yes || echo NO)  ψ/=$(rg -qx 'ψ/' "$REPO/.gitignore" 2>/dev/null && echo yes || echo NO)"
```

A `120000` entry or `bare-ψ=NO` is a finding — surface it, do not bury it.

## `link --to <oracle>`

Five phases. Do not reorder them; each protects the next.

### 1. Refuse bad ground

Stop, with the reason, when:

- the repo is itself an oracle (its ψ is tracked with real content),
- the caretaker's ψ does not exist,
- `ψ` is already a symlink to this same caretaker (report `already linked`, exit 0).

### 2. Fetch the caretaker

```bash
git -C "$CARETAKER_REPO" fetch --quiet 2>/dev/null
git -C "$CARETAKER_REPO" status --short --branch | head -1   # show if behind
```

If the caretaker is behind its remote, say so and stop unless the user insists. Absorbing
into a stale vault silently loses the newer copies.

### 3. Absorb — dry run first, always

```bash
NS="$CARETAKER_REPO/ψ/repos/$OWNER/$REPO_NAME"     # rule 5: namespace per repo
rsync -a --dry-run --itemize-changes "$REPO/ψ/" "$NS/"
```

Print the itemized list and the file count. **Wait for approval.** Only then re-run without
`--dry-run`. Never pass `--delete`. Never delete the source in the same step as the copy —
copy, verify the counts match, and only then remove.

### 4. Link with a relative target

```bash
mkdir -p "$NS"
REL=$(python3 -c 'import os,sys;print(os.path.relpath(sys.argv[1],sys.argv[2]))' "$NS" "$REPO")
rm -rf "$REPO/ψ"            # only after the absorb was verified
ln -sfn "$REL" "$REPO/ψ"    # -n: do not descend into an existing symlink
readlink -f "$REPO/ψ"       # prove it resolves
```

`ln -sfn`, never `ln -sf` — with a pre-existing symlinked directory, `-f` alone creates the
link *inside* the target instead of replacing it.

### 5. Ignore it, and prove it is ignored

```bash
for pat in 'ψ' 'ψ/'; do                       # rule 1: BOTH forms
  rg -qx "$pat" "$REPO/.gitignore" 2>/dev/null || echo "$pat" >> "$REPO/.gitignore"
done

# rule 2: a previously committed ψ stays tracked despite any ignore rule
if git -C "$REPO" ls-files --error-unmatch ψ >/dev/null 2>&1; then
  git -C "$REPO" rm --cached -r --quiet ψ
  echo "✓ untracked previously-committed ψ (history still contains it — rewrite separately if it leaked a path)"
fi

git -C "$REPO" check-ignore -v ψ || echo "✗ ψ is NOT ignored — do not commit"
git -C "$REPO" status --porcelain | rg -q '\317\210' && echo "✗ ψ still visible to git"
```

Verification is part of the step, not an optional follow-up. If `check-ignore` prints
nothing, the link is not safe and you must say so.

### 6. Record the caretaker

```bash
mkdir -p "$REPO/.claude"
printf 'repo: %s\nvault: %s\ndate: %s\n' "$CARETAKER_REPO" "$NS" "$(date +%F)" \
  > "$REPO/.claude/PSI_CARETAKER"
rg -qx '.claude/PSI_CARETAKER' "$REPO/.gitignore" 2>/dev/null \
  || echo '.claude/PSI_CARETAKER' >> "$REPO/.gitignore"
```

Machine-local metadata, ignored like the link itself.

## `heal`

For the silent-prune failure (rule 6) and for drift:

1. `PSI_CARETAKER` exists but `ψ` is missing → recreate the relative symlink.
2. `ψ` is a symlink but `readlink -f` does not resolve → report the dangling target; do not
   guess a replacement.
3. Ignore rules incomplete → add the missing form.
4. `ψ` tracked → `git rm --cached -r ψ`.

Report every repair as a line; print `✓ nothing to heal` when clean.

## `unlink`

Reverse the graft: copy the namespaced subtree back into a real `ψ`, replace the symlink,
and leave the caretaker's copy in place (never delete the vault side). Remove the ignore
lines only if the user asks — a code repo usually still wants ψ ignored.

## `doctor`

Audit ψ hygiene across many repos. For each repo report: ψ type, tracked count, whether a
`120000` blob is committed, which ignore forms exist, and a verdict.

```bash
for p in "${REPOS[@]}"; do        # explicit list — never a filesystem sweep
  [ -e "$p/ψ" ] || continue
  tracked=$(git -C "$p" ls-files ψ | wc -l | tr -d ' ')
  git -C "$p" ls-files -s ψ | rg -q '^120000' && v='⚠️  committed symlink' \
    || { rg -qx 'ψ' "$p/.gitignore" 2>/dev/null && v='✓ safe' \
       || { [ "$tracked" -gt 0 ] && v='⚠️  ψ committed' || v='⚠️  breaks if symlinked'; }; }
  printf '%-50s %s\n' "$p" "$v"
done
```

Never sweep from `/` or the ghq root wholesale — take an explicit repo list, or
`ghq list` filtered to the owners you were asked about.

## Rules

- Ask before the first destructive step; dry-run output is not consent.
- Copy, verify, then delete — never in one command.
- Both `ψ` and `ψ/` in `.gitignore`, every time.
- Relative symlink targets only.
- Never commit ψ or the symlink in a code repo; never un-track ψ in an oracle repo.
- A shared vault is shared: namespace writes, and say so when linking.
- Report what you verified (`readlink -f`, `check-ignore`), not what you intended.
