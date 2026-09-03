import { describe, it, expect } from "bun:test";
import { readdirSync, existsSync, mkdtempSync, rmSync } from "fs";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { discoverSkills } from "../src/cli/installer";
import { discoverSkillsFromVFS } from "../src/cli/skill-source";
import {
  resolveProfile,
  ZOMBIE_SKILLS,
  LAB_SKILLS,
  STANDARD_SKILLS,
  MINIMAL_SKILLS,
  profiles,
} from "../src/profiles";

// Integration guard for the 2026-07 zombie-leak regression.
//
// profiles.test.ts is a UNIT test: it feeds resolveProfile the ZOMBIE_SKILLS
// *constant* and checks the filtering logic. That constant was CORRECT the whole
// time — but the actual install path excludes zombies via the frontmatter-derived
// `.zombie` flag from discoverSkills(), NOT the constant. Zombie round 2 moved 11
// skills into src/skills/.archive/ + added them to the constant but forgot the
// `zombie: true` frontmatter — so discoverSkills() didn't flag them and they kept
// installing under `full`/`lab`. The unit test stayed green while install leaked.
//
// These tests exercise the REAL mechanism end-to-end (disk → discoverSkills →
// resolveProfile) so the same class of drift can't slip through again.

// Dual-root layout: public shelf (skills/) + vault (src/skills/ — secrets,
// .archive zombies, .template).
const SHELF_DIR = join(process.cwd(), "skills");
const VAULT_DIR = join(process.cwd(), "src", "skills");
const ARCHIVE_DIR = join(VAULT_DIR, ".archive");

function skillNamesIn(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter(
      (d) => d.isDirectory() && !d.name.startsWith(".") && d.name !== "_template",
    )
    .filter((d) => existsSync(join(root, d.name, "SKILL.md")))
    .map((d) => d.name);
}

function archivedSkillNames(): string[] {
  return skillNamesIn(ARCHIVE_DIR);
}

/** Shelf + vault-active (secrets) — everything outside the archive. */
function activeSkillNames(): string[] {
  return [...skillNamesIn(SHELF_DIR), ...skillNamesIn(VAULT_DIR)];
}

describe("archive integrity (real discoverSkills)", () => {
  // The archive emptied on 2026-08-22 — all 39 zombies moved to
  // Soul-Brews-Studio/arra-oracle-skills-archive. The old test asserted that every
  // archived skill carried the zombie flag; with an empty archive it passed while
  // proving nothing (`expect([]).toEqual([])`). Replaced with a guard on the thing
  // that now matters: the breadcrumb, and the invariant that nothing crept back.
  it("the archive holds only the breadcrumb — no skill directories crept back", () => {
    expect(archivedSkillNames()).toEqual([]);
    const moved = join(ARCHIVE_DIR, "MOVED.md");
    expect(existsSync(moved), "src/skills/.archive/MOVED.md must exist").toBe(true);
  });

  it("the breadcrumb names the repo the skills actually moved to", async () => {
    const body = await Bun.file(join(ARCHIVE_DIR, "MOVED.md")).text();
    expect(body).toContain("Soul-Brews-Studio/arra-oracle-skills-archive");
    // A forwarding address that does not say how to follow it is not a forwarding
    // address — this is the "archive the body, drop the chain" anti-pattern.
    expect(body).toMatch(/git clone|install/i);
  });

  it("ZOMBIE_SKILLS is empty now that the tier has no members on disk", () => {
    expect([...ZOMBIE_SKILLS]).toEqual([]);
  });

  it("no archived skill leaks into the full or lab install set", async () => {
    const archived = new Set(archivedSkillNames());
    const skills = await discoverSkills();
    const allNames = skills.map((s) => s.name);
    const secretNames = skills.filter((s) => s.secret).map((s) => s.name);
    const zombieNames = skills.filter((s) => s.zombie).map((s) => s.name);
    const explicitOnlyNames = skills.filter((s) => s.explicitOnly).map((s) => s.name);

    for (const profile of ["full", "lab"]) {
      const resolved =
        resolveProfile(profile, allNames, secretNames, zombieNames, explicitOnlyNames) ??
        allNames.filter(
          (s) => !secretNames.includes(s) && !zombieNames.includes(s) && !explicitOnlyNames.includes(s),
        );
      const leaked = resolved.filter((name) => archived.has(name));
      expect({ profile, leaked }).toEqual({ profile, leaked: [] });
    }
  });

  it("internal lifecycle skills are explicit-only and absent from every profile", async () => {
    const names = ["workon", "worktree", "merged"];
    const skills = await discoverSkills();
    const byName = new Map(skills.map((skill) => [skill.name, skill]));
    for (const name of names) {
      expect(byName.get(name)?.hidden, `${name} must stay out of command stubs`).toBe(true);
      expect(byName.get(name)?.explicitOnly, `${name} must require -s ${name}`).toBe(true);
    }

    const allNames = skills.map((skill) => skill.name);
    const secretNames = skills.filter((skill) => skill.secret).map((skill) => skill.name);
    const zombieNames = skills.filter((skill) => skill.zombie).map((skill) => skill.name);
    const explicitOnlyNames = skills.filter((skill) => skill.explicitOnly).map((skill) => skill.name);
    for (const profile of Object.keys(profiles)) {
      const resolved = resolveProfile(profile, allNames, secretNames, zombieNames, explicitOnlyNames) ?? [];
      for (const name of names) expect(resolved).not.toContain(name);
    }
  });

  it("compiled VFS parsing preserves explicit-only profile exclusion", () => {
    const withFlag = `---\nname: internal-test\ndescription: internal fixture\nhidden: true\nexplicit-only: true\n---\nbody\n`;
    const withoutFlag = withFlag.replace("explicit-only: true\n", "");
    const parse = (content: string) => discoverSkillsFromVFS(
      new Map([["internal-test", new Map([["SKILL.md", content]])]]),
      ["internal-test"],
    );

    const flagged = parse(withFlag);
    expect(flagged[0]).toMatchObject({
      name: "internal-test",
      path: "vfs://internal-test",
      hidden: true,
      explicitOnly: true,
    });
    const excluded = resolveProfile("full", ["internal-test"], [], [], ["internal-test"]);
    expect(excluded).toEqual([]);

    // Negative control: stripping the VFS frontmatter flag makes the same name
    // profile-eligible, so this test fails if native parsing drops the signal.
    const unflagged = parse(withoutFlag);
    expect(unflagged[0].explicitOnly).toBeUndefined();
    expect(resolveProfile("full", ["internal-test"], [], [], [])).toEqual(["internal-test"]);
  });

  it("compiled define executes isCompiled and the generated VFS import", async () => {
    const root = mkdtempSync(join(tmpdir(), "arra-vfs-wiring-"));
    try {
      await mkdir(join(root, "src", "generated"), { recursive: true });
      await writeFile(
        join(root, "src", "skill-source.ts"),
        await Bun.file(join(process.cwd(), "src", "cli", "skill-source.ts")).text(),
      );
      await writeFile(
        join(root, "src", "types.ts"),
        await Bun.file(join(process.cwd(), "src", "cli", "types.ts")).text(),
      );
      await writeFile(
        join(root, "src", "generated", "skills-vfs.ts"),
        `export const SKILLS_VFS = new Map([["wired", new Map([["SKILL.md", ` +
          JSON.stringify(`---\nname: wired\ndescription: wired fixture\nexplicit-only: true\n---\nbody\n`) +
          `]])]]);\nexport const SKILL_NAMES = ["wired"];\n`,
      );
      const runner = join(root, "runner.ts");
      await writeFile(
        runner,
        `import { discoverSkills, isCompiled } from "./src/skill-source.ts";\n` +
          `console.log(JSON.stringify({ compiled: isCompiled(), skills: await discoverSkills() }));\n`,
      );
      const build = await Bun.build({
        entrypoints: [runner],
        outdir: join(root, "dist"),
        target: "bun",
        define: { IS_COMPILED: "true" },
      });
      expect(build.success, build.logs.join("\n")).toBe(true);
      const run = Bun.spawnSync(["bun", join(root, "dist", "runner.js")]);
      expect(run.exitCode, run.stderr.toString()).toBe(0);
      expect(JSON.parse(run.stdout.toString().trim())).toEqual({
        compiled: true,
        skills: [{
          name: "wired",
          description: "wired fixture",
          path: "vfs://wired",
          explicitOnly: true,
        }],
      });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

// The curation system has three views of "which skills are zombies": the
// ZOMBIE_SKILLS constant (drives the [zombie] install label), the .archive/
// directory (physical storage + the -s opt-in path), and the per-file
// `zombie: true` frontmatter (drives install exclusion, checked above). They
// currently agree — these tests keep them agreeing. The archive→frontmatter
// axis already drifted once (PR #453); this locks the other two axes before
// they can.
describe("curation consistency (constant ↔ directory ↔ profiles)", () => {
  it("ZOMBIE_SKILLS constant exactly matches the .archive/ directory set", () => {
    const constant: string[] = [...ZOMBIE_SKILLS].sort();
    const dirs: string[] = archivedSkillNames().sort();
    // Both directions: a name in the constant with no dir would mislabel a
    // non-existent skill; a dir with no constant entry loses its [zombie] tag.
    expect(constant).toEqual(dirs);
  });

  it("no skill name exists in more than one root (shelf/vault/archive shadowing)", () => {
    // resolveSkillDir() checks shelf → vault → archive, so a duplicate name
    // would silently shadow a copy and change what `-s <name>` installs.
    const shelf = skillNamesIn(SHELF_DIR);
    const vault = skillNamesIn(VAULT_DIR);
    const archive = archivedSkillNames();
    const counts = new Map<string, string[]>();
    for (const [root, names] of [
      ["skills/", shelf],
      ["src/skills/", vault],
      ["src/skills/.archive/", archive],
    ] as const) {
      for (const n of names) counts.set(n, [...(counts.get(n) ?? []), root]);
    }
    const collisions = [...counts.entries()].filter(([, roots]) => roots.length > 1);
    expect(collisions).toEqual([]);
  });

  it("every minimal/standard/lab-only skill resolves to a real active dir", () => {
    const active = new Set(activeSkillNames());
    for (const [label, list] of [
      ["MINIMAL", MINIMAL_SKILLS],
      ["STANDARD", STANDARD_SKILLS],
      ["LAB", LAB_SKILLS],
    ] as const) {
      const dangling = [...list].filter((n) => !active.has(n));
      // A profile pointing at a moved/deleted skill installs nothing for that
      // slot — silently shrinking the profile.
      expect({ label, dangling }).toEqual({ label, dangling: [] });
    }
  });
});
