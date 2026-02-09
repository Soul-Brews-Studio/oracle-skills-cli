import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { readFile, mkdir, rm, readdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { $ } from "bun";

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

  describe("compiled stub format", () => {
    it("should have instruction format (not full content)", async () => {
      // Copy a stub to test directory
      const stubContent = await readFile(
        join(process.cwd(), "src/commands", "trace.md"),
        "utf-8"
      );
      
      // Stub should tell agent to execute skill with args
      expect(stubContent).toContain("Execute the `trace` skill");
      expect(stubContent).toContain("## Instructions");
      expect(stubContent).toContain("$ARGUMENTS");
      expect(stubContent).not.toContain("## Step 0:");
    });

    it("stub should include skill location", async () => {
      const stubContent = await readFile(
        join(process.cwd(), "src/commands", "fyi.md"),
        "utf-8"
      );

      // Should tell agent where to find full skill
      expect(stubContent).toContain("~/.claude/skills/fyi/SKILL.md");
    });
  });

  describe("Claude Code install format", () => {
    it("should install directories with SKILL.md (full content)", async () => {
      const skillContent = await readFile(
        join(process.cwd(), "src/skills", "trace", "SKILL.md"),
        "utf-8"
      );

      // Claude Code expects full content
      expect(skillContent).toContain("# /trace");
      expect(skillContent).toContain("## Step 0: Timestamp");
      expect(skillContent).toContain("## Usage");
    });

    it("should include scripts directory if exists", async () => {
      const projectSkillDir = join(process.cwd(), "src/skills", "project");
      
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
            expect(content).toContain("installer: oracle-skills-cli");
          }
        }
      }
    });
  });

  describe("hardcoded paths in stubs", () => {
    it("should have hardcoded skill path (no placeholder)", async () => {
      const stub = await readFile(
        join(process.cwd(), "src/commands", "trace.md"),
        "utf-8"
      );

      expect(stub).toContain("~/.claude/skills/trace/SKILL.md");
      expect(stub).not.toContain("{skillPath}");
    });
  });
});
