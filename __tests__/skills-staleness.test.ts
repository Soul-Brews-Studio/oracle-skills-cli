import { afterAll, describe, expect, test } from 'bun:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const DETECTOR = join(import.meta.dir, '..', 'skills', 'recap', 'skills-staleness.ts');

const roots: string[] = [];

/** Build a fake $HOME with a .claude/skills shelf and a manifest. */
function fixture(opts: {
  recorded: string[];
  withSkillMd: string[];
  bareDirs?: string[];
  version?: string;
  installedAt?: string;
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

  writeFileSync(
    join(skills, '.arra-oracle-skills.json'),
    JSON.stringify({
      version: opts.version ?? '26.7.27-alpha.947',
      installedAt: opts.installedAt ?? new Date().toISOString(),
      skills: opts.recorded,
      agent: 'claude-code',
    }),
  );
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
