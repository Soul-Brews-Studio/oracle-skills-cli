import { describe, it, expect } from "bun:test";
import { readdirSync, statSync } from "fs";
import { join } from "path";

const SKILLS_DIR = join(import.meta.dir, "skills");

function findScripts(dir: string): string[] {
  const scripts: string[] = [];
  
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      
      if (entry.isDirectory()) {
        scripts.push(...findScripts(fullPath));
      } else if (
        entry.name.endsWith(".ts") &&
        !entry.name.endsWith(".test.ts") &&
        (dir.includes("/scripts") || entry.name === "recap.ts" || entry.name === "recap-rich.ts")
      ) {
        scripts.push(fullPath);
      }
    }
  } catch {
    // Directory doesn't exist
  }
  
  return scripts;
}

describe("skill scripts", () => {
  it("should have executable permission", () => {
    const skillsDir = join(import.meta.dir);
    const scripts = findScripts(skillsDir);
    const nonExecutable: string[] = [];
    
    for (const script of scripts) {
      const stats = statSync(script);
      // Check if user has execute permission (mode & 0o100)
      if ((stats.mode & 0o100) === 0) {
        nonExecutable.push(script.replace(skillsDir + "/", ""));
      }
    }
    
    expect(nonExecutable).toEqual([]);
  });
});
