---
name: calver
description: Show or bump the project's CalVer version. Use when user says "calver", "bump version", "what version", or wants to check or set the skills version. For the full release flow (commit + push + PR) use /release-alpha or /release-stable instead — /calver alone never commits, pushes, or PRs.
hidden: true
metadata:
  internal: true
---

# /calver

Compute / bump the CalVer version for arra-oracle-skills-cli.

> ⚠️ **Pair with the right skill.** This skill is `--check` (read-only) or `--apply` (writes `package.json` and stops). It does NOT commit, push, or PR — that's deliberate so a bump can never accidentally cut a release.
>
> | Want to… | Use |
> |---|---|
> | See the next target version | `/calver` (default = `--check`) |
> | Just bump `package.json` and stop | `/calver --apply` |
> | Cut a soak release (alpha pre-release) | `/release-alpha` |
> | Cut a stable release on main | `/release-stable` |
> | Land a code fix without releasing | regular branch + PR — keep `package.json` version untouched |
>
> **Never** combine a `package.json` bump with a code fix in the same commit on this repo — `calver-release.yml` auto-tags on push to `main`, so a fix-PR with a bump = automatic stable release.

CalVer scheme: `v{yy}.{m}.{d}[-(alpha|beta).{HMM}]` — HMM is the wall-clock as decimal `H*100 + M` with no leading zero (e.g. 09:37 → `937`, 23:59 → `2359`). Each minute is a unique slot — no merge-order collisions. Alpha and beta are independent channels (#754 / PR #783). Walks git tags AND `package.json.version` for source-of-truth (#784 / PR #786). TZ fixed to Asia/Bangkok. HMM replaced monotonic counter (#766/#775) in #923.

Day-of-month `D` may exceed 31 — used as a stable counter once natural date is exhausted (#930). E.g. `v26.4.50` is the 50th stable cut in the period, not "April 50".

## Step 0: Locate arra-oracle-skills-cli

Always resolve repo via `ghq` so the skill works from any cwd:

```bash
ARRA=$(ghq list -p --exact Soul-Brews-Studio/arra-oracle-skills-cli 2>/dev/null | head -1)
if [ -z "$ARRA" ]; then
  echo "❌ arra-oracle-skills-cli not found via ghq. Run: ghq get github.com/Soul-Brews-Studio/arra-oracle-skills-cli"
  exit 1
fi
echo "🕐 $(date '+%H:%M %Z (%A %d %B %Y)')"
echo "📁 $ARRA"
```

## Modes

### Default — dry-run check (show next target)

```bash
TZ=Asia/Bangkok bun "$ARRA/scripts/calver.ts" --check
```

Shows the next target version (`max(tag-walk, package.json) + 1` for today's date+channel). No files modified.

### `--apply` — bump package.json

```bash
TZ=Asia/Bangkok bun "$ARRA/scripts/calver.ts"
```

Writes the next version to `package.json`. Caller then:

```bash
git -C "$ARRA" add package.json && git -C "$ARRA" commit -m "bump: v<version>"
```

Do NOT auto-commit — hand off to user so they can bundle with other changes.

### `--stable` — cut stable (no alpha/beta suffix)

```bash
TZ=Asia/Bangkok bun "$ARRA/scripts/calver.ts" --stable
```

### `--beta` — cut beta (parallel channel, independent counter)

```bash
TZ=Asia/Bangkok bun "$ARRA/scripts/calver.ts" --beta
```

`--stable` and `--beta` are mutually exclusive (script exits 2).

### `--hour N` — REMOVED

The `--hour` flag is deprecated as of #766 and will exit 2. CalVer now uses a monotonic counter walked from git tags + `package.json` — there is no hour-bucket to override.

### `--help` — print calver.ts help

```bash
TZ=Asia/Bangkok bun "$ARRA/scripts/calver.ts" --help
```

## After apply

**Stop. Hand off to the user.** Do NOT auto-commit, do NOT push, do NOT open a PR. The whole point of /calver being read-only-or-stop-after-write is so a bump can never accidentally turn into a release.

If the user wants to ship the bump, they invoke a release skill:

```
Next steps (user runs one of these — not /calver):
  /release-alpha    — soak channel, PR to alpha, calver-release.yml cuts pre-release on merge
  /release-stable   — stable channel (planned), PR to main, calver-release.yml cuts stable on merge
```

If the user is doing code-only work (no release), tell them to **revert** the package.json change before opening the PR. Bumping in a non-release branch is the exact failure mode /release-alpha was built to prevent.

## Notes

- The calver.ts script is authoritative. Do NOT hand-compute versions.
- Release workflow: `calver-release.yml` tags on push to main when package.json version differs from latest tag. Post-#767, alphas merge to `alpha` branch (no tags created until stable cut to main); the script handles this by walking package.json (#784 / PR #786).
- Spec: `ψ/inbox/2026-04-18_proposal-calver-skills-cli.md` (mawjs-oracle vault).
- Umbrella issue: #526 (maw-js — original); #284 (arra-oracle-skills-cli — this port).
- Related changes today (2026-04-28): #775 (monotonic counter), PR #783 (--beta channel for #754), PR #786 (package.json walk for #784).

---

ARGUMENTS: $ARGUMENTS
