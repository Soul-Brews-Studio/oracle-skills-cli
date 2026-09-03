import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { parse as parseYaml } from "yaml";
import pkg from "../package.json" with { type: "json" };

// Zero-drift locks for the public-shelf/vault split.
//
// The layout IS the curation mechanism: skills/ (shelf) is what every external
// channel serves — our CLI profiles, .claude-plugin/marketplace.json, and
// `npx skills add` (vercel CLI priority-scans skills/ and, having found it,
// never falls back to a recursive scan that could reach the vault). These
// tests pin every hand-off point in that chain so a regression fails CI
// instead of silently double-serving or silently unshipping skills.

const SHELF_DIR = join(process.cwd(), "skills");
const VAULT_DIR = join(process.cwd(), "src", "skills");
const ARCHIVE_DIR = join(VAULT_DIR, ".archive");
const MARKETPLACE_PATH = join(process.cwd(), ".claude-plugin", "marketplace.json");

function skillDirsIn(root: string, { dot = false } = {}): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory() && (dot || !d.name.startsWith(".")))
    .filter((d) => existsSync(join(root, d.name, "SKILL.md")))
    .map((d) => d.name);
}

function frontmatterOf(root: string, name: string): string {
  const content = readFileSync(join(root, name, "SKILL.md"), "utf-8");
  return content.split(/^---\s*$/m)[1] ?? "";
}

describe("shelf ↔ marketplace.json parity", () => {
  it("marketplace skills == sorted readdir(skills/) exactly", () => {
    const manifest = JSON.parse(readFileSync(MARKETPLACE_PATH, "utf-8"));
    const listed: string[] = manifest.plugins[0].skills.map((p: string) => p.split("/").pop());
    const shelf = skillDirsIn(SHELF_DIR).sort((a, b) => a.localeCompare(b));
    expect(listed).toEqual(shelf);
  });
});

describe("shelf hygiene", () => {
  it("no shelf skill carries a secret/hidden/zombie/explicit-only flag", () => {
    const flagged = skillDirsIn(SHELF_DIR).filter((name) =>
      /(secret|hidden|zombie|explicit-only):\s*(true|yes)/i.test(frontmatterOf(SHELF_DIR, name)),
    );
    expect(flagged).toEqual([]);
  });

  it("no dot-directory under skills/ contains skills (external installers scan them)", () => {
    const dotDirs = readdirSync(SHELF_DIR, { withFileTypes: true })
      .filter((d) => d.isDirectory() && d.name.startsWith("."))
      .filter((d) =>
        existsSync(join(SHELF_DIR, d.name, "SKILL.md")) ||
        skillDirsIn(join(SHELF_DIR, d.name), { dot: true }).length > 0,
      )
      .map((d) => d.name);
    expect(dotDirs).toEqual([]);
  });

  it("every shelf frontmatter parses under strict YAML with string name+description", () => {
    // Our regex parser tolerates what strict YAML rejects (unquoted `: ` in a
    // description) — but the vercel CLI's parser silently DROPS such skills,
    // making them invisible on one channel only. Shelf must be parser-clean.
    const bad: string[] = [];
    for (const name of skillDirsIn(SHELF_DIR)) {
      try {
        const parsed = parseYaml(frontmatterOf(SHELF_DIR, name));
        if (typeof parsed?.description !== "string") bad.push(`${name}: description not a string`);
        if (parsed?.name !== undefined && typeof parsed.name !== "string") bad.push(`${name}: name not a string`);
      } catch (err) {
        bad.push(`${name}: ${String(err).split("\n")[0]}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("no test files live on the shelf", () => {
    const glob = new Bun.Glob("**/*.test.ts");
    const hits = [...glob.scanSync(SHELF_DIR)];
    expect(hits).toEqual([]);
  });
});

describe("vault hygiene", () => {
  it("every non-archive vault skill carries a curation flag", () => {
    const unflagged = skillDirsIn(VAULT_DIR).filter(
      (name) => !/(secret|hidden|zombie|explicit-only):\s*(true|yes)/i.test(frontmatterOf(VAULT_DIR, name)),
    );
    expect(unflagged).toEqual([]);
  });

  it("every vault skill (secrets + zombies + template) carries metadata internal: true", () => {
    // internal: true is what hides vault skills from external installers even
    // under --full-depth. Missing it re-leaks the skill into npx listings.
    const roots = [VAULT_DIR, ARCHIVE_DIR];
    const missing: string[] = [];
    for (const root of roots) {
      for (const name of skillDirsIn(root)) {
        if (!/internal:\s*true/i.test(frontmatterOf(root, name))) missing.push(name);
      }
    }
    const templateMd = join(VAULT_DIR, ".template", "SKILL.md");
    if (existsSync(templateMd)) {
      const fm = readFileSync(templateMd, "utf-8").split(/^---\s*$/m)[1] ?? "";
      if (!/internal:\s*true/i.test(fm)) missing.push(".template");
    }
    expect(missing).toEqual([]);
  });
});

describe("npm packaging canary", () => {
  it('package.json files includes both "skills" and "src"', () => {
    // Without "skills" the published npm CLI ships a shelf-less package and
    // every profile install from the tarball silently installs nothing.
    expect(pkg.files).toContain("skills");
    expect(pkg.files).toContain("src");
  });
});
