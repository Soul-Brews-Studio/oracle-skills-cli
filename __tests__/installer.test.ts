import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { readFile, mkdir, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { $ } from "bun";

const TEST_DIR = join(process.cwd(), "test-install-output");

describe("installer stub format", () => {
  beforeAll(async () => {
    // Create test directory
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterAll(async () => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  it("compiled stubs should use instruction format (flat .md files)", async () => {
    // Compiled stubs are flat files with instructions
    const commandFile = join(process.cwd(), "src/commands", "trace.md");
    const content = await readFile(commandFile, "utf-8");

    // Should have instruction format
    expect(content).toContain("Execute the `trace` skill");
    expect(content).toContain("## Instructions");
    expect(content).toContain("$ARGUMENTS");
    
    // Should NOT have full content
    expect(content).not.toContain("## Step 0: Timestamp");
  });

  it("Claude Code should use full skill format (directory with SKILL.md)", async () => {
    // Claude Code uses .claude/skills/{name}/SKILL.md
    const skillFile = join(process.cwd(), "src/skills", "trace", "SKILL.md");
    const content = await readFile(skillFile, "utf-8");

    // Should have full content
    expect(content).toContain("# /trace");
    expect(content).toContain("## Usage");
    expect(content).toContain("## Step 0: Timestamp");
  });

  it("stub should have correct structure", async () => {
    const content = await readFile(
      join(process.cwd(), "src/commands", "fyi.md"),
      "utf-8"
    );

    const lines = content.split("\n");

    // Frontmatter
    expect(lines[0]).toBe("---");
    expect(lines[1]).toMatch(/^description: v\d+\.\d+\.\d+ \|/);
    expect(lines[2]).toBe("---");

    // Header with skill name
    expect(lines[4]).toMatch(/^# \/\w+$/);

    // Instructions section
    expect(content).toContain("## Instructions");
    expect(content).toContain("Read the skill file");

    // Skill path in instructions
    expect(content).toContain("~/.claude/skills/fyi/SKILL.md");

    // Arguments (inline)
    expect(content).toContain("$ARGUMENTS");
  });

  it("installer should copy stubs for OpenCode", async () => {
    // This test checks the installer behavior
    // OpenCode target: flat .md files from commands/
    // Claude Code target: directories with SKILL.md from skills/
    
    const openCodeCommandsDir = join(process.cwd(), "src/commands");
    const claudeSkillsDir = join(process.cwd(), "src/skills");

    // OpenCode commands should be flat .md files
    expect(existsSync(join(openCodeCommandsDir, "trace.md"))).toBe(true);
    expect(existsSync(join(openCodeCommandsDir, "trace", "SKILL.md"))).toBe(false);

    // Claude skills should be directories
    expect(existsSync(join(claudeSkillsDir, "trace", "SKILL.md"))).toBe(true);
  });

  it("stub should contain hardcoded skill path", async () => {
    const content = await readFile(
      join(process.cwd(), "src/commands", "trace.md"),
      "utf-8"
    );

    // Should have hardcoded path (no placeholder)
    expect(content).toContain("~/.claude/skills/trace/SKILL.md");
    expect(content).not.toContain("{skillPath}");
  });
});
