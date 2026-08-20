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
# cut -f1, NOT an awk positional field ref — see "Never use positional parameters"
# below. check-ignore -v separates source from pathname with a TAB, so field 1 is
# the matching rule.
RULE=$(git -C "$REPO" check-ignore -v ψ 2>/dev/null | cut -f1)
[ -n "$RULE" ] || RULE='NOT IGNORED ⚠️'

# ── kind + caretaker ────────────────────────────────────────────────────
[ "$TRACKED" -gt 0 ] && KIND='oracle repo (ψ is tracked — it IS the brain)' \
                     || KIND='code repo (ψ must stay ignored)'
# NOTE: no \K — this rg build rejects it, and the error would silently read as "none".
CARE=$(sed -n 's/^oracle: *//p' "$REPO/.claude/PSI_CARETAKER" 2>/dev/null)
[ -n "$CARE" ] || CARE='none recorded'

# ── render: no borders. two-space margin, aligned columns, grouped by blank
#    lines. identity block first, then the checks, then one FOCUS line.
#    Each check names the command that proved it — the report is its own audit.
#    NOTE: printf inline per row — no row()/fact() helpers, because a helper
#    would need positional parameters and the host rewrites those. See below.
F='  %-14s%s\n'          # identity line
R='  %-14s%-42s%-3s %s\n'  # check line

echo
printf "$F" repo "$(basename "$REPO")"
printf "$F" kind "$KIND"
printf "$F" ψ    "$PSI"
[ -n "$PSI2" ] && printf "$F" '' "$PSI2"
echo
printf "$R" tracked      "$TRACKED entries" "$([ "$TRACKED" -eq 0 ] && echo ✓ || echo ⚠)" 'git ls-files ψ'
printf "$R" symlink-blob "$BLOB"            "$([ "$BLOB" = no ] && echo ✓ || echo ⚠)"     'ls-files -s ψ → 120000'
printf "$R" bare-ψ       "$BARE"            "$([ "$BARE" = yes ] && echo ✓ || echo ⚠)"    'rg -qx ψ .gitignore'
printf "$R" 'ψ/'         "$SLASH"           "$([ "$SLASH" = yes ] && echo ✓ || echo ·)"   'rg -qx ψ/ .gitignore'
printf "$R" ignore-rule  "$RULE"            "$(case $RULE in *NOT*) echo ⚠;; *) echo ✓;; esac)" 'git check-ignore -v ψ'
printf "$R" caretaker    "$CARE"            "$([ "$CARE" = 'none recorded' ] && echo · || echo ✓)" '.claude/PSI_CARETAKER'
echo
```

Keep the two-space margin and the blank-line grouping — the whitespace is what makes it
readable without rules. Widen a column only if a value would otherwise wrap; never add
borders back.

### Never use positional parameters (dollar-digit) in this skill's shell

The host substitutes the invocation's positional arguments into the skill body before the
model ever sees it. Running `/psi link to neo but …` rewrote an `awk` program that
referenced field one into `awk '{print to}'`, and a four-parameter `printf` helper into
`printf … "to" "neo" "but" "when"` — silent corruption, no error.

So: no shell functions taking positional parameters, and no dollar-digit inside
`awk`/`sed` programs. Use `cut -f1`, a named variable, or a printf format string held in
a variable — all three are immune.

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

## `link` — a six-phase ritual

Run it **step by step**, not as one script. Announce each phase as you enter it, do that
phase's work, show the result, then continue. Two phases are hard **gates**: stop and wait
for a human answer. After the phases, run the checklist, then print the report.

```text
  Phase 1/6 · Survey            what ψ is now
  Phase 2/6 · Caretaker         ← GATE: the human names the oracle
  Phase 3/6 · Preview           ← GATE: the human approves the dry run
  Phase 4/6 · Absorb            copy + count both sides
  Phase 5/6 · Link              park → symlink → verify through it
  Phase 6/6 · Seal              ignore rules + caretaker record
```

Never run a later phase's commands while announcing an earlier one. A gate that is
"announced and then passed in the same breath" is not a gate.

### Phase 1/6 · Survey — refuse bad ground

Run `check` first and show it. Then stop, with the reason, when:

- the repo is itself an oracle (ψ tracked with real content),
- ψ already points at that same caretaker → say `already linked`, exit 0,
- there is no origin remote (the vault path cannot be derived).

### Phase 2/6 · Caretaker — GATE

Show `maw ls`, then **ask which oracle should take care of this repo's memory and wait for
the answer.** Resolve it with `maw locate`, and confirm the caretaker's `ψ/: present` plus
that it is not behind its remote. Never pick a name yourself, never carry one over from a
previous run.

### Phase 3/6 · Preview — GATE

Show the itemized dry run and the counts, then **wait for approval.** Dry-run output is not
consent. If the human says nothing, nothing happens.

### Phase 4/6 · Absorb — dry run first, always

Replacing a populated ψ with a symlink orphans everything inside it. Fetch the caretaker
first so a stale vault is not merged over newer content.

Every linked repo lives under **`ψ/family/<host>/<owner>/<repo>`**, always lowercased.
Below `family/` the path is the ghq tree exactly, so it reads the same in both places:

```text
/opt/Code/github.com/soul-brews-studio/arra-oracle-skills-cli             ← the code (ghq)
neo-oracle/ψ/family/github.com/soul-brews-studio/arra-oracle-skills-cli   ← its memory
             └ family ┘└─ host ──┘└─ owner ───────┘└─ repo ────────────┘
```

**`family/` keeps the oracle's kin clear of its own organs.** Without it an owner directory
lands beside `memory/`, `inbox/`, `teams/` — and an org literally named `teams` collides
with the oracle's own. One directory to list to see everything an oracle tends.

**The host is derived, never assumed.** `gitlab.com`, `codeberg.org`, or a self-hosted
`git.example.com` each get their own subtree, so two repos sharing an `owner/name` on
different hosts never collide.

Lowercase is not cosmetic either: `Soul-Brews-Studio` and `soul-brews-studio` are the same
repo, but on a case-sensitive volume they become two vaults, and the split is invisible
until memory goes missing.

```bash
git -C "$CARETAKER" fetch --quiet 2>/dev/null

# host/owner/repo from the origin remote, lowercased — never from the directory
# name, which may have been renamed locally. Handles https, ssh, scp-style,
# git://, an embedded user, a custom port, and gitlab subgroups.
URL=$(git -C "$REPO" remote get-url origin 2>/dev/null)
[ -n "$URL" ] || { echo "✗ no origin remote — cannot derive the vault path"; exit 1; }
SLUG=$(printf '%s' "$URL" | sed -E \
        -e 's#^(ssh|git\+ssh|https?|git)://##' \
        -e 's#^[^@/]+@##'      \
        -e 's#:[0-9]+/#/#'     \
        -e 's#:#/#'            \
        -e 's#\.git$##'        \
        -e 's#/+$##'           \
       | tr '[:upper:]' '[:lower:]')

NS="$CARETAKER/ψ/family/$SLUG"   # ψ/family/<host>/<owner>/<repo>, lowercase
rsync -a --dry-run --itemize-changes "$REPO/ψ/" "$NS/"
```

Verified against every remote shape:

| remote | slug |
|---|---|
| `https://github.com/Soul-Brews-Studio/arra-oracle-skills-cli` | `github.com/soul-brews-studio/arra-oracle-skills-cli` |
| `git@github.com:laris-co/Neo-Oracle.git` | `github.com/laris-co/neo-oracle` |
| `git@gitlab.com:MyGroup/sub/proj.git` | `gitlab.com/mygroup/sub/proj` |
| `ssh://git@git.example.com:2222/team/thing.git` | `git.example.com/team/thing` |
| `git://codeberg.org/Owner/Proj.git` | `codeberg.org/owner/proj` |

Print the itemized list and the file count, then **wait for approval**. Only then re-run
without `--dry-run`. Never `--delete`.

The absorb and the removal are never the same command, and never the same step. Step 3
sequences them: **copy → count both sides → park the original → link → verify through the
link**, with an automatic rollback if the last check fails.

### Phase 5/6 · Link — copy, verify, park, link, verify again

**Order is the safety.** The source is never removed; it is *parked* outside the repo and
only after the copy has been counted. If the link fails to resolve, roll back automatically.
Never `rm -rf` the vault — see "nothing deleted".

```bash
mkdir -p "$NS"

# 3a. copy for real (same command as the dry run, minus --dry-run)
rsync -a --exclude '.DS_Store' "$REPO/ψ/" "$NS/"

# 3b. VERIFY before anything moves. Counts must match exactly, or stop —
#     the source is still untouched at this point, so aborting costs nothing.
SRC_N=$(find "$REPO/ψ" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
DST_N=$(find "$NS"     -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
if [ "$SRC_N" -ne "$DST_N" ]; then
  echo "✗ ABORT — copied $DST_N of $SRC_N files. Source untouched; nothing removed."
  exit 1
fi
echo "✓ verified $DST_N/$SRC_N files copied"

# 3c. PARK the original outside the repo (never delete, never leave it in git's way)
PARK="${TMPDIR:-/tmp}/psi-replaced-$(echo "$SLUG" | tr / -)-$(date +%Y%m%d-%H%M%S)"
mv "$REPO/ψ" "$PARK"

# 3d. link, relative
REL=$(python3 -c 'import os,sys;print(os.path.relpath(sys.argv[1],sys.argv[2]))' "$NS" "$REPO")
ln -sfn "$REL" "$REPO/ψ"      # -n: do not descend into an existing symlink

# 3e. verify the link RESOLVES and the content is reachable THROUGH it.
#     Any failure restores the parked original and exits.
restore() { rm -f "$REPO/ψ"; mv "$PARK" "$REPO/ψ"; echo "↩ restored original ψ"; }
[ -e "$REPO/ψ/" ] || { echo "✗ link does not resolve"; restore; exit 1; }
THRU=$(find "$REPO/ψ/" -type f ! -name '.DS_Store' | wc -l | tr -d ' ')
[ "$THRU" -ge "$SRC_N" ] || { echo "✗ only $THRU/$SRC_N reachable through the link"; restore; exit 1; }

readlink -f "$REPO/ψ"
echo "✓ $THRU files reachable through the link"
echo "  original parked: $PARK   (delete it yourself once satisfied)"
```

`ln -sfn`, never `ln -sf` — with a pre-existing symlinked directory `-f` alone creates the
link *inside* the target instead of replacing it.

**Why park instead of delete:** at 3c the content exists in two places and has been counted
in both, so parking looks redundant — until 3d writes a link that silently resolves
somewhere unexpected. Parking makes 3e's rollback possible. Announce the park path; let the
human delete it. Nothing deleted.

### Phase 6/6 · Seal — ignore it, prove it, record the caretaker

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

#### Record the caretaker

```bash
mkdir -p "$REPO/.claude"
printf 'oracle: %s\nrepo: %s\nvault: %s\ndate: %s\n' \
  "$ORACLE_NAME" "$CARETAKER" "$NS" "$(date +%F)" > "$REPO/.claude/PSI_CARETAKER"
rg -qx '.claude/PSI_CARETAKER' "$REPO/.gitignore" 2>/dev/null \
  || echo '.claude/PSI_CARETAKER' >> "$REPO/.gitignore"
```

Machine-local, ignored like the link. `check` reads it to name the caretaker without asking
again.

### Checklist — run it, show it, and let it fail loudly

After phase 6, verify the outcome. Every line re-runs a real command; nothing is asserted
from memory of what the phases *intended* to do. Print it. Unlike the retro checklist in
`/rrr`, this one is **shown** — it is the evidence that a data move succeeded.

```bash
C='  %-2s %-34s%s\n'   # format in a variable — no helper, no positional params

# 1 counts match on both sides
SRC_OK=$([ "${SRC_N:-0}" -eq "$DST_N" ] && echo ✓ || echo ✗)
printf "$C" "$SRC_OK" "files copied"        "$DST_N/$SRC_N"
# 2 reachable THROUGH the link, not just present in the vault
printf "$C" "$([ "${THRU:-0}" -ge "${SRC_N:-0}" ] && echo ✓ || echo ✗)" "reachable through ψ" "$THRU"
# 3 the link resolves
printf "$C" "$([ -e "$REPO/ψ/" ] && echo ✓ || echo ✗)" "link resolves"     "$(readlink -f "$REPO/ψ")"
# 4 relative, not absolute
case "$(readlink "$REPO/ψ")" in /*) A=✗;; *) A=✓;; esac
printf "$C" "$A" "relative target"          "$(readlink "$REPO/ψ")"
# 5 lowercase, nested owner/repo
printf "$C" "$([ "$SLUG" = "$(echo "$SLUG" | tr '[:upper:]' '[:lower:]')" ] && echo ✓ || echo ✗)" "vault path lowercase" "ψ/$SLUG"
# 6 git cannot see it
printf "$C" "$(git -C "$REPO" check-ignore -q ψ && echo ✓ || echo ✗)" "ignored by git" "$(git -C "$REPO" check-ignore -v ψ | cut -f1)"
# 7 the link itself is not committed
printf "$C" "$(git -C "$REPO" ls-files -s ψ | rg -q '^120000' && echo ✗ || echo ✓)" "symlink not committed" "$(git -C "$REPO" ls-files ψ | wc -l | tr -d ' ') tracked"
# 8 the original still exists somewhere
printf "$C" "$([ -d "$PARK" ] && echo ✓ || echo ✗)" "original parked"      "$PARK"
```

Any `✗` means **stop and say so** — do not print a success report over a failed checklist.
Items 2 and 8 are the ones that matter most: 2 proves the brain is actually reachable, 8
proves nothing was destroyed.

### Report

Close with a short report in the same borderless style as `check`. State what moved, where
it went, and what the human still owns.

```text
  ψ linked · arra-oracle-skills-cli → neo

  moved         17 files → neo-oracle/ψ/family/github.com/soul-brews-studio/arra-oracle-skills-cli
  symlink       ../../laris-co/neo-oracle/ψ/family/github.com/soul-brews-studio/arra-oracle-skills-cli
  ignored       .gitignore:9:ψ  (bare rule — ψ/ no longer matches a symlink)
  caretaker     neo
  parked        /var/.../psi-replaced-…-20260820-181051

  yours to do   delete the parked copy once satisfied
                commit the .gitignore change
```

Report only what the checklist verified. If an item failed, the report says what failed and
what state the repo is in — never a clean summary over a broken outcome.

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
- **Nothing deleted.** Never `rm -rf` a vault. Copy → count both sides → park the original
  outside the repo → link → verify through the link, rolling back on any failure. The human
  deletes the parked copy, not the skill.
- Both `ψ` and `ψ/` in `.gitignore`, every time — a trailing slash matches directories
  only, so a `ψ/`-only rule stops matching the moment ψ becomes a symlink.
- Relative symlink targets only — machines disagree on the ghq root.
- Never commit ψ or the symlink in a code repo; never un-track ψ in an oracle repo.
- A shared vault is shared: give each repo its own subtree, and say so when linking.
- Report what you verified (`readlink -f`, `check-ignore`), not what you intended.
