import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync, symlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const DETECTOR = join(import.meta.dir, '..', 'skills', 'recap', 'skills-staleness.ts');

const roots: string[] = [];

/** Build a fake $HOME with a .claude/skills shelf and a manifest. */
/**
 * Stand up a fake ghq source clone inside the fixture $HOME.
 *
 * `ghq root` reads git config, which reads $HOME — so overriding HOME points ghq
 * at the fixture and the detector compares against this fake clone. No network,
 * real shelf untouched. Fixture technique from neo (laris-co/neo-oracle).
 *
 * Without this, the BEHIND branch is unreachable in tests — which is exactly how
 * the prerelease comparison shipped with zero coverage (mutation M7 survived).
 */
function fakeSourceClone(home: string, version: string) {
  const dir = join(home, 'ghq', 'github.com', 'Soul-Brews-Studio', 'arra-oracle-skills-cli');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }));
}

function fixture(opts: {
  recorded: string[];
  withSkillMd: string[];
  bareDirs?: string[];
  /** Externally-managed skills linked into the shelf, as ego-browser really is. */
  symlinked?: string[];
  version?: string;
  installedAt?: string;
  sourceVersion?: string;
}) {
  const home = mkdtempSync(join(tmpdir(), 'arra-staleness-'));
  roots.push(home);
  const skills = join(home, '.claude', 'skills');
  mkdirSync(skills, { recursive: true });

  for (const n of opts.withSkillMd) {
    mkdirSync(join(skills, n), { recursive: true });
    writeFileSync(join(skills, n, 'SKILL.md'), '---\nname: x\n---\n');
  }
  // Directories with NO SKILL.md — the installer never records these.
  for (const n of opts.bareDirs ?? []) mkdirSync(join(skills, n), { recursive: true });

  // Externally-managed skills, linked in rather than installed. The real shelf has
  // one (ego-browser -> ~/.local/share/ego/ego-skills); no fixture had one until
  // now, which is why the exclusion was documented but never enforced.
  for (const n of opts.symlinked ?? []) {
    const real = join(home, 'external', n);
    mkdirSync(real, { recursive: true });
    writeFileSync(join(real, 'SKILL.md'), '---\nname: external\n---\n');
    symlinkSync(real, join(skills, n));
  }

  writeFileSync(
    join(skills, '.arra-oracle-skills.json'),
    JSON.stringify({
      version: opts.version ?? '26.7.27-alpha.947',
      installedAt: opts.installedAt ?? new Date().toISOString(),
      skills: opts.recorded,
      agent: 'claude-code',
    }),
  );
  if (opts.sourceVersion) fakeSourceClone(home, opts.sourceVersion);
  return { home, skills };
}

async function run(home: string): Promise<string> {
  return (await runFull(home)).stdout;
}

/** Full result — needed to assert the never-block contract (exit 0, clean stderr). */
async function runFull(home: string): Promise<{ stdout: string; stderr: string; code: number }> {
  const proc = Bun.spawn(['bun', DETECTOR], {
    env: { ...process.env, HOME: home },
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const code = await proc.exited;
  return { stdout, stderr, code };
}

afterAll(() => {
  for (const r of roots) {
    try {
      chmodSync(join(r, '.claude', 'skills'), 0o755);
    } catch {}
    try {
      rmSync(r, { recursive: true, force: true });
    } catch {}
  }
});

describe('skills-staleness detector', () => {
  test('a SKILL.md-less directory does NOT trigger a sticky false positive', async () => {
    // The installer builds the manifest with `isDirectory() && existsSync(SKILL.md)`
    // (src/cli/installer.ts:770-774). If the detector reconciles against a WIDER
    // population (isDirectory() only), any bare directory is permanently unrecorded:
    // MANIFEST UNRELIABLE forever, and no reinstall can clear it. Found by neo.
    const { home } = fixture({
      recorded: ['alpha-skill', 'beta-skill'],
      withSkillMd: ['alpha-skill', 'beta-skill'],
      bareDirs: ['leftover-dir', 'node_modules-ish'],
    });
    const out = await run(home);
    expect(out).not.toContain('MANIFEST UNRELIABLE');
    expect(out.trim()).toBe(''); // healthy shelf → completely silent
  });

  test('a genuinely unrecorded skill IS still reported', async () => {
    const { home } = fixture({
      recorded: ['alpha-skill', 'beta-skill'],
      withSkillMd: ['alpha-skill', 'beta-skill', 'ghost-skill'],
    });
    const out = await run(home);
    expect(out).toContain('MANIFEST UNRELIABLE');
    expect(out).toContain('3 skill dirs on disk, only 2 recorded');
  });

  test('fails CLOSED when the shelf cannot be read', async () => {
    // A verification gate that fails open is worse than none — it prints a
    // confident all-clear it cannot justify.
    const { home, skills } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
    });
    chmodSync(skills, 0o111); // traversable by name, readdir denied
    const out = await run(home);
    chmodSync(skills, 0o755);
    expect(out).toContain('manifest could NOT be reconciled against disk');
    expect(out).toContain('UNVERIFIED');
  });

  test('silent on a healthy, current shelf', async () => {
    const { home } = fixture({ recorded: ['alpha-skill'], withSkillMd: ['alpha-skill'] });
    expect((await run(home)).trim()).toBe('');
  });

  test('reports an install older than 30 days', async () => {
    const old = new Date(Date.now() - 45 * 86_400_000).toISOString();
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      installedAt: old,
    });
    const out = await run(home);
    expect(out).toContain('45d');
  });

  test('reports BEHIND when the local source clone is newer', async () => {
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      version: '26.5.16',
      sourceVersion: '26.7.27',
    });
    const { stdout, code } = await runFull(home);
    expect(stdout).toContain('BEHIND');
    expect(stdout).toContain('26.7.27');
    expect(code).toBe(0); // a diagnostic must never block the caller
  });

  test('a PRERELEASE is behind its own release (the untested branch)', async () => {
    // The whole point of the prerelease-aware comparison. Parsing that drops the
    // tag as NaN turns 26.7.27-alpha.947 into [26,7,27,947] and compares it AHEAD
    // of the release [26,7,27] — so everyone on a prerelease is told they are
    // current the moment it ships. This shipped with ZERO coverage; mutation M7
    // survived until this test existed.
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      version: '26.7.27-alpha.947',
      sourceVersion: '26.7.27',
    });
    expect((await run(home))).toContain('BEHIND');
  });

  test('the remediation it prints points at the SAME repo detection resolved', async () => {
    // Every other check in this file interrogates the tool's REASONING — does it
    // parse, run, discriminate, conclude correctly. None looked at the advice it
    // hands a human. A tool that detects BEHIND correctly and then prints a
    // command installing from the wrong repo is strictly worse than silence,
    // because it is trusted and acted on immediately.
    //
    // Verified as a real gap: a mutant corrupting ONLY the remediation string
    // survived all previous checks and both mutation harnesses.
    //
    // This asserts against GROUND TRUTH rather than a literal: whatever repo the
    // fixture stood the source clone up at — the repo detection actually used —
    // must be the repo the printed command installs from. Any wrong owner/repo
    // fails, not just the one control that exposed this.
    const REPO_SLUG = 'Soul-Brews-Studio/arra-oracle-skills-cli';
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      version: '26.5.16',
      sourceVersion: '26.7.27',
    });
    const out = await run(home);
    expect(out).toContain('BEHIND');

    // There must BE actionable advice — a BEHIND with no next step is a dead end.
    const cmd = out.split('\n').find((l) => l.includes('update:'));
    expect(cmd).toBeDefined();

    // Every repo reference in the advice must be the one detection resolved.
    const refs = [...(cmd ?? '').matchAll(/github[:/]([\w.-]+\/[\w.-]+)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(0);
    for (const ref of refs) expect(ref).toBe(REPO_SLUG);
  });

  test('does NOT report BEHIND when the shelf is current', async () => {
    // Guards the fix from over-firing: a correct shelf must stay silent.
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      version: '26.7.27',
      sourceVersion: '26.7.27',
    });
    expect((await run(home)).trim()).toBe('');
  });

  test('does NOT report BEHIND when the shelf is AHEAD of local source', async () => {
    // A local clone can itself be stale; being ahead of it is not being behind.
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      version: '26.7.27',
      sourceVersion: '26.5.16',
    });
    expect(await run(home)).not.toContain('BEHIND');
  });

  test('an externally-SYMLINKED skill does not count as unrecorded', async () => {
    // The real shelf carries ego-browser as a symlink to ~/.local/share/ego. It is
    // not shelf-managed, so the installer never records it and the detector must
    // not count it — isDirectory() on a Dirent deliberately does NOT follow
    // symlinks. That was documented as load-bearing and never enforced: a mutant
    // making the predicate count symlinks SURVIVED the whole suite, because no
    // fixture had ever contained one.
    //
    // Found by auditing the fixtures against the real shelf rather than by
    // attacking the tool — the fixture gap and the coverage gap were again the
    // same gap.
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      symlinked: ['ego-browser-ish'],
    });
    expect((await run(home)).trim()).toBe('');
  });

  test('a symlinked skill is excluded even while REAL drift is reported', async () => {
    // Guards the fix from over-applying: excluding symlinks must not also swallow
    // a genuine unrecorded skill sitting beside one. Counts must be right, not
    // merely quiet — 2 real dirs on disk, 1 recorded, symlink ignored entirely.
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill', 'ghost-skill'],
      symlinked: ['ego-browser-ish'],
    });
    const out = await run(home);
    expect(out).toContain('MANIFEST UNRELIABLE');
    expect(out).toContain('2 skill dirs on disk, only 1 recorded');
  });

  test('reports SKILLS MISSING when the manifest claims more than disk holds', async () => {
    // neo #25: reconciliation ran in ONE direction. `onDisk - recorded > 0` sees
    // disk exceeding the manifest; the reverse simply went negative and the guard
    // stayed false. A shelf that had lost 35 of 36 skills printed nothing and
    // exited 0, while --verbose said "36 skills recorded".
    //
    // This is the more urgent direction: unrecorded skills are an inventory gap,
    // missing skills are lost work.
    const { home } = fixture({
      recorded: ['alpha-skill', 'beta-skill', 'gamma-skill', 'delta-skill'],
      withSkillMd: ['alpha-skill'],
    });
    const { stdout, code } = await runFull(home);
    expect(stdout).toContain('SKILLS MISSING');
    expect(stdout).toContain('manifest records 4, only 1 on disk');
    expect(code).toBe(0); // still never blocks the caller
  });

  test('does NOT report SKILLS MISSING on a healthy shelf', async () => {
    // Guards the new direction from over-firing, the standard way this repair
    // breaks: every healthy shelf would otherwise look like data loss.
    const { home } = fixture({
      recorded: ['alpha-skill', 'beta-skill'],
      withSkillMd: ['alpha-skill', 'beta-skill'],
    });
    expect(await run(home)).not.toContain('SKILLS MISSING');
  });

  test('a symlinked skill does not fake a MISSING skill either', async () => {
    // The symlink exclusion and the new direction interact: a recorded skill that
    // is present only as a symlink would be counted absent by a naive fix, turning
    // the externally-linked case into phantom data loss.
    const { home } = fixture({
      recorded: ['alpha-skill'],
      withSkillMd: ['alpha-skill'],
      symlinked: ['ego-browser-ish'],
    });
    expect((await run(home)).trim()).toBe('');
  });

  test('never blocks the caller: no manifest → silent, clean stderr, exit 0', async () => {
    // Asserting only on stdout made this test non-discriminating: removing the
    // `existsSync(MANIFEST)` guard just moves the failure into the try/catch, so
    // stdout stays empty either way and the test could never go red (verified by
    // mutation — M6 killed nothing). The contract that actually matters is the
    // never-block one, so assert the whole surface: no stdout, no stderr noise,
    // exit 0. That catches an unhandled rejection or a crash reaching the caller.
    const home = mkdtempSync(join(tmpdir(), 'arra-staleness-none-'));
    roots.push(home);
    mkdirSync(join(home, '.claude', 'skills'), { recursive: true });
    const { stdout, stderr, code } = await runFull(home);
    expect(stdout.trim()).toBe('');
    expect(stderr).not.toContain('error:');
    expect(stderr).not.toContain('Unhandled');
    expect(code).toBe(0);
  });

  test('never blocks the caller: unreadable manifest → silent, exit 0', async () => {
    const home = mkdtempSync(join(tmpdir(), 'arra-staleness-bad-'));
    roots.push(home);
    const skills = join(home, '.claude', 'skills');
    mkdirSync(skills, { recursive: true });
    writeFileSync(join(skills, '.arra-oracle-skills.json'), '{ not json at all');
    const { stdout, stderr, code } = await runFull(home);
    expect(stdout.trim()).toBe('');
    expect(stderr).not.toContain('Unhandled');
    expect(code).toBe(0);
  });
});
