#!/usr/bin/env bun
/**
 * mutation-check.ts — do the staleness tests actually catch anything?
 *
 * WHY (2026-08-16): both oracles working on skills-staleness reported a green
 * suite as evidence. neo reported "10/10 pass", then mutation-tested its own
 * suite and found only 3 of 10 could ever go red. arra reported "6 pass" having
 * proven exactly one test discriminating — and found on checking that one test
 * ("silent when no manifest exists") killed no mutant at all, because removing
 * the guard it tested merely moved the failure into a try/catch.
 *
 * A green suite that cannot go red is not a passing suite, and a bare pass count
 * is a description, not evidence. This turns the claim into something checkable:
 * each mutant reintroduces a real bug that was actually shipped or nearly shipped,
 * and MUST be killed by at least one test.
 *
 * Usage:  bun scripts/mutation-check.ts        # exits non-zero if any survives
 */

import { readFileSync, writeFileSync, copyFileSync, unlinkSync, mkdtempSync, mkdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const TARGET = join(ROOT, 'skills', 'recap', 'skills-staleness.ts');
const SUITE = join(ROOT, '__tests__', 'skills-staleness.test.ts');
const BACKUP = `${TARGET}.mutation-backup`;

/**
 * `killedBy` names the ONE test that must fail for this mutant. Declaring it is
 * what makes a kill evidence rather than a coincidence (found by neo, 2026-08-16):
 *
 *  - A mutant that merely BREAKS the file fails the whole suite, and a harness
 *    that only reads the suite exit code scores that as "killed". It detected
 *    nothing. Verified against this very harness with a syntax-garbage control
 *    mutant: it reported "✓ killed". So a kill must be ATTRIBUTED, not inferred,
 *    and an unparseable mutant is BROKEN — an invalid experiment, never a kill.
 *  - Cross-kills are the tell. If a mutant takes down tests it has no business
 *    reaching, the suite is coupled and the mapping is not evidence of anything.
 */
type Mutant = { id: string; why: string; killedBy: string; apply: (s: string) => string };

const MUTANTS: Mutant[] = [
  {
    id: 'M1-predicate-drops-skillmd',
    killedBy: 'SKILL.md-less directory',
    why: 'FIX 4 (neo): reconciling against a wider population than the manifest is built from → permanent false positive no reinstall can clear',
    apply: (s) =>
      s.replace(
        `      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))\n      .filter((d) => existsSync(join(SKILLS_DIR, d.name, 'SKILL.md'))).length;`,
        `      .filter((d) => d.isDirectory() && !d.name.startsWith('.')).length;`,
      ),
  },
  {
    id: 'M7-prerelease-blind',
    killedBy: 'PRERELEASE is behind',
    why: 'FIX 1: prerelease dropped as NaN, so 26.7.27-alpha.947 compared AHEAD of its own release',
    apply: (s) =>
      s.replace(
        'const isBehind = (installed: string, source: string) => compareVersions(installed, source) < 0;',
        "const isBehind = (i: string, s2: string) => {\n  const n = (v: string) => v.split(/[.\\-+]/).map((p) => Number.parseInt(p, 10)).filter(Number.isFinite);\n  const a = n(i), b = n(s2);\n  for (let k = 0; k < Math.max(a.length, b.length); k++) { const x = a[k] ?? 0, y = b[k] ?? 0; if (x !== y) return x < y; }\n  return false;\n};",
      ),
  },
  {
    id: 'M8-behind-never-fires',
    killedBy: 'reports BEHIND',
    why: 'BEHIND detection is the whole point of the tool; it must fire when source is newer',
    apply: (s) => s.replace('const behind = srcVersion ? isBehind(m.version, srcVersion) : false;', 'const behind = false;'),
  },
  {
    id: 'M2-fail-open',
    killedBy: 'fails CLOSED',
    why: 'FIX 2: an unreadable shelf silently produced a confident all-clear — a fail-open verification gate',
    apply: (s) => s.replace('if (diskReadFailed) {', 'if (false) {'),
  },
  {
    id: 'M3-old-install-never-fires',
    killedBy: 'older than 30 days',
    why: 'a 30+ day old install must still be surfaced when no newer source is found',
    apply: (s) => s.replace('age !== null && age >= 30', 'false'),
  },
  {
    id: 'M4-reconciliation-always-off',
    killedBy: 'genuinely unrecorded',
    why: 'the predicate fix must not silence REAL drift along with the false positive',
    apply: (s) =>
      s.replace(
        'const manifestUntrustworthy = onDisk > 0 && recorded > 0 && unrecorded > 0;',
        'const manifestUntrustworthy = false;',
      ),
  },
  {
    id: 'M5-never-quiet',
    killedBy: 'silent on a healthy',
    why: 'a diagnostic that speaks on a healthy shelf gets ignored; silence is the contract',
    apply: (s) =>
      s.replace(
        'if (!behind && !oldInstall && !manifestUntrustworthy && !diskReadFailed && !VERBOSE) return;',
        '',
      ),
  },
  {
    id: 'M6-never-block-removed',
    killedBy: 'no manifest',
    why: 'orientation must not break on a diagnostic: no manifest / bad JSON must still exit 0 quietly',
    apply: (s) =>
      s
        .replace('main().catch(() => {});', 'main();')
        .replace('  if (!existsSync(MANIFEST)) return; // shelf not installed — nothing to say', '')
        .replace(
          `  let m: Manifest;\n  try {\n    m = JSON.parse(await Bun.file(MANIFEST).text());\n  } catch {\n    return; // unreadable manifest is not our problem to report here\n  }`,
          '  const m: Manifest = JSON.parse(await Bun.file(MANIFEST).text());',
        ),
  },
];

/** Which tests failed. Bun prints only failures, as `(fail) <suite> > <name>`. */
async function runSuite(): Promise<{ green: boolean; failed: string[]; total: number }> {
  const proc = Bun.spawn(['bun', 'test', SUITE], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  const [out, err] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  const text = `${out}\n${err}`;
  const failed = [...text.matchAll(/\(fail\)\s+(.+?)(?:\s+\[|\n|$)/g)].map((m) => m[1].trim());
  const total = Number(/Ran (\d+) tests?/.exec(text)?.[1] ?? 0);
  return { green: code === 0, failed, total };
}

/**
 * Is the mutant still ALIVE — does it do anything at all?  (neo, #17)
 *
 * A mutant that returns immediately parses, runs, exits 0 and emits nothing. It
 * defeats BROKEN (it parses), UNIVERSAL (it only kills the checks that assert on
 * PRESENCE), and MIS-ATTRIBUTED (the declared check does fail). It looked like a
 * clean kill in both our harnesses.
 *
 * The root cause is not a threshold: absence assertions ("stays quiet", "no output,
 * exit 0") are satisfied VACUOUSLY by a corpse. They cannot distinguish
 * correctly-silent from never-ran. Four of this suite's seven checks are
 * absence assertions.
 *
 * So before any check is trusted, demand a sign of life: on a healthy shelf with
 * --verbose the tool MUST say something. Every real mutant here does; a do-nothing
 * mutant cannot.
 */
async function isAlive(file: string): Promise<boolean> {
  const home = mkdtempSync(join(tmpdir(), 'arra-mut-live-'));
  try {
    const skills = join(home, '.claude', 'skills');
    mkdirSync(join(skills, 'probe-skill'), { recursive: true });
    writeFileSync(join(skills, 'probe-skill', 'SKILL.md'), '---\nname: probe\n---\n');
    writeFileSync(
      join(skills, '.arra-oracle-skills.json'),
      JSON.stringify({
        version: '0.0.1',
        installedAt: new Date().toISOString(),
        skills: ['probe-skill'],
        agent: 'claude-code',
      }),
    );
    const proc = Bun.spawn(['bun', file, '--verbose'], {
      env: { ...process.env, HOME: home },
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [out] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);
    await proc.exited;
    return out.trim().length > 0;
  } catch {
    return false;
  } finally {
    try {
      rmSync(home, { recursive: true, force: true });
    } catch {}
  }
}

/** Does the mutated file still parse? An unparseable mutant is a broken experiment. */
async function parses(file: string): Promise<boolean> {
  const proc = Bun.spawn(['bun', 'build', file, '--target=bun', '--outfile=/dev/null'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
  return (await proc.exited) === 0;
}

const original = readFileSync(TARGET, 'utf8');
copyFileSync(TARGET, BACKUP);

let killed = 0;
let baseTotal = 0;
const problems: string[] = [];

try {
  const base = await runSuite();
  baseTotal = base.total;
  if (!base.green) {
    console.error('✗ baseline suite is already failing — fix that before mutation testing');
    process.exit(1);
  }
  console.log('✓ baseline green\n');

  for (const m of MUTANTS) {
    const mutated = m.apply(original);

    // An un-appliable mutation silently weakens the check while still reporting a pass.
    if (mutated === original) {
      console.log(`⚠️  ${m.id}: INERT — source drifted, mutation no longer applies`);
      problems.push(`${m.id} inert`);
      continue;
    }

    writeFileSync(TARGET, mutated);
    const ok = await parses(TARGET);
    const alive = ok ? await isAlive(TARGET) : false;
    const res = ok && alive ? await runSuite() : null;
    writeFileSync(TARGET, original);

    // BROKEN, not killed: the file no longer compiles, so the suite fails for a
    // reason that has nothing to do with detection.
    if (!ok) {
      console.log(`⚠️  ${m.id}: BROKEN — mutant does not parse; proves nothing`);
      problems.push(`${m.id} broken`);
      continue;
    }

    // NUKED: it parses and exits, but does nothing. Absence checks pass vacuously
    // against a corpse, so any "kill" here is meaningless.
    if (!res) {
      console.log(`⚠️  ${m.id}: NUKED — mutant produces no output at all; a corpse`);
      console.log(`   absence assertions pass vacuously; this proves nothing`);
      problems.push(`${m.id} nuked`);
      continue;
    }

    if (res.green) {
      console.log(`✗ ${m.id}: SURVIVED — no test catches this`);
      console.log(`   ${m.why}`);
      problems.push(`${m.id} survived`);
      continue;
    }

    // A mutant that kills EVERY check discriminates nothing — it is
    // indistinguishable from a broken experiment, and attribution alone will not
    // catch it because the declared test is among the casualties. neo named the
    // tell ("a mutant killed by everything") after it hid a fake kill twice; this
    // enforces it. Verified with a control that parses cleanly, detects nothing,
    // and exits 1 from main() — previously scored "✓ killed", exit 0.
    if (baseTotal > 1 && res.failed.length >= baseTotal) {
      console.log(`✗ ${m.id}: UNIVERSAL — killed all ${baseTotal} checks; proves nothing`);
      console.log(`   a mutation that breaks everything discriminates nothing`);
      problems.push(`${m.id} universal`);
      continue;
    }

    // A kill must be ATTRIBUTED to the declared test, not inferred from red.
    const hit = res.failed.filter((f) => f.includes(m.killedBy));
    const strays = res.failed.filter((f) => !f.includes(m.killedBy));

    if (hit.length === 0) {
      console.log(`✗ ${m.id}: MIS-ATTRIBUTED — suite went red, but not via "${m.killedBy}"`);
      console.log(`   actually failed: ${res.failed.join(' | ') || '(none parsed)'}`);
      problems.push(`${m.id} mis-attributed`);
      continue;
    }

    console.log(`✓ ${m.id}: killed by "${m.killedBy}"`);
    if (strays.length) {
      // Not fatal, but it means the mapping is not clean evidence.
      console.log(`   ⓘ cross-kill: also failed ${strays.join(' | ')}`);
    }
    killed++;
  }
} finally {
  writeFileSync(TARGET, original);
  try {
    unlinkSync(BACKUP);
  } catch {}
}

console.log(
  `\n${killed}/${MUTANTS.length} mutants killed and correctly attributed` +
    (problems.length ? `  ·  ${problems.length} problem(s): ${problems.join(', ')}` : ''),
);

if (problems.length) {
  console.error('\nA green suite that cannot go red is not a passing suite.');
  process.exit(1);
}
