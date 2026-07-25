---
name: release-beta
description: "Cut a beta pre-release — bump CalVer with --beta, PR to beta branch, CI auto-tags + publishes to npm @beta. Use when user says 'release beta', 'cut beta', '/release-beta', or wants to publish a beta version for pre-release testing."
argument-hint: ""
secret: true
metadata:
  internal: true
---

> ## ⚠️ Retired — alpha-only since 2026-07-25
>
> The fleet ships from `alpha` and nowhere else: no `alpha → beta`, no
> `beta → main`, no stable versions. `alpha` is the repo's default branch, the
> plugin marketplace clones it, every documented install reads `#alpha`, and
> `calver-release.yml` now only triggers on `alpha` — so the pipeline this skill
> describes has no runway left. See CLAUDE.md → Branch Strategy.
>
> Kept rather than deleted (Nothing is Deleted) in case a beta channel is ever
> wanted again; if so, re-check every command here against the current maw/CI
> before trusting it.


# /release-beta

Cut a beta pre-release for the current repo.

Beta sits between alpha (bleeding edge) and main (stable):
`alpha` → `beta` → `main`

## Assumptions

- Repo has `scripts/calver.ts` that supports `--beta` + `--check`
- Repo has a `beta` branch on `origin`
- `calver-release.yml` auto-tags + publishes when a version-bump commit lands on `beta`
- Current branch is NOT `main`, `alpha`, or `beta`

## Step 0: Detect repo + verify state

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)"
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "❌ Not in a git repo"; exit 1; }
BRANCH=$(git -C "$REPO_ROOT" branch --show-current)
echo "📁 $REPO_ROOT"
echo "🌿 $BRANCH"
```

Hard checks:

```bash
[ "$BRANCH" != "main" ] || { echo "❌ On main"; exit 1; }
[ "$BRANCH" != "alpha" ] || { echo "❌ On alpha"; exit 1; }
[ "$BRANCH" != "beta" ] || { echo "❌ On beta"; exit 1; }
[ -z "$(git -C "$REPO_ROOT" status --porcelain)" ] || { echo "❌ Working tree dirty"; exit 1; }
git -C "$REPO_ROOT" fetch origin beta 2>/dev/null
```

## Step 1: Locate calver script

```bash
CALVER="$REPO_ROOT/scripts/calver.ts"
[ -f "$CALVER" ] || { echo "❌ No scripts/calver.ts"; exit 1; }
```

## Step 2: Compute target

```bash
TARGET=$(TZ=Asia/Bangkok bun "$CALVER" --beta --check 2>&1 | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+-beta\.[0-9]+' | head -1)
```

## Step 3: Confirm gate

Show full plan. Wait for user `y`/`yes`. Anything else → abort.

```
## Release plan

  Repo:    [REPO_ROOT]
  Branch:  [BRANCH]
  Target:  [TARGET]
  PR base: beta

What will happen on confirm:
  1. bun calver.ts --beta          # writes [TARGET] to package.json
  2. git add package.json
  3. git commit -m "bump: [TARGET]"
  4. git push -u origin [BRANCH]
  5. gh pr create --base beta

Proceed? [y/N]
```

## Step 4: Execute

```bash
TZ=Asia/Bangkok bun "$CALVER" --beta
git -C "$REPO_ROOT" add package.json
git -C "$REPO_ROOT" commit -m "bump: $TARGET"
git -C "$REPO_ROOT" push -u origin "$BRANCH"
gh pr create --base beta --title "release: $TARGET" --body "Cuts $TARGET on merge via calver-release.yml."
```

## Step 5: Output

Print PR URL. Do NOT auto-merge.

```
✅ PR opened: [URL]
📦 On merge to beta → calver-release.yml cuts [TARGET]
🔍 Install: bun add arra-oracle-skills@beta
```

## Promotion flow

```
alpha (bleeding edge) → beta (pre-release testing) → main (stable)

/release-alpha   → PR to alpha → npm @alpha
/release-beta    → PR to beta  → npm @beta
alpha → main PR  → npm @latest (stable)
```

Beta is for features that passed alpha soak and need wider testing before stable.
