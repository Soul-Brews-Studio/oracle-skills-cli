/**
 * Consolidated installer core suite. Merges (test bodies verbatim):
 *   - install-all.test.ts            — install ALL skills (default)
 *   - install-specific.test.ts       — install specific skills (--skill)
 *   - install-commands.test.ts       — command stub generation
 *   - install-uninstall.test.ts      — uninstall + #230 local-precedence + orphan cleanup
 *   - installer-scripts-copy.test.ts — fix #275 scripts/ + sibling file copy
 *
 * Boilerplate (temp dir + synthetic agent + register/cleanup) now comes from
 * ./helpers/install-fixture for the four single-agent files. installer-scripts-copy
 * uses TWO agents (global + local) + a local-project dir, so its original setup is
 * kept verbatim inside its own block scope. Each former file keeps its own block
 * scope so its module-level constants don't collide.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { readdir, readFile, rm, mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdtempSync, rmSync, readdirSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { agents } from "../src/cli/agents";
import { installSkills, uninstallSkills, discoverSkills } from "../src/cli/installer";
import type { AgentConfig } from "../src/cli/types";
import { makeInstallFixture, listSkillDirs } from "./helpers/install-fixture";

// ═════════════════════════════════════════════════════════════════════════════
// install-all.test.ts — install ALL skills when no --skill filter
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("all", { useFlatFiles: true });
  const { skillsDir: SKILLS_DIR, agent: TEST_AGENT } = fx;

  // Lites auto-removed when their full counterpart is also installed (post-install cleanup)
  // Migration removes deprecated lites (forward-lite, recap-lite, rrr-lite) post-install
  const DEPRECATED_LITES = new Set(['forward-lite', 'recap-lite', 'rrr-lite']);

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  describe("install all (default)", () => {
    beforeEach(() => fx.cleanup());

    it("installs ALL skills when no --skill filter", async () => {
      const allSkills = await discoverSkills();

      await installSkills([TEST_AGENT], { global: true, yes: true });

      const installed = await listSkillDirs(SKILLS_DIR);
      const expectedCount = allSkills.filter(s => !DEPRECATED_LITES.has(s.name)).length;
      expect(installed.length).toBe(expectedCount);
      for (const skill of allSkills) {
        if (DEPRECATED_LITES.has(skill.name)) continue;
        expect(installed).toContain(skill.name);
      }
    });

    it("each skill has SKILL.md with installer marker", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });

      const installed = await listSkillDirs(SKILLS_DIR);
      for (const name of installed) {
        const content = await readFile(join(SKILLS_DIR, name, "SKILL.md"), "utf-8");
        expect(content).toContain("installer: arra-oracle-skills-cli");
      }
    });

    it("each skill has version-prefixed description", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });

      const installed = await listSkillDirs(SKILLS_DIR);
      for (const name of installed) {
        const content = await readFile(join(SKILLS_DIR, name, "SKILL.md"), "utf-8");
        expect(content).toMatch(/v\d+\.\d+\.\d+(-[\w.]+)? G-SKLL(\s\[\w+\])? \|/);
      }
    });

    it("creates manifest with all skills", async () => {
      const allSkills = await discoverSkills();
      await installSkills([TEST_AGENT], { global: true, yes: true });

      const manifest = JSON.parse(await readFile(join(SKILLS_DIR, ".arra-oracle-skills.json"), "utf-8"));
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+(-[\w.]+)?$/);
      const expectedManifestCount = allSkills.filter(s => !DEPRECATED_LITES.has(s.name)).length;
      expect(manifest.skills.length).toBe(expectedManifestCount);
      expect(manifest.agent).toBe(TEST_AGENT);
    });

    it("creates VERSION.md", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });
      expect(existsSync(join(SKILLS_DIR, "VERSION.md"))).toBe(true);
    });

    it("reinstall overwrites existing skills", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });
      const first = await readFile(join(SKILLS_DIR, ".arra-oracle-skills.json"), "utf-8");

      await installSkills([TEST_AGENT], { global: true, yes: true });
      const second = await readFile(join(SKILLS_DIR, ".arra-oracle-skills.json"), "utf-8");

      // Timestamps should differ
      expect(JSON.parse(first).installedAt).not.toBe(JSON.parse(second).installedAt);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// install-specific.test.ts — install specific skills (--skill)
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("specific", { useFlatFiles: true });
  const { skillsDir: SKILLS_DIR, agent: TEST_AGENT } = fx;

  const DEPRECATED_LITES = 3; // forward-lite, recap-lite, rrr-lite migrated away post-install

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  describe("install specific skills (--skill)", () => {
    beforeEach(() => fx.cleanup());

    it("installs only named skills", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["recap", "rrr"],
        yes: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed).toEqual(["recap", "rrr"]);
    });

    it("installs single skill", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["trace"],
        yes: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed).toEqual(["trace"]);
      const content = await readFile(join(SKILLS_DIR, "trace", "SKILL.md"), "utf-8");
      expect(content).toContain("installer: arra-oracle-skills-cli");
    });

    it("ignores unknown skill names gracefully", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["recap", "nonexistent-skill"],
        yes: true,
      });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed).toEqual(["recap"]);
    });

    it("does not remove existing skills when adding specific ones", async () => {
      // Install all first
      await installSkills([TEST_AGENT], { global: true, yes: true });
      const allSkills = await discoverSkills();
      let installed = await listSkillDirs(SKILLS_DIR);
      expect(installed.length).toBe(allSkills.length - DEPRECATED_LITES);

      // Install specific — should NOT remove others
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["recap"],
        yes: true,
      });

      installed = await listSkillDirs(SKILLS_DIR);
      // Still has all skills (specific install is additive, not destructive)
      expect(installed.length).toBe(allSkills.length - DEPRECATED_LITES);
    });

    it("manifest lists only installed skills", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["recap", "rrr", "trace"],
        yes: true,
      });

      const manifest = JSON.parse(await readFile(join(SKILLS_DIR, ".arra-oracle-skills.json"), "utf-8"));
      expect(manifest.skills.sort()).toEqual(["recap", "rrr", "trace"]);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// install-commands.test.ts — command stub generation
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("cmds", { useFlatFiles: true });
  const { commandsDir: COMMANDS_DIR, dir: TEST_DIR, agent: TEST_AGENT, config: testAgentConfig } = fx;

  async function listCommandFiles(dir: string): Promise<string[]> {
    if (!existsSync(dir)) return [];
    return (await readdir(dir)).filter((f) => f.endsWith(".md")).sort();
  }

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  describe("command stubs", () => {
    beforeEach(() => fx.cleanup());

    it("installs command stubs for non-hidden skills with --commands", async () => {
      const allSkills = await discoverSkills();
      await installSkills([TEST_AGENT], { global: true, yes: true, commands: true });

      const commands = await listCommandFiles(COMMANDS_DIR);
      const hiddenNames = new Set(allSkills.filter((s) => s.hidden).map((s) => s.name));

      for (const skill of allSkills) {
        if (hiddenNames.has(skill.name)) {
          expect(commands).not.toContain(`${skill.name}.md`);
        } else {
          expect(commands).toContain(`${skill.name}.md`);
        }
      }
    });

    it("does NOT install command stubs without --commands for commandsOptIn agents", async () => {
      const optInAgent = "test-optin" as any;
      const optInConfig: AgentConfig = {
        ...testAgentConfig,
        name: "test-optin",
        displayName: "Test OptIn",
        commandsOptIn: true,
        globalCommandsDir: join(TEST_DIR, "optin-commands"),
      };
      (agents as any)[optInAgent] = optInConfig;
      await mkdir(join(TEST_DIR, "optin-commands"), { recursive: true });

      await installSkills([optInAgent], { global: true, yes: true });

      const commands = await listCommandFiles(join(TEST_DIR, "optin-commands"));
      expect(commands.length).toBe(0);

      delete (agents as any)[optInAgent];
    });

    it("command stubs have correct frontmatter", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true, commands: true });

      const commands = await listCommandFiles(COMMANDS_DIR);
      expect(commands.length).toBeGreaterThan(0);

      const content = await readFile(join(COMMANDS_DIR, commands[0]), "utf-8");
      expect(content).toMatch(/^---/);
      expect(content).toMatch(/description:/);
      expect(content).toContain("$ARGUMENTS");
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// install-uninstall.test.ts — uninstall + #230 local-precedence + orphan cleanup
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("uninstall", { useFlatFiles: true });
  // The #230 shield resolves local skills via join(process.cwd(), agent.skillsDir),
  // and LOCAL_SKILLS_DIR below hardcodes join(cwd, "test-skills"). The original config
  // used skillsDir: "test-skills", so restore that exact value (the fixture default
  // "test-skills-uninstall" would not match) to preserve the shield tests' behaviour.
  fx.config.skillsDir = "test-skills";
  const { skillsDir: SKILLS_DIR, agent: TEST_AGENT } = fx;

  const DEPRECATED_LITES = 3; // forward-lite, recap-lite, rrr-lite migrated away post-install

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  describe("uninstall all", () => {
    beforeEach(() => fx.cleanup());

    it("removes all oracle skills", async () => {
      const allSkills = await discoverSkills();
      await installSkills([TEST_AGENT], { global: true, yes: true });

      const result = await uninstallSkills([TEST_AGENT], { global: true, yes: true });
      expect(result.removed).toBe(allSkills.length - DEPRECATED_LITES);

      const remaining = await listSkillDirs(SKILLS_DIR);
      expect(remaining.length).toBe(0);
    });
  });

  describe("uninstall specific skills", () => {
    beforeEach(() => fx.cleanup());

    it("removes only named skills", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });
      const allSkills = await discoverSkills();

      await uninstallSkills([TEST_AGENT], {
        global: true,
        skills: ["recap", "trace"],
        yes: true,
      });

      const remaining = await listSkillDirs(SKILLS_DIR);
      expect(remaining).not.toContain("recap");
      expect(remaining).not.toContain("trace");
      expect(remaining.length).toBe(allSkills.length - DEPRECATED_LITES - 2);
    });
  });

  describe("uninstall preserves external skills", () => {
    beforeEach(() => fx.cleanup());

    it("skips skills without installer marker", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });

      // Create external skill (no marker)
      const externalDir = join(SKILLS_DIR, "external-skill");
      await mkdir(externalDir, { recursive: true });
      await writeFile(join(externalDir, "SKILL.md"), "# External\n\nNo marker.");

      await uninstallSkills([TEST_AGENT], { global: true, yes: true });

      expect(existsSync(externalDir)).toBe(true);
      const remaining = await listSkillDirs(SKILLS_DIR);
      expect(remaining).toEqual(["external-skill"]);

      await rm(externalDir, { recursive: true });
    });

    it("removes explicitly named external skills with --skill", async () => {
      await installSkills([TEST_AGENT], { global: true, yes: true });

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

  describe("#230 local-skill-precedence shield", () => {
    const LOCAL_SKILLS_DIR = join(process.cwd(), "test-skills");

    beforeEach(async () => {
      await fx.cleanup();
      if (existsSync(LOCAL_SKILLS_DIR)) await rm(LOCAL_SKILLS_DIR, { recursive: true });
    });

    afterAll(async () => {
      if (existsSync(LOCAL_SKILLS_DIR)) await rm(LOCAL_SKILLS_DIR, { recursive: true });
    });

    it("skips global install of a skill shadowed by a non-ours local skill", async () => {
      // Seed a local user-authored skill at <cwd>/test-skills/recap/ (NOT ours — no marker)
      const localRecap = join(LOCAL_SKILLS_DIR, "recap");
      await mkdir(localRecap, { recursive: true });
      await writeFile(join(localRecap, "SKILL.md"), "# local recap\n\nUser's own recap.\n");

      await installSkills([TEST_AGENT], { global: true, yes: true });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed).not.toContain("recap");
      // Other skills should still install
      expect(installed.length).toBeGreaterThan(0);
    });

    it("does NOT skip if the local skill is ours (installer marker present)", async () => {
      const localTrace = join(LOCAL_SKILLS_DIR, "trace");
      await mkdir(localTrace, { recursive: true });
      await writeFile(
        join(localTrace, "SKILL.md"),
        "---\ninstaller: arra-oracle-skills-cli v1.0.0\n---\n# trace\n"
      );

      await installSkills([TEST_AGENT], { global: true, yes: true });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed).toContain("trace");
    });

    it("--force-global installs the skill anyway", async () => {
      const localRrr = join(LOCAL_SKILLS_DIR, "rrr");
      await mkdir(localRrr, { recursive: true });
      await writeFile(join(localRrr, "SKILL.md"), "# local rrr\n");

      await installSkills([TEST_AGENT], { global: true, yes: true, forceGlobal: true });

      const installed = await listSkillDirs(SKILLS_DIR);
      expect(installed).toContain("rrr");
    });

  });

  describe("orphan cleanup on install", () => {
    beforeEach(() => fx.cleanup());

    it("moves orphaned oracle skills to trash on reinstall", async () => {
      // Install all skills
      await installSkills([TEST_AGENT], { global: true, yes: true });

      // Simulate an orphan: a skill that has our marker but doesn't exist in source
      const orphanDir = join(SKILLS_DIR, "deleted-skill");
      await mkdir(orphanDir, { recursive: true });
      await writeFile(
        join(orphanDir, "SKILL.md"),
        "---\ninstaller: arra-oracle-skills-cli v1.0.0\n---\n# Deleted\n"
      );

      // Reinstall — orphan should be cleaned up
      await installSkills([TEST_AGENT], { global: true, yes: true });

      expect(existsSync(orphanDir)).toBe(false);
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// installer-scripts-copy.test.ts — fix #275 scripts/ + sibling file copy
//
// Uses TWO agents (global + local) + a local-project dir, which makeInstallFixture
// does not model, so the original setup is kept verbatim inside this block scope.
//
// Tests for fix #275 — installer must copy scripts/ subdirectories and
// sibling files (DEEP.md, etc.) alongside SKILL.md when installing skills.
//
// Root cause: src/skills/skills-list/ had SKILL.md but no scripts/ subdir,
// so skills-list.py was never installed, leaving the skill broken.
//
// Fix: add scripts/skills-list.py to src/skills/skills-list/scripts/ so that
// cpr() (fs mode) and writeSkillToDir() (VFS mode) both pick it up.
// ═════════════════════════════════════════════════════════════════════════════
{
  const TEST_DIR = join(tmpdir(), `arra-scripts-copy-${Date.now()}`);
  const SKILLS_DIR = join(TEST_DIR, "skills");
  const COMMANDS_DIR = join(TEST_DIR, "commands");
  const TEST_AGENT_GLOBAL = "test-scripts-global" as any;
  const TEST_AGENT_LOCAL = "test-scripts-local" as any;

  const globalAgentConfig: AgentConfig = {
    name: TEST_AGENT_GLOBAL,
    displayName: "Test Scripts Global",
    skillsDir: "test-scripts-skills",
    globalSkillsDir: SKILLS_DIR,
    commandsDir: "test-scripts-commands",
    globalCommandsDir: COMMANDS_DIR,
    useFlatFiles: false,
    detectInstalled: () => true,
  };

  // For local install, installer uses join(process.cwd(), agent.skillsDir)
  // So skillsDir must be a relative-style path that will resolve under cwd
  const LOCAL_RELATIVE_SKILLS = join(TEST_DIR, "local-project", "test-scripts-skills");
  const localAgentConfig: AgentConfig = {
    name: TEST_AGENT_LOCAL,
    displayName: "Test Scripts Local",
    // Use a path relative to cwd — we set globalSkillsDir to the same absolute
    // path and force global: false so the installer uses `join(cwd, skillsDir)`.
    // Instead, use globalSkillsDir and global:true for the local test to keep it simple.
    skillsDir: "test-scripts-local-skills",
    globalSkillsDir: LOCAL_RELATIVE_SKILLS,
    commandsDir: "test-scripts-local-commands",
    globalCommandsDir: join(TEST_DIR, "local-project", "test-scripts-commands"),
    detectInstalled: () => true,
  };

  async function cleanup() {
    if (existsSync(SKILLS_DIR)) await rm(SKILLS_DIR, { recursive: true });
    if (existsSync(COMMANDS_DIR)) await rm(COMMANDS_DIR, { recursive: true });
    await mkdir(SKILLS_DIR, { recursive: true });
    await mkdir(COMMANDS_DIR, { recursive: true });
  }

  beforeAll(async () => {
    await mkdir(TEST_DIR, { recursive: true });
    await mkdir(join(TEST_DIR, "local-project"), { recursive: true });
    (agents as any)[TEST_AGENT_GLOBAL] = globalAgentConfig;
    (agents as any)[TEST_AGENT_LOCAL] = localAgentConfig;
  });

  afterAll(async () => {
    delete (agents as any)[TEST_AGENT_GLOBAL];
    delete (agents as any)[TEST_AGENT_LOCAL];
    if (existsSync(TEST_DIR)) await rm(TEST_DIR, { recursive: true });
  });

  describe("fix #275 — scripts-list skill has scripts/ in source", () => {
    it("src/skills/skills-list/scripts/skills-list.py exists in source", () => {
      const scriptPath = join(
        process.cwd(),
        "src/skills/.archive/skills-list/scripts/skills-list.py"
      );
      expect(existsSync(scriptPath)).toBe(true);
    });

    it("skills-list.py is executable Python script", async () => {
      const scriptPath = join(
        process.cwd(),
        "src/skills/.archive/skills-list/scripts/skills-list.py"
      );
      const content = await Bun.file(scriptPath).text();
      expect(content).toContain("#!/usr/bin/env python3");
      expect(content).toContain("skills");
    });
  });

  describe("fix #275 — installer copies scripts/ subdirectory (global install)", () => {
    beforeEach(cleanup);

    it("installs scripts/skills-list.py alongside SKILL.md", async () => {
      await installSkills([TEST_AGENT_GLOBAL], {
        global: true,
        skills: ["skills-list"],
        yes: true,
      });

      const skillDir = join(SKILLS_DIR, "skills-list");
      const skillMd = join(skillDir, "SKILL.md");
      const scriptFile = join(skillDir, "scripts", "skills-list.py");

      expect(existsSync(skillMd)).toBe(true);
      expect(existsSync(scriptFile)).toBe(true);
    });

    it("installed scripts/skills-list.py has correct content", async () => {
      await installSkills([TEST_AGENT_GLOBAL], {
        global: true,
        skills: ["skills-list"],
        yes: true,
      });

      const scriptFile = join(SKILLS_DIR, "skills-list", "scripts", "skills-list.py");
      const content = await Bun.file(scriptFile).text();
      expect(content).toContain("#!/usr/bin/env python3");
      expect(content).toContain("List all skills");
    });

    it("other skills with scripts/ also get scripts/ installed", async () => {
      // team-agents has scripts/ — verify it installs correctly
      await installSkills([TEST_AGENT_GLOBAL], {
        global: true,
        skills: ["team-agents"],
        yes: true,
      });

      const skillDir = join(SKILLS_DIR, "team-agents");
      const scriptsDir = join(skillDir, "scripts");
      expect(existsSync(scriptsDir)).toBe(true);

      // Should have at least one script file
      const { readdirSync } = await import("fs");
      const files = readdirSync(scriptsDir);
      expect(files.length).toBeGreaterThan(0);
    });

    it("dig skill scripts/ subdir is also installed", async () => {
      await installSkills([TEST_AGENT_GLOBAL], {
        global: true,
        skills: ["dig"],
        yes: true,
      });

      const scriptFile = join(SKILLS_DIR, "dig", "scripts", "dig.py");
      expect(existsSync(scriptFile)).toBe(true);
    });

    it("SKILL.md content is modified (version injected) but script files are copied verbatim", async () => {
      await installSkills([TEST_AGENT_GLOBAL], {
        global: true,
        skills: ["skills-list"],
        yes: true,
      });

      // SKILL.md should have the installer marker (modified)
      const skillMd = await Bun.file(join(SKILLS_DIR, "skills-list", "SKILL.md")).text();
      expect(skillMd).toContain("installer: arra-oracle-skills-cli");

      // Script should be unmodified (verbatim copy)
      const installedScript = await Bun.file(
        join(SKILLS_DIR, "skills-list", "scripts", "skills-list.py")
      ).text();
      const sourceScript = await Bun.file(
        join(process.cwd(), "src/skills/.archive/skills-list/scripts/skills-list.py")
      ).text();
      expect(installedScript).toBe(sourceScript);
    });
  });

  describe("fix #275 — installer copies scripts/ subdirectory (local project install)", () => {
    beforeEach(async () => {
      if (existsSync(LOCAL_RELATIVE_SKILLS)) await rm(LOCAL_RELATIVE_SKILLS, { recursive: true });
      await mkdir(LOCAL_RELATIVE_SKILLS, { recursive: true });
    });

    it("installs scripts/skills-list.py on local project install (via globalSkillsDir)", async () => {
      // Use global: true with the local agent's globalSkillsDir pointing to our test dir
      await installSkills([TEST_AGENT_LOCAL], {
        global: true,
        skills: ["skills-list"],
        yes: true,
      });

      const scriptFile = join(LOCAL_RELATIVE_SKILLS, "skills-list", "scripts", "skills-list.py");
      expect(existsSync(scriptFile)).toBe(true);
    });
  });

  describe("fix #275 — sibling non-script files are also copied", () => {
    beforeEach(cleanup);

    it("rrr skill HOSTS.md is installed alongside SKILL.md", async () => {
      const hostsMdSrc = join(process.cwd(), "skills/rrr/HOSTS.md");
      if (!existsSync(hostsMdSrc)) return

      await installSkills([TEST_AGENT_GLOBAL], {
        global: true,
        skills: ["rrr"],
        yes: true,
      });

      const hostsMdDest = join(SKILLS_DIR, "rrr", "HOSTS.md");
      expect(existsSync(hostsMdDest)).toBe(true);
    });
  });
}

// #458: the manifest is a receipt, and it used to record only what THIS run
// installed. Installing standard (20) then `-s dream` rewrote the manifest down
// to 8 entries while 21 skills sat on disk — `about` reads that file, so the
// tool reported a set that contradicted its own directory. It is now derived
// from disk, which cannot drift regardless of which flags produced the install.
describe("#458 — manifest reflects the directory, not just the last run", () => {
  const cliPath = join(process.cwd(), "src/cli/index.ts");

  it("keeps earlier skills after a follow-up -s install", () => {
    const home = mkdtempSync(join(tmpdir(), "arra-458-"));
    const run = (...args: string[]) =>
      Bun.spawnSync(["bun", cliPath, "install", "-g", "-y", "-a", "claude-code", ...args], {
        env: { ...process.env, HOME: home },
        stdin: "ignore",
      });

    run("-p", "standard");
    run("-s", "dream");

    const skillsDir = join(home, ".claude/skills");
    const onDisk = readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith("."))
      .map((d) => d.name)
      .sort();
    const manifest = JSON.parse(
      readFileSync(join(skillsDir, ".arra-oracle-skills.json"), "utf-8"),
    );

    // the point of the fix: the receipt matches the directory it describes
    expect(manifest.skills.sort()).toEqual(onDisk);
    // and the earlier profile did not vanish from the record
    expect(manifest.skills).toContain("recap");
    expect(manifest.skills).toContain("dream");

    rmSync(home, { recursive: true, force: true });
  });
});
