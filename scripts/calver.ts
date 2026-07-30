#!/usr/bin/env bun
// CalVer bump for arra-oracle-skills-cli
//
// Scheme: v{yy}.{m}.{d}[-(alpha|beta).{HMM}]
// Spec:   https://github.com/Soul-Brews-Studio/mawjs-oracle/blob/main/%CF%88/inbox/2026-04-18_proposal-calver-skills-cli.md
// Lineage:
//   Original birth: Soul-Brews-Studio/arra-oracle-skills-cli PR #262 (2026-04-18, hour-based scheme)
//   Evolved in: Soul-Brews-Studio/maw-js — HMM scheme (#766), --beta channel (#783), tag-walk + package.json (#786)
//   Re-imported here: PR #284 (catching the birthplace up to the evolved canonical)
// Umbrella: #526 (maw-js), #284 (arra-oracle-skills-cli)
// HMM scheme: alpha/beta suffix is the integer `H*100 + M` rendered as a
// decimal string (no leading zeros). Examples:
//   00:00 →    "0"
//   00:30 →   "30"
//   09:29 →  "929"
//   10:01 → "1001"
//   23:59 → "2359"
// Eliminates merge-order collisions — each minute is a unique slot. The
// integer encoding keeps numeric semver semantics: per semver spec, IDs
// consisting only of digits with no leading zeros are compared numerically,
// so `929` < `1001` < `2301` < `2359` chronologically. Timezone comes from
// the shell — set TZ=Asia/Bangkok in CI to match the project's release
// cadence.
//
// Cutover note: the legacy monotonic counter produced low integers
// (alpha.0 through alpha.~50). Today's wall-clock HMM at any post-midnight
// time is strictly greater (`30` > legacy `48` is false, but `100` > `48`
// is true; in practice merge-time HMM values are always large enough that
// no downgrade occurs). The `--check` path can be used to verify before
// merge.
//
// Usage:
//   bun scripts/calver.ts                  → 26.4.18-alpha.{HMM}
//   bun scripts/calver.ts --beta           → 26.4.18-beta.{HMM}
//   bun scripts/calver.ts --stable         → 26.4.18
//   bun scripts/calver.ts --check          → dry-run (no writes)

import { $ } from "bun";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

// Anchor to THIS script's own location, not the caller's cwd — `bun scripts/calver.ts`
// invoked from a different repo/directory must still read/write/git-tag-walk
// arra-oracle-skills-cli's own package.json and git history, never the caller's.
const REPO_ROOT = join(import.meta.dir, "..");

export type Channel = "alpha" | "beta";
type Args = { stable: boolean; channel?: Channel; check: boolean; now?: Date };

function parseArgs(argv: string[]): Args {
  const args: Args = { stable: false, channel: "alpha", check: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--stable") args.stable = true;
    else if (a === "--beta") args.channel = "beta";
    else if (a === "--check" || a === "--dry-run") args.check = true;
    else if (a === "--hour") {
      console.error("--hour deprecated as of #766; CalVer now uses tag-walk monotonic counter");
      process.exit(2);
    }
    else if (a === "-h" || a === "--help") {
      console.log(HELP);
      process.exit(0);
    } else {
      console.error(`unknown arg: ${a}`);
      console.error(HELP);
      process.exit(2);
    }
  }
  if (args.stable && args.channel === "beta") {
    console.error("--stable and --beta are mutually exclusive");
    process.exit(2);
  }
  return args;
}

const HELP = `Usage: bun scripts/calver.ts [options]

Compute next CalVer version and bump package.json.

Scheme: v{yy}.{m}.{d}[-(alpha|beta).{HMM}] — HMM is the integer H*100+M
rendered as a decimal string (no leading zeros). Examples: 09:29 → 929,
10:01 → 1001, 23:59 → 2359. Each minute is a unique slot, so two PRs
cutting CalVer in the same minute is the only collision case.
Alpha and beta share the same date base; channel disambiguates.

Options:
  --stable         Cut stable (no alpha/beta suffix)
  --beta           Cut beta instead of alpha
  --check          Dry-run: print target, don't modify files
  -h, --help       Show help

Examples:
  bun scripts/calver.ts                  next alpha → 26.4.18-alpha.{HMM}
  bun scripts/calver.ts --beta           next beta  → 26.4.18-beta.{HMM}
  bun scripts/calver.ts --stable         stable cut → 26.4.18
  bun scripts/calver.ts --check          print only, no write`;

export function dateBase(now: Date): string {
  const yy = now.getFullYear() % 100;
  const m = now.getMonth() + 1;
  const d = now.getDate();
  return `${yy}.${m}.${d}`;
}

/**
 * #819: extract the CalVer base (YY.M.D) from a version string. Accepts
 * `v26.4.29`, `26.4.29`, `v26.4.29-alpha.5`, `26.4.29-alpha.5`, etc.
 * Returns null if the string does not look like a CalVer base — caller can
 * then fall back to today's date. Mirrors maxNFromPackageJson's tolerant
 * accept-with-or-without-leading-v parsing.
 */
export function extractBaseFromVersion(version: string): string | null {
  if (!version) return null;
  const stripped = version.startsWith("v") ? version.slice(1) : version;
  // Match leading YY.M.D — terminated by `-`, `+`, end of string, or a dot
  // that is NOT part of the base (i.e. caller passed a 4-segment thing).
  const m = stripped.match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
  if (!m) return null;
  const [, yy, mo, da] = m;
  return `${yy}.${mo}.${da}`;
}

/**
 * #819: lexicographic-safe compare of two CalVer bases by integer segment.
 * Returns negative if a < b, 0 if equal, positive if a > b. Accepts only
 * `YY.M.D` triples — anything else throws (caller validates upstream).
 */
export function compareBases(a: string, b: string): number {
  const pa = a.split(".").map((x) => parseInt(x, 10));
  const pb = b.split(".").map((x) => parseInt(x, 10));
  if (pa.length !== 3 || pb.length !== 3) {
    throw new Error(`compareBases expects YY.M.D, got "${a}" vs "${b}"`);
  }
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

const DAYS_IN_MONTH = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isValidCalendarDate(base: string): boolean {
  const parts = base.split(".").map(x => parseInt(x, 10));
  if (parts.length !== 3) return false;
  const [, m, d] = parts;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > DAYS_IN_MONTH[m]) return false;
  return true;
}

/**
 * #819: pick the effective base for the next bump — the later of today's
 * clock-derived base and the package.json-derived base. This prevents the
 * post-stable-cut downgrade where package.json carries `YY.M.(D+1)` but the
 * clock still reads `YY.M.D` (tomorrow's stable already cut, today's clock
 * still ticking). Without this, the script targets `YY.M.D-alpha.0` — a
 * downgrade against `YY.M.(D+1)-alpha.N`.
 *
 * #1015 ghost-date guard: if the package.json base has a day that doesn't
 * exist in the calendar (e.g. April 53), fall back to today — the base is
 * corrupted. main() auto-fixes package.json before reaching here, but
 * direct callers get a safe fallback instead of a crash.
 */
export function effectiveBase(todayBase: string, packageVersion: string): string {
  const pkgBase = extractBaseFromVersion(packageVersion);
  if (!pkgBase) return todayBase;
  if (!isValidCalendarDate(pkgBase)) return todayBase;
  return compareBases(pkgBase, todayBase) > 0 ? pkgBase : todayBase;
}

/**
 * Walk git tags matching `v{base}-{channel}.*` and return the max N found,
 * or -1 if no matching tags exist for this date+channel yet.
 *
 * Backwards-compatible alias `maxAlphaFromTags(base, tags)` defaults to alpha.
 */
export function maxNFromTags(base: string, channel: Channel, tags: string[]): number {
  const prefix = `v${base}-${channel}.`;
  let max = -1;
  for (const tag of tags) {
    if (!tag.startsWith(prefix)) continue;
    const rest = tag.slice(prefix.length);
    // Option A: pure integer N (no further dots). Reject e.g. "12.0".
    if (!/^\d+$/.test(rest)) continue;
    const n = parseInt(rest, 10);
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max;
}

/**
 * Back-compat alias: alpha-only tag walk.
 */
export function maxAlphaFromTags(base: string, tags: string[]): number {
  return maxNFromTags(base, "alpha", tags);
}

/**
 * #784: walk package.json.version as an additional source-of-truth for the
 * monotonic counter. Post-#767, alpha releases merge to the `alpha` branch,
 * but `calver-release.yml` only fires on push to `main` — so no git tags get
 * created for in-flight alphas. Without this, tag-walk returns -1 and we
 * regress to alpha.0 on every alpha-branch run.
 *
 * Parses `vYY.M.D-{channel}.{N}` (with or without leading "v") and returns N
 * only if base+channel match today's. Rejects non-integer suffixes and
 * empty/missing strings (returns -1).
 */
export function maxNFromPackageJson(
  base: string,
  channel: Channel,
  packageVersion: string,
): number {
  if (!packageVersion) return -1;
  // Accept either `vYY.M.D-channel.N` or `YY.M.D-channel.N`.
  const stripped = packageVersion.startsWith("v") ? packageVersion.slice(1) : packageVersion;
  const prefix = `${base}-${channel}.`;
  if (!stripped.startsWith(prefix)) return -1;
  const rest = stripped.slice(prefix.length);
  if (!/^\d+$/.test(rest)) return -1;
  const n = parseInt(rest, 10);
  return Number.isInteger(n) ? n : -1;
}

async function listChannelTags(base: string, channel: Channel): Promise<string[]> {
  const res = await $`git tag --list ${`v${base}-${channel}.*`}`.cwd(REPO_ROOT).nothrow().quiet();
  if (res.exitCode !== 0) return [];
  return res.stdout.toString().split("\n").map(s => s.trim()).filter(Boolean);
}

/**
 * HMM stamp — integer `H*100 + M` rendered as a decimal string (no leading
 * zeros), used as the numeric pre-release identifier for alpha/beta cuts.
 * Examples: 00:00 → "0", 00:30 → "30", 09:29 → "929", 10:01 → "1001",
 * 23:59 → "2359". Numeric semver semantics ensure chronological order.
 * Timezone is implicit (Date's local TZ); CI sets TZ=Asia/Bangkok.
 */
export function hhmmStamp(now: Date): string {
  return String(now.getHours() * 100 + now.getMinutes());
}

export function computeVersion(args: Args, tags: string[] = [], packageVersion: string = ""): string {
  const now = args.now ?? new Date();
  const todayBase = dateBase(now);
  // #819: if package.json is future-dated (e.g. tomorrow's stable just cut),
  // bump against that base — never downgrade to today's date.
  const base = args.stable ? todayBase : effectiveBase(todayBase, packageVersion);
  if (args.stable) return base;
  const channel = args.channel ?? "alpha";
  // HHMM scheme: pre-release ID is the local-time hour+minute. Naturally
  // unique-per-minute, no tag-walk + package-walk reconciliation needed.
  // tags + packageVersion params kept for back-compat with callers/tests.
  void tags; void packageVersion;
  const stamp = hhmmStamp(now);
  return `${base}-${channel}.${stamp}`;
}

async function tagExists(version: string): Promise<boolean> {
  const res = await $`git rev-parse --verify --quiet ${`v${version}`}`.cwd(REPO_ROOT).nothrow().quiet();
  return res.exitCode === 0;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const now = args.now ?? new Date();
  const todayBase = dateBase(now);

  // #784: read package.json once up front so its version participates in the
  // source-of-truth set for the monotonic counter (see computeVersion).
  const pkgPath = join(REPO_ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));

  // #1015: auto-fix ghost dates in package.json. A ghost (e.g. April 53)
  // is a corrupted CalVer base from legacy monotonic stable bumps. Instead
  // of erroring, reset to today's real date and continue.
  const pkgBase = extractBaseFromVersion(pkg.version ?? "");
  if (pkgBase && !isValidCalendarDate(pkgBase)) {
    const [, mo, da] = pkgBase.split(".").map(Number);
    const MONTH_NAMES = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const DAYS = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const maxDay = mo >= 1 && mo <= 12 ? DAYS[mo] : "?";
    console.error(`\n⚠ ghost date in package.json: ${pkg.version}`);
    console.error(`  day ${da} doesn't exist in ${MONTH_NAMES[mo] || `month ${mo}`} (max: ${maxDay})`);
    console.error(`\n  CalVer scheme: v{YY}.{M}.{D}[-{channel}.{HMM}]`);
    console.error(`    YY   = year (${now.getFullYear() % 100})`);
    console.error(`    M    = month 1-12 (${now.getMonth() + 1} = ${MONTH_NAMES[now.getMonth() + 1]})`);
    console.error(`    D    = day of month 1-${DAYS[now.getMonth() + 1]} (today: ${now.getDate()})`);
    console.error(`    HMM  = hour*100 + minute (wall clock)`);
    console.error(`\n  auto-fix: resetting base to ${todayBase}\n`);
    pkg.version = todayBase;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  }

  // #819: choose the effective base before fetching tags so we list tags for
  // the correct date when package.json is future-dated.
  const base = args.stable ? todayBase : effectiveBase(todayBase, pkg.version ?? "");

  const channelForTags: Channel = args.channel ?? "alpha";
  const tags = args.stable ? [] : await listChannelTags(base, channelForTags);
  const version = computeVersion(args, tags, pkg.version ?? "");
  const channel = args.stable ? "stable" : channelForTags;

  console.log(`Target: v${version}  [${channel}]`);

  if (args.check) {
    console.log("(check mode — no changes written)");
    return;
  }

  if (await tagExists(version)) {
    // Should never happen for alpha (we picked max+1) but stable can collide.
    console.error(`\n❌ tag v${version} already exists`);
    if (args.stable) {
      console.error(`   → stable for today already cut; nothing to do`);
    } else {
      console.error(`   → race detected: another tag was created between scan and bump`);
    }
    process.exit(1);
  }

  const old = pkg.version;
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`✓ package.json: ${old} → ${version}`);

  console.log(`
Next:
  git add package.json && git commit -m "bump: v${version}" && git push origin main
  → calver-release.yml creates v${version} tag + GitHub release (+ builds dist/maw)
  → dist/maw attached to release`);
}

if (import.meta.main) main();
