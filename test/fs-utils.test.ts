import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { mkdirp, rmrf, cpr, mv, rmf, cp } from '../src/cli/fs-utils';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const testDir = join(tmpdir(), 'oracle-skills-test-' + Date.now());

beforeEach(() => {
  mkdirSync(testDir, { recursive: true });
});

afterEach(() => {
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
});

describe('fs-utils', () => {
  describe('mkdirp', () => {
    test('creates nested directories with no-shell mode', async () => {
      const nested = join(testDir, 'a/b/c');
      await mkdirp(nested, 'no-shell');
      expect(existsSync(nested)).toBe(true);
    });

    test('creates nested directories with shell mode', async () => {
      const nested = join(testDir, 'd/e/f');
      await mkdirp(nested, 'shell');
      expect(existsSync(nested)).toBe(true);
    });

    test('creates nested directories with auto mode', async () => {
      const nested = join(testDir, 'g/h/i');
      await mkdirp(nested, 'auto');
      expect(existsSync(nested)).toBe(true);
    });
  });

  describe('rmrf', () => {
    test('removes directory recursively with no-shell mode', async () => {
      const dir = join(testDir, 'to-delete');
      mkdirSync(join(dir, 'nested'), { recursive: true });
      writeFileSync(join(dir, 'nested/file.txt'), 'test');

      await rmrf(dir, 'no-shell');
      expect(existsSync(dir)).toBe(false);
    });

    test('removes directory recursively with shell mode', async () => {
      const dir = join(testDir, 'to-delete-shell');
      mkdirSync(join(dir, 'nested'), { recursive: true });
      writeFileSync(join(dir, 'nested/file.txt'), 'test');

      await rmrf(dir, 'shell');
      expect(existsSync(dir)).toBe(false);
    });

    test('handles non-existent paths gracefully', async () => {
      await rmrf(join(testDir, 'does-not-exist'), 'no-shell');
      // Should not throw
    });
  });

  describe('cpr', () => {
    test('copies directory recursively with no-shell mode', async () => {
      const src = join(testDir, 'src-dir');
      const dest = join(testDir, 'dest-dir');
      mkdirSync(join(src, 'nested'), { recursive: true });
      writeFileSync(join(src, 'nested/file.txt'), 'content');

      await cpr(src, dest, 'no-shell');

      expect(existsSync(dest)).toBe(true);
      expect(readFileSync(join(dest, 'nested/file.txt'), 'utf-8')).toBe('content');
    });

    test('copies directory recursively with shell mode', async () => {
      const src = join(testDir, 'src-dir-shell');
      const dest = join(testDir, 'dest-dir-shell');
      mkdirSync(join(src, 'nested'), { recursive: true });
      writeFileSync(join(src, 'nested/file.txt'), 'content');

      await cpr(src, dest, 'shell');

      expect(existsSync(dest)).toBe(true);
      expect(readFileSync(join(dest, 'nested/file.txt'), 'utf-8')).toBe('content');
    });
  });

  describe('mv', () => {
    test('moves file with no-shell mode', async () => {
      const src = join(testDir, 'move-src');
      const dest = join(testDir, 'move-dest');
      mkdirSync(src);
      writeFileSync(join(src, 'file.txt'), 'moved');

      await mv(src, dest, 'no-shell');

      expect(existsSync(src)).toBe(false);
      expect(existsSync(dest)).toBe(true);
    });

    test('moves file with shell mode', async () => {
      const src = join(testDir, 'move-src-shell');
      const dest = join(testDir, 'move-dest-shell');
      mkdirSync(src);
      writeFileSync(join(src, 'file.txt'), 'moved');

      await mv(src, dest, 'shell');

      expect(existsSync(src)).toBe(false);
      expect(existsSync(dest)).toBe(true);
    });
  });

  describe('rmf', () => {
    test('removes single file with no-shell mode', async () => {
      const file = join(testDir, 'single-file.txt');
      writeFileSync(file, 'content');

      await rmf(file, 'no-shell');
      expect(existsSync(file)).toBe(false);
    });

    test('removes single file with shell mode', async () => {
      const file = join(testDir, 'single-file-shell.txt');
      writeFileSync(file, 'content');

      await rmf(file, 'shell');
      expect(existsSync(file)).toBe(false);
    });

    test('handles non-existent file gracefully', async () => {
      await rmf(join(testDir, 'does-not-exist.txt'), 'no-shell');
      // Should not throw
    });
  });

  describe('cp', () => {
    test('copies single file with no-shell mode', async () => {
      const src = join(testDir, 'single.txt');
      const dest = join(testDir, 'single-copy.txt');
      writeFileSync(src, 'single file');

      await cp(src, dest, 'no-shell');

      expect(readFileSync(dest, 'utf-8')).toBe('single file');
    });

    test('copies single file with shell mode', async () => {
      const src = join(testDir, 'single-shell.txt');
      const dest = join(testDir, 'single-copy-shell.txt');
      writeFileSync(src, 'single file');

      await cp(src, dest, 'shell');

      expect(readFileSync(dest, 'utf-8')).toBe('single file');
    });
  });
});
