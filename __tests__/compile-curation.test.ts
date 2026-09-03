import { afterAll, describe, expect, it } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const ROOT = mkdtempSync(join(tmpdir(), "arra-compile-curation-"));
const COMPILE = join(import.meta.dir, "..", "scripts", "compile.ts");

afterAll(() => rmSync(ROOT, { recursive: true, force: true }));

async function skill(root: string, location: "skills" | "src/skills", name: string, flags = "") {
  const dir = join(root, location, name);
  await mkdir(dir, { recursive: true });
  await writeFile(
    join(dir, "SKILL.md"),
    `---\nname: ${name}\ndescription: ${name} fixture\n${flags}---\n# ${name}\n`,
  );
}

async function fixture(name: string): Promise<string> {
  const root = join(ROOT, name);
  await mkdir(join(root, ".claude-plugin"), { recursive: true });
  await skill(root, "skills", "public-fixture");
  return root;
}

function compile(root: string) {
  return Bun.spawnSync(["bun", COMPILE], {
    cwd: root,
    env: {
      ...process.env,
      GIT_CONFIG_GLOBAL: "/dev/null",
      GIT_CONFIG_SYSTEM: "/dev/null",
      GIT_CONFIG_NOSYSTEM: "1",
    },
  });
}

describe("compile curation parity", () => {
  it("accepts an explicit-only vault skill and excludes it from marketplace", async () => {
    const root = await fixture("vault-explicit-only");
    await skill(
      root,
      "src/skills",
      "internal-fixture",
      "explicit-only: true\nmetadata:\n  internal: true\n",
    );

    const result = compile(root);
    expect(result.exitCode, result.stderr.toString()).toBe(0);
    const manifestPath = join(root, ".claude-plugin", "marketplace.json");
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    expect(manifest.plugins[0].skills).toEqual(["./skills/public-fixture"]);
  });

  it("rejects explicit-only on the public shelf", async () => {
    const root = await fixture("shelf-explicit-only");
    await skill(root, "skills", "leaked-internal", "explicit-only: true\n");

    const result = compile(root);
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString() + result.stdout.toString()).toContain(
      "secret/hidden/zombie/explicit-only flag",
    );
  });
});
