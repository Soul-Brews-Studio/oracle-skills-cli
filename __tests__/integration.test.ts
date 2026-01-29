import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { readFile, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { homedir } from "os";

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
    const skillDirs = skills.filter(s => !s.startsWith('.') && s !== 'VERSION.md');

    if (skillDirs.length === 0) {
      console.log("Skipping: No OpenCode skills installed");
      return;
    }

    expect(skillDirs.length).toBeGreaterThan(0);

    // Check rrr skill exists
    expect(skillDirs).toContain("rrr");

    // Check SKILL.md has full content
    const rrrPath = join(GLOBAL_OPENCODE_SKILLS, "rrr", "SKILL.md");
    expect(existsSync(rrrPath)).toBe(true);

    const content = await readFile(rrrPath, "utf-8");
    expect(content).toContain("G-SKLL");
    expect(content).toContain("installer: oracle-skills-cli");
    expect(content).toContain("# RRR");
    expect(content).toContain("## Step 0:");
    expect(content.length).toBeGreaterThan(500);
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

    // Check rrr.md exists
    expect(cmdFiles).toContain("rrr.md");
  });

  it("command stub should have correct format", async () => {
    const cmdPath = join(GLOBAL_OPENCODE_COMMANDS, "rrr.md");
    if (!existsSync(cmdPath)) {
      console.log("Skipping: rrr.md not installed");
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
    expect(content).toContain(".config/opencode/skills/rrr/SKILL.md");

    // Should tell AI to execute
    expect(content).toContain("Execute the `rrr` skill");
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

  it("all skills should have corresponding commands", async () => {
    if (!existsSync(GLOBAL_OPENCODE_SKILLS) || !existsSync(GLOBAL_OPENCODE_COMMANDS)) {
      console.log("Skipping: OpenCode not installed globally");
      return;
    }

    const skills = await readdir(GLOBAL_OPENCODE_SKILLS);
    const skillDirs = skills.filter(s => !s.startsWith('.') && s !== 'VERSION.md');

    const commands = await readdir(GLOBAL_OPENCODE_COMMANDS);
    const cmdFiles = commands.filter(c => c.endsWith('.md')).map(c => c.replace('.md', ''));

    // Every skill should have a command
    for (const skill of skillDirs) {
      expect(cmdFiles).toContain(skill);
    }
  });
});

describe("integration: compiled stubs", () => {
  const COMMANDS_DIR = join(process.cwd(), "src/commands");

  it("compiled stubs should exist", async () => {
    expect(existsSync(COMMANDS_DIR)).toBe(true);

    const stubs = await readdir(COMMANDS_DIR);
    expect(stubs.length).toBeGreaterThan(0);
    expect(stubs).toContain("rrr.md");
  });

  it("compiled stub should have instruction format", async () => {
    const stubPath = join(COMMANDS_DIR, "rrr.md");
    const content = await readFile(stubPath, "utf-8");

    // Should have version
    expect(content).toMatch(/v\d+\.\d+\.\d+/);

    // Should have instructions
    expect(content).toContain("## Instructions");
    expect(content).toContain("Read the skill file");
    expect(content).toContain("$ARGUMENTS");

    // Should have skill location
    expect(content).toContain("## Skill Location");
    expect(content).toContain(".claude/skills");
  });
});
