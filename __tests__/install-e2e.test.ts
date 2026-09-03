/**
 * Consolidated install end-to-end suite. Merges (test bodies verbatim):
 *   - e2e-install.test.ts        — full install/uninstall lifecycle (standard/full profiles)
 *   - e2e-features.test.ts       — per-profile install counts + additive switch
 *   - integration.test.ts        — installed OpenCode global skills/commands checks
 *   - installer-behavior.test.ts — install format by agent type (own setup, no synthetic agent)
 *
 * Boilerplate (temp dir + synthetic agent + register/cleanup) comes from
 * ./helpers/install-fixture for the two e2e suites. Each former file keeps its
 * own block scope so its module-level constants don't collide. integration and
 * installer-behavior keep their original setup verbatim (they don't use the
 * synthetic-agent-in-tmpdir pattern).
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { readdir, readFile, rm, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdtempSync, rmSync } from "fs";
import { homedir, tmpdir } from "os";
import { $ } from "bun";
import { installSkills, uninstallSkills, discoverSkills } from "../src/cli/installer";
import { profiles, labOnly, minimalOnly } from "../src/profiles";
import { makeInstallFixture, listSkillDirs } from "./helpers/install-fixture";

// ═════════════════════════════════════════════════════════════════════════════
// e2e-install.test.ts — full install/uninstall lifecycle
// (useFlatFiles: true + commands dir)
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("e2e-install", { useFlatFiles: true });
  const { skillsDir: SKILLS_DIR, commandsDir: COMMANDS_DIR, agent: TEST_AGENT } = fx;

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  async function listCommandFiles(dir: string): Promise<string[]> {
    if (!existsSync(dir)) return [];
    const entries = await readdir(dir);
    return entries.filter((f) => f.endsWith(".md")).sort();
  }

  describe("e2e: install with standard profile", () => {
    it("installs standard profile skills + commands", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        yes: true,
        commands: true,
      });

      const skills = await listSkillDirs(SKILLS_DIR);
      const standardSkills = profiles.standard.include!;

      for (const name of standardSkills) {
        expect(skills).toContain(name);
      }
      expect(skills.length).toBe(standardSkills.length);
    });

    it("each skill has SKILL.md with installer marker", async () => {
      const skills = await listSkillDirs(SKILLS_DIR);

      for (const name of skills) {
        const skillMd = join(SKILLS_DIR, name, "SKILL.md");
        expect(existsSync(skillMd)).toBe(true);

        const content = await readFile(skillMd, "utf-8");
        expect(content).toContain("installer: arra-oracle-skills-cli");
      }
    });

    it("each skill has version-prefixed description", async () => {
      const skills = await listSkillDirs(SKILLS_DIR);

      for (const name of skills) {
        const content = await readFile(join(SKILLS_DIR, name, "SKILL.md"), "utf-8");
        expect(content).toMatch(/v\d+\.\d+\.\d+(-[\w.]+)? G-SKLL(\s\[\w+\])? \|/);
      }
    });

    it("command stubs exist for each non-hidden skill", async () => {
      const commands = await listCommandFiles(COMMANDS_DIR);
      const allSkills = await discoverSkills();
      const hiddenNames = new Set(allSkills.filter((s) => s.hidden).map((s) => s.name));
      const standardSkills = profiles.standard.include!;

      for (const name of standardSkills) {
        if (hiddenNames.has(name)) {
          expect(commands).not.toContain(`${name}.md`);
        } else {
          expect(commands).toContain(`${name}.md`);
        }
      }
    });

    it("manifest has correct structure", async () => {
      const manifestPath = join(SKILLS_DIR, ".arra-oracle-skills.json");
      expect(existsSync(manifestPath)).toBe(true);

      const manifest = JSON.parse(await readFile(manifestPath, "utf-8"));
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
      expect(manifest.agent).toBe(TEST_AGENT);
      expect(manifest.skills).toBeArray();
      expect(manifest.skills.length).toBe(profiles.standard.include!.length);
      expect(manifest.installedAt).toBeTruthy();
    });

    it("VERSION.md exists", async () => {
      expect(existsSync(join(SKILLS_DIR, "VERSION.md"))).toBe(true);
    });
  });

  describe("e2e: uninstall after standard", () => {
    it("removes all skills and commands", async () => {
      const result = await uninstallSkills([TEST_AGENT], {
        global: true,
        yes: true,
      });

      expect(result.removed).toBe(profiles.standard.include!.length);
      expect(result.agents).toBe(1);

      const skills = await listSkillDirs(SKILLS_DIR);
      expect(skills.length).toBe(0);

      const commands = await listCommandFiles(COMMANDS_DIR);
      expect(commands.length).toBe(0);
    });
  });

  describe("e2e: install full profile", () => {
    it("installs all stable skills (excludes lab-only)", async () => {
      const allSkills = await discoverSkills();

      await installSkills([TEST_AGENT], {
        global: true,
        profile: "full",
        yes: true,
        commands: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      const fullSkills = allSkills.filter(s => !labOnly.includes(s.name) && !minimalOnly.includes(s.name) && !s.secret && !s.zombie && !s.explicitOnly);
      // On mismatch, name the drift — a bare count diff is undebuggable on CI.
      const fullNames = new Set(fullSkills.map((s) => s.name));
      expect({
        count: installed.length,
        extra: installed.filter((n) => !fullNames.has(n)),
        missing: [...fullNames].filter((n) => !installed.includes(n)),
      }).toEqual({ count: fullSkills.length, extra: [], missing: [] });
    });

    it("every full-profile skill has a directory", async () => {
      const allSkills = await discoverSkills();
      const installed = await listSkillDirs(SKILLS_DIR);
      const fullSkills = allSkills.filter(s => !labOnly.includes(s.name) && !minimalOnly.includes(s.name) && !s.secret && !s.zombie && !s.explicitOnly);

      for (const skill of fullSkills) {
        expect(installed).toContain(skill.name);
      }
    });

    it("command stubs match installed non-hidden skills", async () => {
      const allSkills = await discoverSkills();
      const installed = await listSkillDirs(SKILLS_DIR);
      const commands = await listCommandFiles(COMMANDS_DIR);

      for (const skill of allSkills.filter(s => installed.includes(s.name))) {
        if (skill.hidden) {
          expect(commands).not.toContain(`${skill.name}.md`);
        } else {
          expect(commands).toContain(`${skill.name}.md`);
        }
      }
    });
  });

  describe("e2e: uninstall full", () => {
    it("removes everything cleanly", async () => {
      const installed = await listSkillDirs(SKILLS_DIR);

      const result = await uninstallSkills([TEST_AGENT], {
        global: true,
        yes: true,
      });

      expect(result.removed).toBe(installed.length);

      const skills = await listSkillDirs(SKILLS_DIR);
      expect(skills.length).toBe(0);

      const commands = await listCommandFiles(COMMANDS_DIR);
      expect(commands.length).toBe(0);
    });
  });

  describe("e2e: uninstall preserves external skills", () => {
    it("skips skills without installer marker", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        yes: true,
      });

      const externalDir = join(SKILLS_DIR, "external-skill");
      await mkdir(externalDir, { recursive: true });
      await writeFile(join(externalDir, "SKILL.md"), "# External Skill\n\nInstalled by another tool.");

      const result = await uninstallSkills([TEST_AGENT], {
        global: true,
        yes: true,
      });

      expect(existsSync(externalDir)).toBe(true);
      const remaining = await listSkillDirs(SKILLS_DIR);
      expect(remaining).toEqual(["external-skill"]);

      await rm(externalDir, { recursive: true });
    });

    it("removes explicitly named external skills with -s flag", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        yes: true,
      });

      const externalDir = join(SKILLS_DIR, "my-custom-skill");
      await mkdir(externalDir, { recursive: true });
      await writeFile(join(externalDir, "SKILL.md"), "# Custom\n\nNo marker.");

      await uninstallSkills([TEST_AGENT], {
        global: true,
        skills: ["my-custom-skill"],
        yes: true,
      });

      expect(existsSync(externalDir)).toBe(false);
      await uninstallSkills([TEST_AGENT], { global: true, yes: true });
    });
  });

  describe("e2e: profile switch (full → standard) is additive", () => {
    // #254 Bug 5: install is additive only. A second install with a smaller
    // profile must not remove skills from the larger profile. Users remove
    // explicitly via `uninstall`.
    it("installs full then switches to standard, keeps extras", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "full",
        yes: true,
        commands: true,
      });

      const allSkills = await discoverSkills();
      const fullSkills = allSkills.filter(s => !labOnly.includes(s.name) && !minimalOnly.includes(s.name) && !s.secret && !s.zombie && !s.explicitOnly);
      let skills = await listSkillDirs(SKILLS_DIR);
      // On mismatch, name the drift — a bare count diff is undebuggable on CI.
      const fullNames = new Set(fullSkills.map((s) => s.name));
      expect({
        count: skills.length,
        extra: skills.filter((n) => !fullNames.has(n)),
        missing: [...fullNames].filter((n) => !skills.includes(n)),
      }).toEqual({ count: fullSkills.length, extra: [], missing: [] });

      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        yes: true,
        commands: true,
      });

      skills = await listSkillDirs(SKILLS_DIR);
      const standardSkills = profiles.standard.include!;

      // Additive: count unchanged, all full skills still present.
      expect(skills.length).toBe(fullSkills.length);
      for (const name of standardSkills) {
        expect(skills).toContain(name);
      }
      for (const s of fullSkills) {
        expect(skills).toContain(s.name);
      }
    });

    afterAll(async () => {
      await uninstallSkills([TEST_AGENT], { global: true, yes: true });
    });
  });
}

// Internal lifecycle skills are excluded from profiles but may already exist
// from an older release. Default installs must not silently leave stale loader
// bytes, and must not overwrite a same-name copy of unknown provenance.
describe("explicit-only lifecycle migration", () => {
  const fx = makeInstallFixture("explicit-only-migration", { withCommands: false });

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());
  beforeEach(() => fx.cleanup());

  it("refreshes an older marked copy without introducing other internal skills", async () => {
    const staleDir = join(fx.skillsDir, "worktree");
    await mkdir(staleDir, { recursive: true });
    await writeFile(
      join(staleDir, "SKILL.md"),
      `---\ninstaller: arra-oracle-skills-cli v3.9.0-alpha.3\nname: worktree\ndescription: stale\n---\nBased on current HEAD\n`,
    );

    await installSkills([fx.agent], { global: true, profile: "minimal", yes: true });

    const refreshed = await readFile(join(staleDir, "SKILL.md"), "utf-8");
    expect(refreshed).toContain("installer: arra-oracle-skills-cli v");
    expect(refreshed).toContain("[internal]");
    expect(refreshed).toContain("Fail-closed invariant");
    expect(existsSync(join(fx.skillsDir, "workon"))).toBe(false);
    expect(existsSync(join(fx.skillsDir, "merged"))).toBe(false);
  });

  it("fails closed and leaves an unmarked same-name copy untouched", async () => {
    const existingDir = join(fx.skillsDir, "worktree");
    const existing = `---\nname: worktree\ndescription: user copy\n---\nkeep me\ninstaller: arra-oracle-skills-cli v1.0.0 is prose, not frontmatter\n`;
    await mkdir(existingDir, { recursive: true });
    await writeFile(join(existingDir, "SKILL.md"), existing);

    let message = "";
    try {
      await installSkills([fx.agent], { global: true, profile: "minimal", yes: true });
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain("Unmanaged explicit-only skill conflict");
    expect(await readFile(join(existingDir, "SKILL.md"), "utf-8")).toBe(existing);
    expect((await listSkillDirs(fx.skillsDir))).toEqual(["worktree"]);
  });

  it("does not downgrade a newer marked copy during an additive exact install", async () => {
    const newerDir = join(fx.skillsDir, "worktree");
    const newer = `---\ninstaller: arra-oracle-skills-cli v99.1.1\nname: worktree\ndescription: future copy\n---\nfuture sentinel\n`;
    await mkdir(newerDir, { recursive: true });
    await writeFile(join(newerDir, "SKILL.md"), newer);

    await installSkills([fx.agent], { global: true, skills: ["recap"], yes: true });

    expect(await readFile(join(newerDir, "SKILL.md"), "utf-8")).toBe(newer);
    expect(existsSync(join(fx.skillsDir, "recap", "SKILL.md"))).toBe(true);
  });

  it("backs up an unmanaged copy when its exact name is explicitly replaced", async () => {
    const existingDir = join(fx.skillsDir, "worktree");
    const existing = `---\nname: worktree\ndescription: user copy\n---\nrecoverable sentinel\n`;
    await mkdir(existingDir, { recursive: true });
    await writeFile(join(existingDir, "SKILL.md"), existing);
    const prefix = "arra-oracle-skills-replaced-";
    const before = new Set((await readdir(tmpdir(), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix))
      .map((entry) => entry.name));

    await installSkills([fx.agent], { global: true, skills: ["worktree"], yes: true });

    const installed = await readFile(join(existingDir, "SKILL.md"), "utf-8");
    expect(installed).toContain("installer: arra-oracle-skills-cli v");
    expect(installed).toContain("[internal]");
    const recovery = (await readdir(tmpdir(), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith(prefix) && !before.has(entry.name))
      .map((entry) => join(tmpdir(), entry.name))
      .find((path) => existsSync(join(path, "worktree", "SKILL.md")));
    expect(recovery).toBeTruthy();
    expect(await readFile(join(recovery!, "worktree", "SKILL.md"), "utf-8")).toBe(existing);
    await rm(recovery!, { recursive: true, force: true });
  });

  it("ignores a leftover internal directory that has no SKILL.md", async () => {
    const leftover = join(fx.skillsDir, "merged");
    await mkdir(leftover, { recursive: true });

    await installSkills([fx.agent], { global: true, profile: "minimal", yes: true });

    expect(existsSync(leftover)).toBe(true);
    expect(existsSync(join(fx.skillsDir, "recap", "SKILL.md"))).toBe(true);
  });

  it("removes a marked deprecated alias but preserves an unmarked copy", async () => {
    const marked = join(fx.skillsDir, "forward-lite");
    const unmarked = join(fx.skillsDir, "rrr-lite");
    await mkdir(marked, { recursive: true });
    await mkdir(unmarked, { recursive: true });
    await writeFile(join(marked, "SKILL.md"), `---\ninstaller: arra-oracle-skills-cli v2.0.10\nname: forward-lite\ndescription: stale\n---\n`);
    await writeFile(join(unmarked, "SKILL.md"), `---\nname: rrr-lite\ndescription: user copy\n---\n`);

    await installSkills([fx.agent], { global: true, profile: "minimal", yes: true });

    expect(existsSync(marked)).toBe(false);
    expect(existsSync(unmarked)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// e2e-features.test.ts — per-profile install counts + additive switch
// (useFlatFiles: true + commands dir; per-describe beforeEach cleanup)
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("e2e-features", { useFlatFiles: true });
  const { skillsDir: SKILLS_DIR, agent: TEST_AGENT } = fx;

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  describe("e2e: install with standard profile", () => {
    beforeEach(() => fx.cleanup());

    it("standard installs 16 skills", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        yes: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed.length).toBe(profiles.standard.include!.length);
      for (const name of profiles.standard.include!) {
        expect(installed).toContain(name);
      }
    });
  });

  describe("e2e: install with full profile", () => {
    beforeEach(() => fx.cleanup());

    it("full installs all stable skills (excludes lab-only and minimal-only)", async () => {
      const allSkills = await discoverSkills();
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "full",
        yes: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      const excludedCount = allSkills.filter(s => s.secret || s.zombie || s.explicitOnly).length;
      const labCount = labOnly.filter(s => allSkills.some(sk => sk.name === s)).length;
      const minimalOnlyCount = minimalOnly.filter(s => allSkills.some(sk => sk.name === s)).length;
      const expectedCount = allSkills.length - labCount - minimalOnlyCount - excludedCount;
      expect(installed.length).toBe(expectedCount);
      for (const name of labOnly) {
        expect(installed).not.toContain(name);
      }
      for (const name of minimalOnly) {
        expect(installed).not.toContain(name);
      }
    });
  });

  describe("e2e: install with lab profile", () => {
    beforeEach(() => fx.cleanup());

    it("lab installs all skills (excludes secrets + zombies + minimal-only)", async () => {
      const allSkills = await discoverSkills();
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "lab",
        yes: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      const excludedCount = allSkills.filter(s => s.secret || s.zombie || s.explicitOnly).length;
      const minimalOnlyCount = minimalOnly.filter(s => allSkills.some(sk => sk.name === s)).length;
      expect(installed.length).toBe(allSkills.length - excludedCount - minimalOnlyCount);
      for (const name of minimalOnly) {
        expect(installed).not.toContain(name);
      }
    });
  });

  describe("e2e: profile switch (full → standard) is additive", () => {
    beforeEach(() => fx.cleanup());

    // #254 Bug 5: install is additive only. Switching full → standard must
    // NOT silently drop full-only skills. Explicit `uninstall` is the only
    // way to remove.
    it("switching from full to standard keeps full-only skills", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "full",
        yes: true,
      });

      const allSkills = await discoverSkills();
      let installed = await listSkillDirs(SKILLS_DIR);
      const excludedCount = allSkills.filter(s => s.secret || s.zombie || s.explicitOnly).length;
      const labCount = labOnly.filter(s => allSkills.some(sk => sk.name === s)).length;
      const minimalOnlyCount = minimalOnly.filter(s => allSkills.some(sk => sk.name === s)).length;
      const fullCount = allSkills.length - labCount - minimalOnlyCount - excludedCount;
      expect(installed.length).toBe(fullCount);

      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        yes: true,
      });

      installed = await listSkillDirs(SKILLS_DIR);
      // Additive: count unchanged, all full skills still present.
      expect(installed.length).toBe(fullCount);
      for (const name of profiles.standard.include!) {
        expect(installed).toContain(name);
      }
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// integration.test.ts — installed OpenCode global skills/commands checks
// (no synthetic agent — reads real ~/.config/opencode paths; kept verbatim)
// ═════════════════════════════════════════════════════════════════════════════
{
  const HOME = homedir();
  const GLOBAL_OPENCODE_SKILLS = join(HOME, ".config/opencode/skills");
  const GLOBAL_OPENCODE_COMMANDS = join(HOME, ".config/opencode/commands");

  /**
   * Integration tests for installed skills
   *
   * Prerequisites: Run `bun run src/index.ts install --agent opencode --global --yes` first
   */
  describe("integration: OpenCode global install", () => {

    it("should have skills directory with SKILL.md files", async () => {
      if (!existsSync(GLOBAL_OPENCODE_SKILLS)) {
        console.log("Skipping: OpenCode skills not installed globally");
        return;
      }

      const skills = await readdir(GLOBAL_OPENCODE_SKILLS);
      const skillDirs = skills.filter(s => !s.startsWith('.') && !s.startsWith('_') && s !== 'VERSION.md');

      if (skillDirs.length === 0) {
        console.log("Skipping: No OpenCode skills installed");
        return;
      }

      expect(skillDirs.length).toBeGreaterThan(0);

      // Check trace skill exists (in minimal + standard + full profiles)
      expect(skillDirs).toContain("trace");

      // Check SKILL.md has full content
      const tracePath = join(GLOBAL_OPENCODE_SKILLS, "trace", "SKILL.md");
      expect(existsSync(tracePath)).toBe(true);

      const content = await readFile(tracePath, "utf-8");
      expect(content).toContain("G-SKLL");
      expect(content).toContain("installer: arra-oracle-skills-cli");
      expect(content).toContain("# /trace");
      expect(content.length).toBeGreaterThan(100);
    });

    it("should have commands directory with stub files", async () => {
      if (!existsSync(GLOBAL_OPENCODE_COMMANDS)) {
        console.log("Skipping: OpenCode commands not installed globally");
        return;
      }

      const commands = await readdir(GLOBAL_OPENCODE_COMMANDS);
      const cmdFiles = commands.filter(c => c.endsWith('.md'));

      if (cmdFiles.length === 0) {
        console.log("Skipping: No OpenCode commands installed");
        return;
      }

      expect(cmdFiles.length).toBeGreaterThan(0);

      // Check trace.md exists (in minimal + standard + full profiles)
      expect(cmdFiles).toContain("trace.md");
    });

    it("command stub should have correct format", async () => {
      const cmdPath = join(GLOBAL_OPENCODE_COMMANDS, "trace.md");
      if (!existsSync(cmdPath)) {
        console.log("Skipping: trace.md not installed");
        return;
      }

      const content = await readFile(cmdPath, "utf-8");

      // Should have G-CMD tag
      expect(content).toContain("G-CMD");

      // Should have allowed-tools
      expect(content).toContain("allowed-tools:");
      expect(content).toContain("- Bash");
      expect(content).toContain("- Read");
      expect(content).toContain("- Task");

      // Should point to skill file
      expect(content).toContain("skill file");
      expect(content).toContain(".config/opencode/skills/trace/SKILL.md");

      // Should tell AI to execute
      expect(content).toContain("Execute the `trace` skill");
      expect(content).toContain("$ARGUMENTS");

      // Should NOT have full content
      expect(content).not.toContain("## Step 0:");
      expect(content.length).toBeLessThan(1000);
    });

    it("command stub should point to correct skill path", async () => {
      const cmdPath = join(GLOBAL_OPENCODE_COMMANDS, "rrr.md");
      if (!existsSync(cmdPath)) {
        console.log("Skipping: rrr.md not installed");
        return;
      }

      const content = await readFile(cmdPath, "utf-8");
      const skillPath = join(GLOBAL_OPENCODE_SKILLS, "rrr/SKILL.md");

      // Stub should reference the actual skill path
      expect(content).toContain(skillPath);
    });

    it("all non-hidden arra-managed skills should have corresponding commands", async () => {
      if (!existsSync(GLOBAL_OPENCODE_SKILLS) || !existsSync(GLOBAL_OPENCODE_COMMANDS)) {
        console.log("Skipping: OpenCode not installed globally");
        return;
      }

      const skills = await readdir(GLOBAL_OPENCODE_SKILLS);
      const skillDirs = skills.filter(s => !s.startsWith('.') && !s.startsWith('_') && s !== 'VERSION.md');

      const commands = await readdir(GLOBAL_OPENCODE_COMMANDS);
      const cmdFiles = commands.filter(c => c.endsWith('.md')).map(c => c.replace('.md', ''));

      // Only arra-managed, non-hidden skills require command stubs
      // Hidden skills (e.g. mailbox) are installed without command stubs by design
      for (const skill of skillDirs) {
        const skillMdPath = join(GLOBAL_OPENCODE_SKILLS, skill, "SKILL.md");
        if (!existsSync(skillMdPath)) continue;

        const content = await readFile(skillMdPath, "utf-8");
        // Skip non-arra-managed skills (external / user-installed)
        if (!content.includes("installer: arra-oracle-skills-cli")) continue;
        // Skip hidden skills (they don't get command stubs)
        if (content.includes("hidden: true")) continue;

        expect(cmdFiles).toContain(skill);
      }
    });
  });

  // "integration: compiled stubs" removed — src/commands/ no longer exists.
  // The installer generates agent-specific command stubs inline at install time;
  // see "integration: OpenCode global install" above for the installed-stub checks.
}

// ═════════════════════════════════════════════════════════════════════════════
// installer-behavior.test.ts — install format by agent type
// (own TEST_OPENCODE_DIR / TEST_CLAUDE_DIR setup + $ from bun; kept verbatim)
// ═════════════════════════════════════════════════════════════════════════════
{
  const TEST_OPENCODE_DIR = join(process.cwd(), "test-opencode-install");
  const TEST_CLAUDE_DIR = join(process.cwd(), "test-claude-install");

  // Mock OpenCode install directory for testing
  const MOCK_OPENCODE_DIR = join(process.cwd(), "test-mock-opencode");

  describe("installer behavior by agent type", () => {
    beforeAll(async () => {
      await mkdir(TEST_OPENCODE_DIR, { recursive: true });
      await mkdir(TEST_CLAUDE_DIR, { recursive: true });
    });

    afterAll(async () => {
      if (existsSync(TEST_OPENCODE_DIR)) {
        await rm(TEST_OPENCODE_DIR, { recursive: true });
      }
      if (existsSync(TEST_CLAUDE_DIR)) {
        await rm(TEST_CLAUDE_DIR, { recursive: true });
      }
    });

    // Repo-level command stubs (src/commands/) no longer exist — the installer
    // generates agent-specific stubs inline at install time (installer.ts).

    describe("Claude Code install format", () => {
      it("should install directories with SKILL.md (full content)", async () => {
        const skillContent = await readFile(
          join(process.cwd(), "skills", "trace", "SKILL.md"),
          "utf-8"
        );

        // Claude Code expects full content
        expect(skillContent).toContain("# /trace");
        expect(skillContent).toContain("## Step 0: Timestamp");
        expect(skillContent).toContain("## Usage");
      });

      it("should include scripts directory if exists", async () => {
        const projectSkillDir = join(process.cwd(), "skills", "project");

        if (existsSync(join(projectSkillDir, "scripts"))) {
          const scripts = await readdir(join(projectSkillDir, "scripts"));
          expect(scripts.length).toBeGreaterThan(0);
        }
      });
    });

    describe("actual install format", () => {
      it("OpenCode installed file should be full skill format", async () => {
        // After install, OpenCode should have full skills in skills/ directory
        // Same format as other agents: {name}/SKILL.md
        const openCodePath = process.env.HOME + "/.config/opencode/skills";

        if (existsSync(openCodePath)) {
          const files = await readdir(openCodePath);
          const traceEntry = files.find(f => f === "trace");

          if (traceEntry === "trace") {
            const skillMdPath = join(openCodePath, "trace", "SKILL.md");
            if (existsSync(skillMdPath)) {
              const content = await readFile(skillMdPath, "utf-8");
              // Full skill SHOULD have content
              expect(content).toContain("# /trace");
              // Should have version injected
              expect(content).toContain("installer: arra-oracle-skills-cli");
            }
          }
        }
      });
    });

  });
}

// #459: `-y` promises "don't ask me". When no agent is detected the CLI used to
// fall through to the interactive picker anyway, hit EOF on stdin, resolve to
// nothing, and exit 0 having installed NOTHING — so CI and `/go update`
// automation read a silent no-op as success. A fresh machine with no ~/.claude
// is exactly the case the README's first command lands on.
describe("#459 — non-interactive install with no detected agents", () => {
  const cliPath = join(process.cwd(), "src/cli/index.ts");

  it("exits non-zero instead of silently installing nothing", () => {
    const emptyHome = mkdtempSync(join(tmpdir(), "arra-459-"));
    const proc = Bun.spawnSync(
      ["bun", cliPath, "install", "-g", "--profile", "minimal", "-y"],
      { env: { ...process.env, HOME: emptyHome }, stdin: "ignore" },
    );

    expect(proc.exitCode).not.toBe(0);
    // and it must say what to do about it, not just fail
    const out = proc.stdout.toString() + proc.stderr.toString();
    expect(out).toContain("-a claude-code");

    rmSync(emptyHome, { recursive: true, force: true });
  });

  it("still succeeds when an agent is named explicitly", () => {
    const home = mkdtempSync(join(tmpdir(), "arra-459-ok-"));
    const proc = Bun.spawnSync(
      ["bun", cliPath, "install", "-g", "--profile", "minimal", "-y", "-a", "claude-code"],
      { env: { ...process.env, HOME: home }, stdin: "ignore" },
    );

    expect(proc.exitCode).toBe(0);
    expect(existsSync(join(home, ".claude/skills/recap"))).toBe(true);

    rmSync(home, { recursive: true, force: true });
  });

  it("exits non-zero for an unknown exact skill name", () => {
    const home = mkdtempSync(join(tmpdir(), "arra-unknown-skill-"));
    const proc = Bun.spawnSync(
      ["bun", cliPath, "install", "-g", "-s", "no-such-skill", "-y", "-a", "claude-code"],
      { env: { ...process.env, HOME: home }, stdin: "ignore" },
    );
    const out = proc.stdout.toString() + proc.stderr.toString();
    expect(proc.exitCode).not.toBe(0);
    expect(out).toContain("Unknown skill: no-such-skill");
    expect(existsSync(join(home, ".claude/skills/no-such-skill"))).toBe(false);
    rmSync(home, { recursive: true, force: true });
  });
});
