import { describe, expect, test } from 'bun:test';
import { compareVersions } from '../src/cli/installer';

/**
 * #500 — orphan cleanup evicted a skill NEWER than the tree being installed from.
 *
 * Real incident (2026-08-16): `oracle-write-complete-book` was installed at
 * v26.7.25-alpha.1900. An install run from a `main` checkout (v26.7.16) — where
 * that skill does not exist — classified it as an orphan and moved it out.
 * The check was name-membership only, with no version comparison.
 *
 * These lock in the ordering the guard depends on. The guard keeps a skill when
 * compareVersions(installedOnDisk, thisTree) > 0.
 */
describe('compareVersions', () => {
  test('the exact pair from the incident: newer prerelease beats older release', () => {
    // This is the comparison that must return > 0 for the skill to survive.
    expect(compareVersions('26.7.25-alpha.1900', '26.7.16')).toBeGreaterThan(0);
  });

  test('orders by numeric core, not string', () => {
    // '26.7.9' > '26.7.16' as strings; must not be.
    expect(compareVersions('26.7.16', '26.7.9')).toBeGreaterThan(0);
    expect(compareVersions('26.7.9', '26.7.16')).toBeLessThan(0);
  });

  test('major and minor take precedence over patch', () => {
    expect(compareVersions('27.1.0', '26.12.99')).toBeGreaterThan(0);
    expect(compareVersions('26.8.0', '26.7.99')).toBeGreaterThan(0);
  });

  test('equal versions compare equal', () => {
    expect(compareVersions('26.7.16', '26.7.16')).toBe(0);
    expect(compareVersions('26.7.27-alpha.947', '26.7.27-alpha.947')).toBe(0);
  });

  test('a release outranks a prerelease of the same core (semver rule)', () => {
    expect(compareVersions('26.7.27', '26.7.27-alpha.947')).toBeGreaterThan(0);
    expect(compareVersions('26.7.27-alpha.947', '26.7.27')).toBeLessThan(0);
  });

  test('prerelease numbers compare numerically, not lexically', () => {
    // alpha.947 vs alpha.1149 — lexically '947' > '1149', numerically it is not.
    expect(compareVersions('26.7.27-alpha.1149', '26.7.27-alpha.947')).toBeGreaterThan(0);
    expect(compareVersions('26.7.27-alpha.947', '26.7.27-alpha.1149')).toBeLessThan(0);
  });

  test('a longer prerelease chain outranks its own prefix', () => {
    expect(compareVersions('26.7.27-alpha.1', '26.7.27-alpha')).toBeGreaterThan(0);
  });

  test('missing numeric segments are treated as zero', () => {
    expect(compareVersions('26.7', '26.7.0')).toBe(0);
    expect(compareVersions('26.7.1', '26.7')).toBeGreaterThan(0);
  });

  test('guard direction: an OLDER tree must not evict a NEWER installed skill', () => {
    const installedOnDisk = '26.7.25-alpha.1900';
    const thisTree = '26.7.16';
    const keep = compareVersions(installedOnDisk, thisTree) > 0;
    expect(keep).toBe(true);
  });

  test('guard direction: a genuinely stale orphan is still evicted', () => {
    const installedOnDisk = '26.5.16';
    const thisTree = '26.7.27-alpha.947';
    const keep = compareVersions(installedOnDisk, thisTree) > 0;
    expect(keep).toBe(false);
  });
});
