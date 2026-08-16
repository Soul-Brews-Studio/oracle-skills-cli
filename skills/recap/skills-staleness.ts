#!/usr/bin/env bun
// skills-staleness.ts — is your installed Oracle skill shelf behind the source?
//
// Originally written by neo (laris-co/neo-oracle) on 2026-08-16; adopted into the
// shelf so every oracle gets it, not just neo. Two corrections on adoption are
// marked [ADOPTED] below.
//
// WHY THIS EXISTS (2026-08-16): staleness discovery was circular — the only way to
// learn you were behind was to run an install, which required already knowing you
// needed one. Result: a /learn contamination bug was diagnosed in a shelf version
// that had been superseded for two months, and nobody noticed. The fork install
// model (files copied into ~/.claude/skills) means fixes never propagate on their
// own; a managed/subscribe route would, which is the real argument for offering one.
//
// The data was always on disk. Nothing read it. This reads it.
//
// DESIGN RULES (each earned the hard way):
//  - Never block. Any failure prints nothing and exits 0. Orientation must not break.
//  - No network by default. `git ls-remote` on session start is a latency tax.
//  - NEVER claim "up to date" from a source you haven't verified is current. A local
//    ghq clone can itself be stale — so report the clone's own fetch age alongside its
//    version, rather than presenting it as upstream truth.
//
// Usage:  bun skills-staleness.ts            # quiet unless something's off
//         bun skills-staleness.ts --verbose  # always print what it found

import { existsSync } from 'fs';
import { readdirSync } from 'fs';
import { join } from 'path';
import { $ } from 'bun';

const VERBOSE = process.argv.includes('--verbose');
const HOME = process.env.HOME ?? '';
const SKILLS_DIR = join(HOME, '.claude/skills');
const MANIFEST = join(SKILLS_DIR, '.arra-oracle-skills.json');
const SOURCE_REPO = 'Soul-Brews-Studio/arra-oracle-skills-cli';

type Manifest = { version?: string; installedAt?: string; skills?: string[]; agent?: string };

function daysSince(iso: string): number | null {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.floor((Date.now() - t) / 86_400_000) : null;
}

/**
 * [ADOPTED — fix 1] Prerelease-aware comparison. The original dropped the
 * prerelease tag as NaN, so `26.7.27-alpha.947` parsed to [26,7,27,947] and
 * compared as AHEAD of the release [26,7,27]. Everyone sitting on a prerelease
 * was told they were current the moment it shipped as a release.
 *
 * Mirrors compareVersions() in src/cli/installer.ts (#500), which is locked down
 * by tests — keep the two in step.
 */
function compareVersions(a: string, b: string): number {
  const split = (v: string) => {
    const [core, pre = ''] = v.split('-', 2);
    return {
      nums: core.split('.').map((n) => parseInt(n, 10) || 0),
      pre: pre ? pre.split('.').map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p)) : null,
    };
  };
  const [x, y] = [split(a), split(b)];
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  if (!x.pre && y.pre) return 1; // a release outranks a prerelease of the same core
  if (x.pre && !y.pre) return -1;
  if (!x.pre || !y.pre) return 0;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const [p, q] = [x.pre[i], y.pre[i]];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    if (typeof p === 'number' && typeof q === 'number') return p - q;
    return String(p) < String(q) ? -1 : 1;
  }
  return 0;
}

const isBehind = (installed: string, source: string) => compareVersions(installed, source) < 0;

async function main() {
  if (!existsSync(MANIFEST)) return; // shelf not installed — nothing to say

  let m: Manifest;
  try {
    m = JSON.parse(await Bun.file(MANIFEST).text());
  } catch {
    return; // unreadable manifest is not our problem to report here
  }
  if (!m.version) return;

  const age = m.installedAt ? daysSince(m.installedAt) : null;

  // Find a local source clone WITHOUT a network call.
  let ghqRoot = '';
  try {
    ghqRoot = (await $`ghq root`.quiet().text()).trim();
  } catch {
    /* ghq absent */
  }
  const srcDir = ghqRoot ? join(ghqRoot, 'github.com', SOURCE_REPO) : '';
  const hasSrc = srcDir && existsSync(join(srcDir, 'package.json'));

  let srcVersion = '';
  let fetchAgeDays: number | null = null;
  if (hasSrc) {
    try {
      srcVersion = JSON.parse(await Bun.file(join(srcDir, 'package.json')).text()).version ?? '';
    } catch {}
    // How stale is the CLONE itself? Never present an unfetched clone as upstream truth.
    try {
      const t =
        (await $`git -C ${srcDir} log -1 --format=%ct FETCH_HEAD`.quiet().text()).trim() ||
        (await $`git -C ${srcDir} log -1 --format=%ct`.quiet().text()).trim();
      const secs = Number.parseInt(t, 10);
      if (Number.isFinite(secs)) fetchAgeDays = Math.floor((Date.now() / 1000 - secs) / 86_400);
    } catch {}
  }

  const behind = srcVersion ? isBehind(m.version, srcVersion) : false;
  const oldInstall = age !== null && age >= 30;

  // ── MANIFEST-vs-DISK RECONCILIATION ────────────────────────────────────────
  // Don't trust the manifest on its own — count the disk and refuse to be reassured.
  //
  // Note isDirectory() deliberately does NOT follow symlinks: externally-linked
  // skills (e.g. ego-browser → ~/.local/share/ego) are not shelf-managed and must
  // not count as "unrecorded", or this fires on a healthy install.
  //
  // [ADOPTED — fix 3, found by neo] The predicate MUST match the one the installer
  // uses to build the manifest (src/cli/installer.ts:770-774), which additionally
  // requires a SKILL.md:
  //
  //     .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
  //     .filter((name) => existsSync(join(targetDir, name, 'SKILL.md')))
  //
  // Reconciling against a WIDER population than the manifest is built from makes
  // any SKILL.md-less directory permanently unrecorded: unrecorded > 0 forever,
  // MANIFEST UNRELIABLE forever, and no reinstall can ever clear it — while the
  // message tells you to reinstall. A sticky false positive on a healthy shelf is
  // the fastest way to make people stop reading the tool.
  let onDisk = 0;
  let diskReadFailed = false;
  try {
    onDisk = readdirSync(SKILLS_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .filter((d) => existsSync(join(SKILLS_DIR, d.name, 'SKILL.md'))).length;
  } catch {
    diskReadFailed = true; // [ADOPTED — fix 2] see below
  }
  const recorded = m.skills?.length ?? 0;
  const unrecorded = onDisk - recorded;
  const manifestUntrustworthy = onDisk > 0 && recorded > 0 && unrecorded > 0;

  // [neo, #25] Reconciliation ran in ONE DIRECTION ONLY. `unrecorded > 0` sees
  // disk exceeding the manifest; the opposite drift went entirely unreported,
  // because the subtraction simply goes negative and the guard is false.
  //
  // Measured before fixing: manifest recording 36 skills against a disk holding
  // 1 printed NOTHING in quiet mode and exit 0, and in --verbose cheerfully said
  // "36 skills recorded" while 35 were gone. A shelf that had lost 35 of 36
  // skills read as healthy, from a tool whose entire premise is reconciling two
  // sources against each other.
  //
  // This direction is the more urgent of the two: unrecorded skills are an
  // inventory gap, missing skills are LOST WORK.
  const missing = recorded - onDisk;
  const skillsMissing = recorded > 0 && !diskReadFailed && missing > 0;

  if (
    !behind &&
    !oldInstall &&
    !manifestUntrustworthy &&
    !skillsMissing &&
    !diskReadFailed &&
    !VERBOSE
  )
    return;

  console.log('\n## 🧩 SKILL SHELF');
  console.log(
    `installed: v${m.version}${age !== null ? `  (${age}d ago)` : ''}  ·  ${recorded} skills recorded`,
  );

  // [ADOPTED — fix 2] Fail closed, not open. If the disk read throws, the
  // reconciliation guard silently evaluates false and the tool reports a
  // confident "all clear" it cannot justify — the exact fail-open shape
  // /verification-gate-fail-closed exists to prevent. Say so instead.
  if (diskReadFailed) {
    console.log(`⚠️  Could not read ${SKILLS_DIR} — manifest could NOT be reconciled against disk.`);
    console.log(`   Treat everything below as UNVERIFIED.`);
  }

  if (skillsMissing) {
    console.log(`⚠️  SKILLS MISSING — manifest records ${recorded}, only ${onDisk} on disk.`);
    console.log(`   ${missing} skill(s) the manifest claims are NOT present. This is lost work,`);
    console.log(`   not an inventory gap — a shelf can silently lose skills to a failed install,`);
    console.log(`   an interrupted profile alignment, or manual deletion.`);
    console.log(`   Recover: reinstall from a current tree, then check the orphan trash dir.`);
  }

  if (manifestUntrustworthy) {
    console.log(`⚠️  MANIFEST UNRELIABLE — ${onDisk} skill dirs on disk, only ${recorded} recorded.`);
    console.log(`   ${unrecorded} skill(s) have NO version record; the v${m.version} stamp covers`);
    console.log(`   only the ${recorded} listed. Treat "not behind" below as unproven.`);
    // [ADOPTED — fix 1b] The original named installer.ts:704 as the root cause.
    // That was fixed on alpha by #458 (the manifest now derives from disk), so
    // naming it would send people to fix an already-fixed bug. The drift that
    // remains is real but its cause depends on which version installed last.
    console.log(`   Likely cause: a skill installed by an older CLI (pre-#458) or by hand.`);
    console.log(`   Fix: reinstall from a current tree so the manifest is rebuilt from disk.`);
  }

  if (behind) {
    console.log(`⚠️  BEHIND — local source says v${srcVersion}`);
    console.log(`   update: bunx --bun github:${SOURCE_REPO}#alpha install -g -y --agent claude-code`);
  } else if (srcVersion && VERBOSE) {
    console.log(`local source: v${srcVersion} (not behind)`);
  } else if (!hasSrc && VERBOSE) {
    console.log('local source clone not found — cannot compare (no network check by design)');
  }

  // Honesty about the comparison basis.
  if (srcVersion && fetchAgeDays !== null && fetchAgeDays >= 7) {
    console.log(`   ⓘ compared against a LOCAL clone last updated ${fetchAgeDays}d ago —`);
    console.log(`     it may itself be behind. \`git -C ${srcDir} fetch\` to be sure.`);
  }

  if (oldInstall && !behind) {
    console.log(`ⓘ install is ${age}d old; no newer local source found — worth a fetch.`);
  }
}

main().catch(() => {}); // never break the caller
