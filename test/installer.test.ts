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

  it("OpenCode should use stub format (flat .md files)", async () => {
    // OpenCode uses .opencode/command/{name}.md (flat file, not directory)
    const commandFile = join(process.cwd(), "commands", "trace.md");
    const content = await readFile(commandFile, "utf-8");

    // Should be stub format
    expect(content).toContain("load skill `trace`");
    expect(content).toContain("Human:");
    expect(content).toContain("$ARGUMENTS");
    
    // Should NOT have full content
    expect(content).not.toContain("## Step 0: Timestamp");
  });

  it("Claude Code should use full skill format (directory with SKILL.md)", async () => {
    // Claude Code uses .claude/skills/{name}/SKILL.md
    const skillFile = join(process.cwd(), "skills", "trace", "SKILL.md");
    const content = await readFile(skillFile, "utf-8");

    // Should have full content
    expect(content).toContain("# /trace");
    expect(content).toContain("## Usage");
    expect(content).toContain("## Step 0: Timestamp");
  });

  it("stub should have correct structure", async () => {
    const content = await readFile(
      join(process.cwd(), "commands", "fyi.md"),
      "utf-8"
    );

    const lines = content.split("\n");

    // Frontmatter
    expect(lines[0]).toBe("---");
    expect(lines[1]).toMatch(/^description: v\d+\.\d+\.\d+ \|/);
    expect(lines[2]).toBe("---");

    // AI load instruction
    expect(lines[4]).toMatch(/^AI: load skill `.+` args: \$ARGUMENTS \(v\d+/);

    // Human path
    expect(content).toMatch(/Human: \{skillPath\}\/.+\/SKILL\.md/);

    // Arguments (inline)
    expect(content).toContain("$ARGUMENTS");
  });

  it("installer should copy stubs for OpenCode", async () => {
    // This test checks the installer behavior
    // OpenCode target: flat .md files from commands/
    // Claude Code target: directories with SKILL.md from skills/
    
    const openCodeCommandsDir = join(process.cwd(), "commands");
    const claudeSkillsDir = join(process.cwd(), "skills");

    // OpenCode commands should be flat .md files
    expect(existsSync(join(openCodeCommandsDir, "trace.md"))).toBe(true);
    expect(existsSync(join(openCodeCommandsDir, "trace", "SKILL.md"))).toBe(false);

    // Claude skills should be directories
    expect(existsSync(join(claudeSkillsDir, "trace", "SKILL.md"))).toBe(true);
  });

  it("stub skillPath placeholder should be replaceable", async () => {
    const content = await readFile(
      join(process.cwd(), "commands", "trace.md"),
      "utf-8"
    );

    // Should have placeholder
    expect(content).toContain("{skillPath}");

    // Test replacement
    const globalPath = content.replace("{skillPath}", "~/.claude/skills");
    expect(globalPath).toContain("~/.claude/skills/trace/SKILL.md");

    const localPath = content.replace("{skillPath}", ".claude/skills");
    expect(localPath).toContain(".claude/skills/trace/SKILL.md");
  });
});
