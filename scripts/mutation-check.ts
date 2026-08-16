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

import { readFileSync, writeFileSync, copyFileSync, unlinkSync } from 'fs';
import { join } from 'path';

const ROOT = join(import.meta.dir, '..');
const TARGET = join(ROOT, 'skills', 'recap', 'skills-staleness.ts');
const SUITE = join(ROOT, '__tests__', 'skills-staleness.test.ts');
const BACKUP = `${TARGET}.mutation-backup`;

type Mutant = { id: string; why: string; apply: (s: string) => string };

const MUTANTS: Mutant[] = [
  {
    id: 'M1-predicate-drops-skillmd',
    why: 'FIX 4 (neo): reconciling against a wider population than the manifest is built from → permanent false positive no reinstall can clear',
    apply: (s) =>
      s.replace(
        `      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))\n      .filter((d) => existsSync(join(SKILLS_DIR, d.name, 'SKILL.md'))).length;`,
        `      .filter((d) => d.isDirectory() && !d.name.startsWith('.')).length;`,
      ),
  },
  {
    id: 'M2-fail-open',
    why: 'FIX 2: an unreadable shelf silently produced a confident all-clear — a fail-open verification gate',
    apply: (s) => s.replace('if (diskReadFailed) {', 'if (false) {'),
  },
  {
    id: 'M3-old-install-never-fires',
    why: 'a 30+ day old install must still be surfaced when no newer source is found',
    apply: (s) => s.replace('age !== null && age >= 30', 'false'),
  },
  {
    id: 'M4-reconciliation-always-off',
    why: 'the predicate fix must not silence REAL drift along with the false positive',
    apply: (s) =>
      s.replace(
        'const manifestUntrustworthy = onDisk > 0 && recorded > 0 && unrecorded > 0;',
        'const manifestUntrustworthy = false;',
      ),
  },
  {
    id: 'M5-never-quiet',
    why: 'a diagnostic that speaks on a healthy shelf gets ignored; silence is the contract',
    apply: (s) =>
      s.replace(
        'if (!behind && !oldInstall && !manifestUntrustworthy && !diskReadFailed && !VERBOSE) return;',
        '',
      ),
  },
  {
    id: 'M6-never-block-removed',
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

async function runSuite(): Promise<boolean> {
  const proc = Bun.spawn(['bun', 'test', SUITE], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  await new Response(proc.stdout).text();
  await new Response(proc.stderr).text();
  return (await proc.exited) === 0;
}

const original = readFileSync(TARGET, 'utf8');
copyFileSync(TARGET, BACKUP);

let survived = 0;
let inert = 0;

try {
  if (!(await runSuite())) {
    console.error('✗ baseline suite is already failing — fix that before mutation testing');
    process.exit(1);
  }
  console.log('✓ baseline green\n');

  for (const m of MUTANTS) {
    const mutated = m.apply(original);
    if (mutated === original) {
      console.log(`⚠️  ${m.id}: INERT — source no longer matches this mutation, update it`);
      inert++;
      continue;
    }
    writeFileSync(TARGET, mutated);
    const stillGreen = await runSuite();
    writeFileSync(TARGET, original);

    if (stillGreen) {
      console.log(`✗ ${m.id}: SURVIVED — no test catches this`);
      console.log(`   ${m.why}`);
      survived++;
    } else {
      console.log(`✓ ${m.id}: killed`);
    }
  }
} finally {
  writeFileSync(TARGET, original);
  try {
    unlinkSync(BACKUP);
  } catch {}
}

console.log(
  `\n${MUTANTS.length - survived - inert}/${MUTANTS.length} mutants killed` +
    (survived ? `  ·  ${survived} SURVIVED` : '') +
    (inert ? `  ·  ${inert} inert` : ''),
);

if (survived || inert) {
  console.error('\nA green suite that cannot go red is not a passing suite.');
  process.exit(1);
}
