---
name: go
description: Manage Oracle skills — list, install, remove, find, switch profiles, update. Use when user says "go", "install skill", "remove skill", "find skill", "switch profile", "go list", "go update", "go install", "go find". Single entry point for all skill management.
argument-hint: "[list] | <standard|full|lab|cleanup|update> | install|remove|find <skill...>"
disable-model-invocation: true
---

# /go

> Switch gear. Single source of truth.

## Usage

```
/go                     # all skills — profile tier + installed status
/go list                # same as /go (no args)
/go minimal             # newcomer essentials (7 skills, default)
/go standard            # daily driver (13 skills)
/go full                # all stable (excludes lab-only experiments)
/go lab                 # everything including experimental
/go cleanup             # remove ALL skills → fetch latest → fresh install
/go update              # check for new version + upgrade in-place
/go install team-agents # cherry-pick install specific skills
/go remove watch        # uninstall specific skills
/go find feel           # search all available skills by name
```

> ⚠ NEW (#285): `/go <profile>` now ALIGNS your installed skills to the target profile.
> arra-managed skills NOT in the target profile will be **removed**.
> External / non-arra skills are never touched.
> A pre-removal diff is shown before any deletion occurs.

---

## CLI Detection

Before running any command, detect the CLI path. It may not be in `$PATH` on all machines.

Two variables, because reading and writing have different safety requirements.

```bash
# $ARRA — READ-ONLY commands (profiles, list, --version). The local binary is fine
# here: it is fast, and a slightly stale profile listing is harmless.
if command -v arra-oracle-skills &>/dev/null; then
  ARRA="arra-oracle-skills"
elif [ -x "$HOME/.bun/bin/arra-oracle-skills" ]; then
  ARRA="$HOME/.bun/bin/arra-oracle-skills"
else
  ARRA="$HOME/.bun/bin/bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha"
fi

# $ARRA_INSTALL — anything that WRITES skills to disk. Always from GitHub.
ARRA_INSTALL="$HOME/.bun/bin/bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha"
```

**Why they differ.** The installed binary carries its own frozen copy of every skill — the
set as of the day you installed it. Installing through it therefore writes *those* skills
over whatever you have now. Once the binary is older than your skills (normal after a few
weeks) every "install" is really a downgrade; a `26.5.15` binary was seen overwriting
`26.7.25` skills. Reading through it costs you nothing, so keep the fast path for reads and
take the network hit only when writing.

Use `$ARRA` for reads and `$ARRA_INSTALL` for installs/updates below.

---

## Execution

Parse the user's `/go` arguments and run the matching `$ARRA` command.

### `/go` or `/go list` — show all skills with profile + installed status + type

Write this script to `/tmp/go-list.sh` and run it with `bash /tmp/go-list.sh`. The script auto-discovers profile membership from the CLI — zero hardcoded skill names.

```bash
#!/bin/bash
SKILLS_DIR="$HOME/.claude/skills"
ARRA="$HOME/.bun/bin/arra-oracle-skills"
VERSION=$($ARRA --version 2>/dev/null || echo "?")

# Auto-get skill lists from CLI (no hardcoding)
get_profile_skills() {
  $ARRA profiles "$1" 2>/dev/null | grep "Skills:" | sed 's/.*Skills: //' | tr ',' '\n' | sed 's/^ *//' | tr '\n' ' '
}

STANDARD=$(get_profile_skills standard)
FULL=$(get_profile_skills full)
LAB_RAW=$(get_profile_skills lab)

# Lab-only = in lab but not in full
LAB=""
for s in $LAB_RAW; do
  echo " $FULL " | grep -q " $s " || LAB="$LAB $s"
done

# Minimal-only = in minimal but not in standard
MINIMAL=$(get_profile_skills minimal)
MINIMAL_ONLY=""
for s in $MINIMAL; do
  echo " $STANDARD " | grep -q " $s " || MINIMAL_ONLY="$MINIMAL_ONLY $s"
done

ALL_ARRA="$STANDARD $LAB $MINIMAL_ONLY"

detect_type() {
  local dir="$SKILLS_DIR/$1"
  [ -d "$dir" ] || return
  local has_code=false has_agent=false
  [ -d "$dir/scripts" ] && has_code=true
  grep -qlE 'Agent\(|subagent|TeamCreate|SendMessage' "$dir/SKILL.md" 2>/dev/null && has_agent=true
  if $has_code && $has_agent; then echo "[code+agent]"
  elif $has_code; then echo "[code]"
  elif $has_agent; then echo "[agent]"
  fi
}

get_desc() {
  local f="$SKILLS_DIR/$1/SKILL.md"
  [ -f "$f" ] || return
  awk '/^---$/{n++; next} n==1{print} n>=2{exit}' "$f" \
    | grep -E '^description:' | head -1 \
    | sed "s/description: *//; s/['\"]//g; s/\[core\].*G-SKLL | //" \
    | cut -c1-40
}

echo "Oracle Skills v$VERSION"
echo ""

NUM=0; INSTALLED=0
std_count=$(echo $STANDARD | wc -w | tr -d ' ')
lab_count=$(echo $LAB | wc -w | tr -d ' ')
min_count=$(echo $MINIMAL_ONLY | wc -w | tr -d ' ')

for tier in STANDARD LAB MINIMAL_ONLY; do
  case $tier in
    STANDARD) skills="$STANDARD"; label="standard"; count=$std_count ;;
    LAB) skills="$LAB"; label="lab"; count=$lab_count ;;
    MINIMAL_ONLY) skills="$MINIMAL_ONLY"; label="minimal-only"; count=$min_count ;;
  esac
  [ -z "$(echo $skills | tr -d ' ')" ] && continue
  printf " ─── %s (%s) " "$label" "$count"
  printf '─%.0s' $(seq 1 $((52 - ${#label}))); echo ""
  for name in $skills; do
    NUM=$((NUM+1))
    if [ -d "$SKILLS_DIR/$name" ]; then
      mark="✓"; INSTALLED=$((INSTALLED+1))
    else
      mark="✗"
    fi
    tag=$(detect_type "$name")
    desc=$(get_desc "$name")
    if [ -n "$desc" ]; then
      printf " %2d  %s  %-24s %-14s %s\n" "$NUM" "$mark" "$name" "$tag" "$desc"
    else
      printf " %2d  %s  %-24s %s\n" "$NUM" "$mark" "$name" "$tag"
    fi
  done
  echo ""
done

# External (non-arra) skills
EXT=0; EXT_NAMES=""
for dir in "$SKILLS_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir"); [ "$name" = ".trash" ] && continue
  is_arra=false
  for a in $ALL_ARRA; do [ "$name" = "$a" ] && is_arra=true && break; done
  [ "$is_arra" = "false" ] && { EXT=$((EXT+1)); EXT_NAMES="$EXT_NAMES $name"; }
done
if [ "$EXT" -gt 0 ]; then
  printf " ─── external (%d) " "$EXT"
  printf '─%.0s' $(seq 1 44); echo ""
  for name in $EXT_NAMES; do
    NUM=$((NUM+1)); INSTALLED=$((INSTALLED+1))
    tag=$(detect_type "$name")
    desc=$(get_desc "$name")
    if [ -n "$desc" ]; then
      printf " %2d  ✓  %-24s %-14s %s\n" "$NUM" "$name" "$tag" "$desc"
    else
      printf " %2d  ✓  %-24s %s\n" "$NUM" "$name" "$tag"
    fi
  done
  echo ""
fi

echo " $INSTALLED/$NUM installed  ·  zombies hidden (--zombies to show)"
echo " Cherry-pick:  arra-oracle-skills install -g -s <name> -y"
echo " Switch:       /go standard | /go lab"
```

**Auto-detected columns:**
- **Profile tier**: from `arra-oracle-skills profiles <name>` CLI output (zero hardcoded names)
- **Type tags**: runtime detection from installed SKILL.md — `[code]` (scripts/), `[agent]` (Agent patterns), `[code+agent]` (both)
- **Description**: parsed from installed SKILL.md frontmatter, truncated to 40 chars
- **Installed**: checks `$HOME/.claude/skills/<name>/` exists

**`--zombies` flag**: append zombie skills section. Only shown when explicitly requested.

### `/go <profile>` — switch profile

```bash
$ARRA_INSTALL install -g --profile <name> -y
```

Profiles: `minimal`, `standard`, `full`, `lab`

- `/go minimal` → `$ARRA_INSTALL install -g --profile minimal -y`
- `/go standard` → `$ARRA_INSTALL install -g --profile standard -y`
- `/go full` → `$ARRA_INSTALL install -g --profile full -y`
- `/go lab` → `$ARRA_INSTALL install -g --profile lab -y`

> Note: passing `--profile` explicitly triggers alignment — arra-managed skills NOT in the target
> are removed automatically. External skills are never touched.

### `/go cleanup` — fresh install (safe)

Crosscheck installed skills, remove stale arra-managed ones, fetch latest, reinstall. External skills are never touched.

**Step 1: Crosscheck** — list all installed skills, classify by `installer:` field in SKILL.md:

```bash
SKILLS_DIR="$HOME/.claude/skills"
LATEST=$(curl -s https://api.github.com/repos/Soul-Brews-Studio/arra-oracle-skills-cli/tags | grep -m1 '"name"' | cut -d'"' -f4)

echo "📋 Crosscheck (latest: $LATEST):"
ARRA_COUNT=0; EXT_COUNT=0; STALE_COUNT=0; CONFLICT_COUNT=0
for dir in "$SKILLS_DIR"/*/; do
  [ -d "$dir" ] || continue
  name=$(basename "$dir")
  version=$(grep -o 'v[0-9][0-9.]*' "$dir/SKILL.md" 2>/dev/null | head -1)
  installer=$(grep 'installer:' "$dir/SKILL.md" 2>/dev/null | head -1)

  if echo "$installer" | grep -q "arra-oracle"; then
    # Arra-managed skill — check version
    if [ "$version" = "$LATEST" ]; then
      echo "  ✓ arra: $name ($version)"
      ARRA_COUNT=$((ARRA_COUNT + 1))
    else
      echo "  ⚠️ stale: $name ($version → $LATEST)"
      STALE_COUNT=$((STALE_COUNT + 1))
    fi
  else
    echo "  ○ external: $name — will keep"
    EXT_COUNT=$((EXT_COUNT + 1))
  fi
done
echo ""
echo "  Summary: $ARRA_COUNT ok, $STALE_COUNT stale, $EXT_COUNT external"
```

**Step 2: Combined table** — crosscheck + usage in ONE table. Mine session JSONL files, then display everything together:

```bash
# Mine usage data from all sessions
TOTAL=0
for jsonl in ~/.claude/projects/*/*.jsonl; do
  [ -f "$jsonl" ] || continue
  TOTAL=$((TOTAL + 1))
done
```

Build the combined table. For each of the 29 arra skills, show: profile tier, installed status, version, status, and usage count from session mining.

```
📋 Skills Overview (29 arra + N external) — $TOTAL sessions mined:

  #  Skill                    Profile    Installed  Version   Status       Usage
  ── ──────────────────────── ────────── ────────── ───────── ──────────── ─────
  1  about-oracle             standard   ✓          v3.7.2    ✓ ok         2
  2  awaken                   standard   ✓          v3.7.2    ✓ ok         7
  4  contacts                 lab        ✓          v3.7.2    ✓ ok         5
  5  create-shortcut          lab        ✗          —         —            3
  6  dig                      standard   ✓          v3.7.2    ✓ ok         6
  7  dream                    lab        ✗          —         —            5
  8  feel                     lab        ✗          —         —            4
  9  forward                  standard   ✓          v3.7.2    ✓ ok         4
  10 go                       standard   ✓          v3.7.2    ✓ ok         3
  11 inbox                    lab        ✓          v3.7.2    ✓ ok         4
  12 incubate                 full       ✓          v3.7.2    ✓ ok         6
  13 learn                    standard   ✓          v3.7.2    ✓ ok         7
  14 oracle-family-scan       standard   ✓          v3.7.2    ✓ ok         4
  15 oracle-soul-sync-update  standard   ✓          v3.7.2    ✓ ok         3
  16 philosophy               full       ✗          —         —            4
  17 project                  full       ✗          —         —            6
  18 recap                    standard   ✓          v3.7.2    ✓ ok         7
  19 resonance                full       ✗          —         —            6
  20 rrr                      standard   ✓          v3.7.2    ✓ ok         7
  21 schedule                 lab        ✗          —         —            3
  22 standup                  standard   ✓          v3.7.2    ✓ ok         3
  23 talk-to                  standard   ✓          v3.7.2    ✓ ok         6
  24 team-agents              lab        ✗          —         —            1
  25 trace                    standard   ✓          v3.7.2    ✓ ok         5
  26 vault                    lab        ✗          —         —            5
  27 where-we-are             full       ✗          —         —            4
  28 who-are-you              full       ✓          v1.0.22   ⚠️ stale     6
  29 xray                     standard   ✓          v3.7.2    ✓ ok         4

  External (will keep):
  ○ drink, mawjs, mawjs-local, ultrathink

  💡 Skills with 0 usage might not need to be in your profile.
```

**How to get usage counts**: for each skill, count sessions containing `/$skill`:

```bash
for skill in about-oracle awaken contacts create-shortcut \
  dig dream feel forward go inbox incubate learn oracle-family-scan \
  oracle-soul-sync-update philosophy project recap resonance rrr \
  schedule standup talk-to team-agents trace vault where-we-are who-are-you xray; do
  count=$(grep -rl "/$skill" ~/.claude/projects/*/*.jsonl 2>/dev/null | wc -l)
  echo "$count $skill"
done | sort -rn
```

Status legend:
- `✓ ok` — arra-managed, current version
- `⚠️ stale` — arra-managed but outdated (needs update)
- `—` — not installed (available in higher profile)

**Step 3: Confirm** — now with full context:

```
Proceed with cleanup?
  - Conflicts will be replaced (backed up to .bak)
  - External skills kept untouched
  - Which profile? [standard / full / lab]
```

**Step 4: Clean + reinstall** (only after user confirms):

```bash
# Uninstall arra-managed via CLI
$ARRA uninstall -g -y

# For each conflict skill: rename to .bak (Nothing is Deleted)
for name in [conflicting skills]; do
  mv "$SKILLS_DIR/$name" "$SKILLS_DIR/${name}.bak.$(date +%s)"
done

# Fresh install at latest
LATEST=$(curl -s https://api.github.com/repos/Soul-Brews-Studio/arra-oracle-skills-cli/tags | grep -m1 '"name"' | cut -d'"' -f4)
~/.bun/bin/bunx --bun arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli#$LATEST install -g -y
```

**Output:**
```
🧹 Cleanup complete!
  Kept: [N] external skills
  Replaced: [N] conflicts (backed up to .bak)
  Installed: [N] fresh at $LATEST
  Restart required.
```

**When to use:**
- Stale skills from old versions mixed with new
- `[hidden]` flags persisting after unhide
- Version mismatch (some v3.6.1, some v3.7.0)
- Want a clean slate without losing personal skills

### `/go update` — pull the newest skills from GitHub

**Never update through the installed `$ARRA` binary.** It ships its own copy of the skills,
frozen at whatever version you installed it — so `$ARRA install` re-writes those frozen
skills over your current ones. When the binary is older than your skills (the normal case
after a few weeks), "update" quietly becomes a **downgrade**. Observed live: a
`26.5.15` binary overwriting `26.7.25` skills.

Always fetch from GitHub instead, so the newest skills come from the branch rather than
from whatever is cached on disk:

```bash
CURRENT=$($ARRA --version 2>/dev/null || echo "unknown")
LATEST=$(curl -s https://api.github.com/repos/Soul-Brews-Studio/arra-oracle-skills-cli/tags | grep -m1 '"name"' | cut -d'"' -f4)
echo "  CLI binary:   $CURRENT"
echo "  Latest tag:   $LATEST"

# The update itself — always from GitHub, never from $ARRA
$ARRA_INSTALL install -g -y
```

`#alpha` is the branch every cut lands on first; it is also the repo's default branch, so
this is the same code the plugin marketplace serves. Pin a tag (`#$LATEST`) instead when
you deliberately want a specific release.

**Already on the plugin?** If `claude plugin list` shows `oracle-skills@oracle-skills`, that
install updates itself — run `/plugin update oracle-skills@oracle-skills` and stop here.
Running both leaves two copies of every skill and it stops being obvious which one loads.

**Refreshing a specific set** — `-s` takes a LIST of names, so each name must arrive as its
own argument. In zsh (the default shell here) `$VAR` does **not** word-split, so a variable
holding names collapses into one bogus argument and the CLI silently installs only the
default profile:

```bash
NAMES="dig learn talk-to"
… install -g -y -s $NAMES      # zsh: ONE argument → wrong, installs default profile only
… install -g -y -s ${=NAMES}   # zsh: three arguments → correct
… install -g -y -s dig learn talk-to   # always correct, in any shell
```

Also note `-s` is **additive on top of the default profile** — it adds the named skills, it
does not restrict the install to them.

### MCP-server drift (#426)

Skills are only half of what goes stale. The `arra-oracle` MCP server is wired
separately in `~/.claude.json`, so it drifts on its own — a real case had it
pinned **161 commits / 30 days** behind while `/go update` still reported
everything synced, because the skills matched. Check both, or "synced" is a
half-truth.

```bash
python3 - <<'PY'
import json, os, re, subprocess
cfg = (json.load(open(os.path.expanduser('~/.claude.json'))).get('mcpServers') or {}).get('arra-oracle')
if not cfg:
    print('  arra-oracle MCP: not configured — nothing to check'); raise SystemExit

args = ' '.join(cfg.get('args') or [])

# 1. Local checkout — drift is commits behind upstream.
repo = next((a for a in (cfg.get('args') or []) if a.startswith('/')), None)
if repo:
    while repo != '/' and not os.path.isdir(os.path.join(repo, '.git')):
        repo = os.path.dirname(repo)
    if repo != '/':
        subprocess.run(['git', '-C', repo, 'fetch', '--quiet', 'origin'], check=False)
        behind = subprocess.run(['git', '-C', repo, 'rev-list', '--count', 'HEAD..@{u}'],
                                capture_output=True, text=True).stdout.strip() or '?'
        print(f'  arra-oracle MCP: local checkout {repo}')
        print(f'    {"up to date" if behind == "0" else behind + " commits behind upstream — git -C " + repo + " pull"}')
        raise SystemExit

# 2. Git-pinned bunx — drift is the pinned ref vs upstream HEAD.
m = re.search(r'github:([\w.-]+/[\w.-]+)#([\w.-]+)', args)
if m:
    slug, ref = m.groups()
    head = subprocess.run(['git', 'ls-remote', f'https://github.com/{slug}', 'HEAD'],
                          capture_output=True, text=True).stdout.split()
    print(f'  arra-oracle MCP: pinned {slug}#{ref}')
    print(f'    upstream HEAD {head[0][:12] if head else "unknown"} — repin if this is stale')
    raise SystemExit

# 3. Unpinned bunx — resolves from bun's cache, so version is whatever was cached.
print('  arra-oracle MCP: unpinned bunx — resolves from cache, version unknowable')
print('    pin a tag, or clear with: bun pm cache rm')
PY
```

Report drift alongside the skills version; never auto-edit `~/.claude.json` —
that file holds credentials for every MCP server the user has, and a wrong write
costs more than a stale server. Print the fix and let them run it.

- `/go update` → fetch latest from GitHub and reinstall in place
- Does NOT change your profile — pass `-p <name>` only if you also want to switch tiers
- Safe to run anytime — idempotent

### `/go install <skill...>` — cherry-pick specific skills

```bash
$ARRA_INSTALL install -g -s <skill...> -y
```

- `/go install team-agents` → `$ARRA_INSTALL install -g -s team-agents -y`
- `/go install dig hey xray` → `$ARRA_INSTALL install -g -s dig hey xray -y`

Works for ANY skill — standard, lab, or even zombie. Does not change your profile; just adds the named skills on top of whatever you have.

### `/go remove <skill...>` — uninstall specific skills

```bash
$ARRA uninstall -g -s <skill...> -y
```

- `/go remove watch` → `$ARRA uninstall -g -s watch -y`

### `/go find <query>` — search available skills

```bash
$ARRA profiles lab 2>/dev/null
```

Show all skills from the lab profile (the superset) and highlight any matching the query. If the user says `/go find feel`, search the profile output for "feel" and show where it lives (which tier, installed or not).

- `/go find feel` → show feel is in lab tier, not installed, description
- `/go find team` → show team-agents in standard tier, installed

---

## Available Profiles

| Profile | Count | Description |
|---------|-------|-------------|
| **minimal** | 7 | Newcomer essentials — lite lifecycle, trace, update (token-optimized) |
| **standard** | 13 | Daily driver — essential Oracle skills |
| **full** | ~30 | All stable skills (excludes lab-only + minimal-only lite variants) |
| **lab** | ~48 | Everything including experimental (excludes minimal-only lite variants) |

---

## Rules

1. **Always `-g`** — global (user-level) skills
2. **Always `-y`** — skip confirmation
3. **Restart required** — agent loads skills at session start
4. **`go` is always preserved** — it's in every profile
5. **Show result** — after running the command, tell the user what changed and remind them to restart

---

ARGUMENTS: $ARGUMENTS
