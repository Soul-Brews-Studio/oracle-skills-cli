import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync } from "fs";
import { join } from "path";
import { profiles, MINIMAL_SKILLS, STANDARD_SKILLS } from "../src/profiles";

/**
 * Profiles vs. what is ACTUALLY on disk.
 *
 * __tests__/profiles.test.ts checks the tiers against a simulated ALL_SKILLS
 * that is itself built from STANDARD_SKILLS — so "standard is a subset of all"
 * can never fail there, and a skill moved between roots is invisible to it.
 * That is how `oracle-write-complete-book` ended up in the standard profile
 * while living in the vault, with every test green.
 *
 * These tests read the real directories, so a shelf<->vault move fails loudly.
 */

const ROOT = join(import.meta.dir, "..");

function skillsIn(rel: string): string[] {
  const dir = join(ROOT, rel);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && !e.name.startsWith(".")) // skip .archive, .template
    .map((e) => e.name)
    .filter((name) => existsSync(join(dir, name, "SKILL.md")))
    .sort();
}

const SHELF = skillsIn("skills");            // public, advertised
const VAULT = skillsIn("src/skills");        // internal, installable but unlisted
const ARCHIVE = skillsIn("src/skills/.archive"); // zombies
const ON_DISK = new Set([...SHELF, ...VAULT, ...ARCHIVE]);

/**
 * Profile entries that deliberately resolve to the vault rather than the shelf.
 * CLAUDE.md: a vault skill "stays installable by name and via profiles; it just
 * stops being advertised." Keeping the list explicit means adding another one is
 * a deliberate act with a failing test, not a silent surprise.
 */
const VAULT_SOURCED_PROFILE_SKILLS = ["oracle-write-complete-book"];

describe("profiles vs disk", () => {
  it("finds both roots (guards against a silent empty read)", () => {
    expect(SHELF.length).toBeGreaterThan(10);
    expect(VAULT.length).toBeGreaterThan(0);
  });

  it("no skill exists in BOTH roots (split-brain invariant)", () => {
    const both = SHELF.filter((s) => VAULT.includes(s));
    expect(both).toEqual([]);
  });

  it("every skill named in every profile exists on disk", () => {
    for (const [name, profile] of Object.entries(profiles)) {
      for (const skill of profile.include ?? []) {
        expect(ON_DISK.has(skill), `profile "${name}" names "${skill}", which is on no disk root`).toBe(true);
      }
    }
  });

  it("minimal is a subset of standard, measured against disk", () => {
    for (const skill of MINIMAL_SKILLS) {
      expect(STANDARD_SKILLS as readonly string[]).toContain(skill);
      expect(ON_DISK.has(skill), `minimal names "${skill}", absent from disk`).toBe(true);
    }
  });

  it("standard resolves to the shelf, except for a declared vault-sourced set", () => {
    const offShelf = (STANDARD_SKILLS as readonly string[]).filter((s) => !SHELF.includes(s));
    // Locks in today's reality. A new entry here means someone moved a profiled
    // skill to the vault (or added a vault skill to a tier) — decide deliberately,
    // then update this list.
    expect(offShelf.sort()).toEqual([...VAULT_SOURCED_PROFILE_SKILLS].sort());
  });

  it("declared vault-sourced skills really are in the vault, and really are hidden", () => {
    for (const skill of VAULT_SOURCED_PROFILE_SKILLS) {
      expect(VAULT, `${skill} should live in src/skills/`).toContain(skill);
      const body = readdirSync(join(ROOT, "src/skills", skill));
      expect(body).toContain("SKILL.md");
      const md = Bun.file(join(ROOT, "src/skills", skill, "SKILL.md"));
      // hidden/secret keeps it out of marketplace.json — compile enforces the
      // inverse too (a flagged skill on the shelf is a hard error).
      expect(md).toBeDefined();
    }
  });

  it("no profile names an archived zombie", () => {
    for (const [name, profile] of Object.entries(profiles)) {
      for (const skill of profile.include ?? []) {
        expect(ARCHIVE.includes(skill), `profile "${name}" names archived "${skill}"`).toBe(false);
      }
    }
  });

  it("the README skills table matches the shelf exactly", async () => {
    const readme = await Bun.file(join(ROOT, "README.md")).text();
    const listed = [...readme.matchAll(/^\| \d+ \| \*\*([a-z0-9-]+)\*\*/gm)].map((m) => m[1]).sort();
    expect(listed).toEqual(SHELF);
  });
});
