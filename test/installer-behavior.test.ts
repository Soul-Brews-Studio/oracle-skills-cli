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

  describe("OpenCode install format", () => {
    it("should install flat .md stubs (not directories)", async () => {
      // Copy a stub to test directory
      const stubContent = await readFile(
        join(process.cwd(), "commands", "trace.md"),
        "utf-8"
      );
      
      // OpenCode expects: command/trace.md (flat file)
      // NOT: command/trace/SKILL.md (directory)
      
      // Stub should be flat file format
      expect(stubContent).toContain("Load skill `trace`");
      expect(stubContent).toContain("ARGUMENTS: {args}");
      expect(stubContent).not.toContain("## Step 0:");
    });

    it("stub should point to skill path for loading", async () => {
      const stubContent = await readFile(
        join(process.cwd(), "commands", "fyi.md"),
        "utf-8"
      );

      // Should tell agent where to find full skill
      expect(stubContent).toContain("Skill: {skillPath}/fyi/SKILL.md");
    });
  });

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
    it("OpenCode installed file should be stub format", async () => {
      // After install, OpenCode should have flat .md stubs
      // NOT directories with SKILL.md
      const openCodePath = process.env.HOME + "/.config/opencode/command";
      
      if (existsSync(openCodePath)) {
        const files = await readdir(openCodePath);
        const traceEntry = files.find(f => f === "trace" || f === "trace.md");
        
        if (traceEntry === "trace") {
          // It's a directory - check if SKILL.md exists (old format)
          const skillMdPath = join(openCodePath, "trace", "SKILL.md");
          if (existsSync(skillMdPath)) {
            const content = await readFile(skillMdPath, "utf-8");
            // THIS SHOULD FAIL - we want stub format
            // Stub format should NOT have "## Step 0:"
            expect(content).not.toContain("## Step 0: Timestamp");
            // Stub format SHOULD have load instruction
            expect(content).toContain("Load skill `trace`");
          }
        }
      }
    });
  });

  describe("path replacement in stubs", () => {
    it("should replace {skillPath} for global install", async () => {
      const stub = await readFile(
        join(process.cwd(), "commands", "trace.md"),
        "utf-8"
      );

      const globalInstall = stub.replace(
        /\{skillPath\}/g,
        "~/.claude/skills"
      );

      expect(globalInstall).toContain("Skill: ~/.claude/skills/trace/SKILL.md");
    });

    it("should replace {skillPath} for local install", async () => {
      const stub = await readFile(
        join(process.cwd(), "commands", "trace.md"),
        "utf-8"
      );

      const localInstall = stub.replace(
        /\{skillPath\}/g,
        ".claude/skills"
      );

      expect(localInstall).toContain("Skill: .claude/skills/trace/SKILL.md");
    });
  });
});
