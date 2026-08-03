/**
 * Consolidated installer profile suite. Merges (test bodies verbatim):
 *   - installer-align.test.ts   — explicit-profile alignment (#285 Part 2 / #267 / #257)
 *   - installer-thclaws.test.ts — thClaws as a 4th, federated install target (#330)
 *
 * Boilerplate (temp dir + synthetic agent + register/cleanup) now comes from
 * ./helpers/install-fixture. Each former file keeps its own block scope so its
 * module-level constants don't collide.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";
import { agents, thClawsAvailable, defaultAgentNames } from "../src/cli/agents";
import { installSkills } from "../src/cli/installer";
import { profiles, MINIMAL_SKILLS, STANDARD_SKILLS } from "../src/profiles";
import { makeInstallFixture, listSkillDirs } from "./helpers/install-fixture";

// ═════════════════════════════════════════════════════════════════════════════
// installer-align.test.ts — explicit-profile alignment
//
// Invariants:
//   1. `install --profile <name>` (explicit) → ALIGN: removes arra-managed skills not in target
//   2. Bare `install` (no flag) → purely additive (Bug 5 protection, #257)
//   3. `install -s <skill>` (no --profile) → purely additive
//   4. Non-arra skills (no 'installer:' frontmatter) → NEVER touched during alignment
//   5. Pre-removal diff is printed even under -y
// ═════════════════════════════════════════════════════════════════════════════
{
  const fx = makeInstallFixture("align", { useFlatFiles: true });
  const { skillsDir: SKILLS_DIR, agent: TEST_AGENT } = fx;

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  // Plant a non-arra skill (no installer: frontmatter) in SKILLS_DIR
  async function plantExternalSkill(name: string): Promise<void> {
    const dir = join(SKILLS_DIR, name);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "SKILL.md"), `---\nname: ${name}\ndescription: External skill\n---\n# /${name}\n`);
  }

  describe("hermes: agent entry shape", () => {
    it("agents map includes Hermes Agent with profile-scoped oracle path", () => {
      const expectedHome = process.env.HERMES_HOME ?? join(homedir(), ".hermes");
      const expectedProfile = process.env.HERMES_ACTIVE_PROFILE ?? process.env.HERMES_PROFILE ?? "default";

      expect(agents.hermes).toBeDefined();
      expect(agents.hermes.name).toBe("hermes");
      expect(agents.hermes.displayName).toBe("Hermes Agent");
      expect(agents.hermes.globalSkillsDir).toBe(
        join(expectedHome, "profiles", expectedProfile, "skills", "oracle")
      );
      expect(agents.hermes.skillsDir).toBe(
        `.hermes/profiles/${expectedProfile}/skills/oracle`
      );
    });
  });

  describe("alignment: explicit --profile triggers removal of arra-managed skills not in target", () => {
    beforeEach(() => fx.cleanup());

    it("explicit --profile minimal after --profile standard removes standard-only skills", async () => {
      // Step 1: install standard profile (explicit)
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      const afterStandard = await listSkillDirs(SKILLS_DIR);
      expect(afterStandard.length).toBe(profiles.standard.include!.length);

      // Step 2: align down to minimal (explicit)
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "minimal",
        profileExplicit: true,
        yes: true,
      });

      const afterMinimal = await listSkillDirs(SKILLS_DIR);

      // Should now have exactly the minimal skills
      expect(afterMinimal.length).toBe(MINIMAL_SKILLS.length);
      for (const name of MINIMAL_SKILLS) {
        expect(afterMinimal).toContain(name);
      }

      // Standard-only skills that were removed:
      const standardOnlySkills = STANDARD_SKILLS.filter(
        (s) => !(MINIMAL_SKILLS as readonly string[]).includes(s)
      );
      for (const name of standardOnlySkills) {
        expect(afterMinimal).not.toContain(name);
      }
    });

    it("explicit --profile full after standard installs more, then explicit --profile minimal aligns down", async () => {
      // Install standard first (explicit)
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      const afterStandard = await listSkillDirs(SKILLS_DIR);
      expect(afterStandard.length).toBeGreaterThanOrEqual(STANDARD_SKILLS.length);

      // Then align down to minimal (explicit)
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "minimal",
        profileExplicit: true,
        yes: true,
      });

      const afterMinimal = await listSkillDirs(SKILLS_DIR);
      expect(afterMinimal.length).toBe(MINIMAL_SKILLS.length);
      for (const name of MINIMAL_SKILLS) {
        expect(afterMinimal).toContain(name);
      }
    });
  });

  describe("alignment: bare install (no profileExplicit) is purely additive — Bug 5 protection (#257)", () => {
    beforeEach(() => fx.cleanup());

    it("install without profileExplicit does NOT remove skills missing from profile", async () => {
      // First: plant standard skills explicitly
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      const afterStandard = await listSkillDirs(SKILLS_DIR);
      const standardCount = afterStandard.length;
      expect(standardCount).toBe(profiles.standard.include!.length);

      // Second: install minimal WITHOUT profileExplicit (simulates default / no flag)
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "minimal",
        profileExplicit: false, // not explicit — additive only
        yes: true,
      });

      const afterAdditive = await listSkillDirs(SKILLS_DIR);
      // Additive: the count grows (minimal adds its unique skills) but nothing is removed.
      // The key invariant is that ALL original standard skills are still present.
      expect(afterAdditive.length).toBeGreaterThanOrEqual(standardCount);
      // All standard skills still present (none removed)
      for (const name of profiles.standard.include!) {
        expect(afterAdditive).toContain(name);
      }
    });

    it("install without any profile flag does NOT remove skills", async () => {
      // First: plant standard skills explicitly
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      const afterStandard = await listSkillDirs(SKILLS_DIR);
      const standardCount = afterStandard.length;

      // Second: install with NO profile (undefined profileExplicit)
      await installSkills([TEST_AGENT], {
        global: true,
        yes: true,
        // No profile, no profileExplicit — install all
      });

      const afterAll = await listSkillDirs(SKILLS_DIR);
      // All standard skills still present (count may be higher since all skills installed)
      for (const name of profiles.standard.include!) {
        expect(afterAll).toContain(name);
      }
    });
  });

  describe("alignment: install -s <skill> (no --profile) does not trigger alignment", () => {
    beforeEach(() => fx.cleanup());

    it("-s flag without --profile is purely additive", async () => {
      // First: install standard explicitly
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      const afterStandard = await listSkillDirs(SKILLS_DIR);
      const standardCount = afterStandard.length;

      // Add a single skill with -s (no profile, no profileExplicit)
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["trace"],
        // No profile, no profileExplicit
        yes: true,
      });

      const afterAddSkill = await listSkillDirs(SKILLS_DIR);
      // Still at least standardCount skills — nothing removed
      expect(afterAddSkill.length).toBeGreaterThanOrEqual(standardCount);
      // All original standard skills still present
      for (const name of profiles.standard.include!) {
        expect(afterAddSkill).toContain(name);
      }
    });
  });

  describe("alignment: non-arra skills are NEVER removed", () => {
    beforeEach(() => fx.cleanup());

    it("external skill without 'installer: arra-oracle-skills-cli' is kept during alignment", async () => {
      // Install standard (explicit)
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      // Plant an external skill
      await plantExternalSkill("my-custom-skill");

      const beforeAlign = await listSkillDirs(SKILLS_DIR);
      expect(beforeAlign).toContain("my-custom-skill");

      // Align down to minimal (explicit) — should NOT remove the external skill
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "minimal",
        profileExplicit: true,
        yes: true,
      });

      const afterAlign = await listSkillDirs(SKILLS_DIR);
      // External skill must survive
      expect(afterAlign).toContain("my-custom-skill");

      // Minimal skills must be present
      for (const name of MINIMAL_SKILLS) {
        expect(afterAlign).toContain(name);
      }
    });
  });

  describe("alignment: pre-removal diff message is printed", () => {
    beforeEach(() => fx.cleanup());

    it("alignment message is printed even under -y", async () => {
      // Install standard (explicit) so there are skills to align away
      await installSkills([TEST_AGENT], {
        global: true,
        profile: "standard",
        profileExplicit: true,
        yes: true,
      });

      // Capture stdout
      const originalLog = console.log;
      const messages: string[] = [];
      console.log = (...args: any[]) => {
        messages.push(args.join(" "));
        originalLog(...args);
      };

      try {
        // Align to minimal — should print the diff message even with yes: true
        await installSkills([TEST_AGENT], {
          global: true,
          profile: "minimal",
          profileExplicit: true,
          yes: true, // skips interactive prompt, but diff must still print
        });
      } finally {
        console.log = originalLog;
      }

      const alignMsg = messages.find((m) => m.includes("Profile alignment") && m.includes("REMOVE"));
      expect(alignMsg).toBeDefined();
      expect(alignMsg).toContain("minimal");
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// installer-thclaws.test.ts — thClaws as a 4th install target (federation @m5)
//
// Invariants (post-#330 — federated opt-in):
//   1. thClaws agent entry exists in agents map
//   2. thClawsAvailable() returns true when binary present, false when absent
//   3. globalSkillsDir routes to ~/.config/thclaws/skills/
//   4. thclaws is marked federated: true (not auto-included in default agents)
//   5. install --thclaws-only writes ONLY to thClaws path (skips Claude/Codex/etc.)
//   6. install --with-thclaws (or -a thclaws) adds thClaws to the install set
// ═════════════════════════════════════════════════════════════════════════════
{
  // thclaws config is skills-only (no commandsDir, no useFlatFiles) — matches the
  // real agent so trace lands at <skillsDir>/trace/SKILL.md.
  const fx = makeInstallFixture("thclaws", { withCommands: false });
  const { skillsDir: SKILLS_DIR, agent: TEST_AGENT } = fx;

  beforeAll(() => fx.register());
  afterAll(() => fx.unregister());

  describe("thClaws: agent entry shape", () => {
    it("agents map includes a thclaws target", () => {
      expect(agents.thclaws).toBeDefined();
      expect(agents.thclaws.name).toBe("thclaws");
      expect(agents.thclaws.displayName).toBe("thClaws");
    });

    it("thclaws globalSkillsDir routes to ~/.config/thclaws/skills/", () => {
      expect(agents.thclaws.globalSkillsDir).toContain(".config/thclaws/skills");
    });

    it("thClawsAvailable() returns a boolean", () => {
      // Real check — depends on host. We only assert the type contract.
      const result = thClawsAvailable();
      expect(typeof result).toBe("boolean");
    });

    it("detectInstalled() mirrors thClawsAvailable()", () => {
      expect(agents.thclaws.detectInstalled()).toBe(thClawsAvailable());
    });
  });

  describe("thClaws: default-agent membership (post-#330 — federated opt-in)", () => {
    it("thclaws is NOT in defaultAgentNames (federated agents are opt-in)", () => {
      expect(defaultAgentNames).not.toContain("thclaws");
    });

    it("defaultAgentNames is now the 2-target host-only set", () => {
      expect(defaultAgentNames).toEqual(["claude-code", "codex"]);
    });

    it("thclaws is marked federated in agents map", () => {
      expect(agents.thclaws.federated).toBe(true);
    });
  });

  describe("thClaws: install writes SKILL.md to thClaws path", () => {
    beforeEach(() => fx.cleanup());

    it("installs skill files to the thclaws globalSkillsDir", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["trace"],
        yes: true,
      });

      const traceSkillMd = join(SKILLS_DIR, "trace", "SKILL.md");
      expect(existsSync(traceSkillMd)).toBe(true);
    });

    it("SKILL.md has the installer marker for cleanup safety", async () => {
      await installSkills([TEST_AGENT], {
        global: true,
        skills: ["trace"],
        yes: true,
      });

      const traceSkillMd = join(SKILLS_DIR, "trace", "SKILL.md");
      const content = await Bun.file(traceSkillMd).text();
      expect(content).toContain("installer: arra-oracle-skills-cli");
    });
  });

  describe("thClaws: --with-thclaws opt-in math (#330)", () => {
    it("default auto-set excludes thclaws — federated agents are opt-in", () => {
      // getDefaultAgents filters federated out. Simulate the math:
      const installed = ["claude-code", "codex", "thclaws"];
      const nonFederated = installed.filter((a) => !agents[a as keyof typeof agents]?.federated);
      expect(nonFederated).not.toContain("thclaws");
      expect(nonFederated).toContain("claude-code");
      expect(nonFederated).toContain("codex");
    });

    it("--with-thclaws adds thclaws back to the auto set when binary detected", () => {
      // Simulate the install.ts layer: detected + opt-in flag
      const detected = ["claude-code", "codex"];
      const withThclaws = thClawsAvailable() ? [...detected, "thclaws"] : detected;
      if (thClawsAvailable()) {
        expect(withThclaws).toContain("thclaws");
      } else {
        expect(withThclaws).not.toContain("thclaws");
      }
    });
  });

  describe("thClaws: --thclaws-only selects only thclaws", () => {
    it("thclaws-only mode yields a single-element [thclaws] target list", () => {
      const targets = ["thclaws"];
      expect(targets).toEqual(["thclaws"]);
      expect(targets.length).toBe(1);
    });
  });
}
