import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { readFile, mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const TEST_DIR = join(process.cwd(), "test-compile-output");
const TEST_SKILLS_DIR = join(TEST_DIR, "src/skills");
const TEST_COMMANDS_DIR = join(TEST_DIR, "src/commands");

describe("compile", () => {
  beforeAll(async () => {
    // Create test skill
    await mkdir(join(TEST_SKILLS_DIR, "test-skill"), { recursive: true });
    await writeFile(
      join(TEST_SKILLS_DIR, "test-skill", "SKILL.md"),
      `---
description: Test skill for unit testing.
---

# /test-skill

This is the test skill content.

## Usage

/test-skill [args]
`
    );
  });

  afterAll(async () => {
    // Cleanup
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  it("should output stub format with description", async () => {
    // Run compiler (we'll need to make it configurable)
    const output = await readFile(
      join(process.cwd(), "src/commands", "trace.md"),
      "utf-8"
    );

    // Check frontmatter has version
    expect(output).toContain("description: v");
    expect(output).toContain("|");
  });

  it("should include execute instruction", async () => {
    const output = await readFile(
      join(process.cwd(), "src/commands", "trace.md"),
      "utf-8"
    );

    expect(output).toContain("Execute the `trace` skill");
    expect(output).toContain("## Instructions");
  });

  it("should include skill path locations", async () => {
    const output = await readFile(
      join(process.cwd(), "src/commands", "trace.md"),
      "utf-8"
    );

    expect(output).toContain("~/.claude/skills/trace/SKILL.md");
  });

  it("should include ARGUMENTS in load line", async () => {
    const output = await readFile(
      join(process.cwd(), "src/commands", "trace.md"),
      "utf-8"
    );

    expect(output).toContain("$ARGUMENTS");
  });

  it("should NOT include full skill content", async () => {
    const output = await readFile(
      join(process.cwd(), "src/commands", "trace.md"),
      "utf-8"
    );

    // Stub should not have the full content
    expect(output).not.toContain("## Step 0: Timestamp");
    expect(output).not.toContain("## Mode 1:");
  });

  it("should match new format with instructions", async () => {
    const output = await readFile(
      join(process.cwd(), "src/commands", "fyi.md"),
      "utf-8"
    );

    const lines = output.split("\n");
    
    // Line 0: ---
    expect(lines[0]).toBe("---");
    
    // Line 1: description with version
    expect(lines[1]).toMatch(/^description: v\d+\.\d+\.\d+ \|/);
    
    // Line 2: ---
    expect(lines[2]).toBe("---");
    
    // Line 3: empty
    expect(lines[3]).toBe("");
    
    // Line 4: # /skillname header
    expect(lines[4]).toMatch(/^# \/\w+$/);
    
    // Should have instructions section
    expect(output).toContain("## Instructions");
    expect(output).toContain("Read the skill file");
    expect(output).toContain("$ARGUMENTS");
  });
});
