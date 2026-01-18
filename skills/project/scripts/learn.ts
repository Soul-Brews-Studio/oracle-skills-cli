#!/usr/bin/env bun
// learn.ts - Clone repo for read-only study
// Usage: ROOT=/path/to/repo bun learn.ts <github-url-or-owner/repo>
//
// Supports:
//   learn.ts https://github.com/owner/repo
//   learn.ts owner/repo
//   learn.ts repo-name  (searches ghq)

import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync, appendFileSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";

const ROOT = process.env.ROOT;
if (!ROOT) {
  console.error("Error: ROOT environment variable required");
  console.error("Usage: ROOT=/path/to/repo bun learn.ts <github-url-or-owner/repo>");
  process.exit(1);
}

const SLUGS_FILE = join(ROOT, "ψ/memory/slugs.yaml");
const input = process.argv[2];

if (!input) {
  console.log("Usage: bun learn.ts <github-url-or-owner/repo>");
  console.log("");
  console.log("Examples:");
  console.log("  bun learn.ts https://github.com/owner/repo");
  console.log("  bun learn.ts owner/repo");
  console.log("  bun learn.ts repo-name  # searches ghq");
  process.exit(1);
}

// Extract repo info
let repo: string;

if (input.startsWith("http")) {
  // Full URL: https://github.com/owner/repo
  repo = input.replace("https://github.com/", "").replace(".git", "");
} else if (input.includes("/")) {
  // Short form: owner/repo
  repo = input;
} else {
  // Just repo name - try to find in ghq
  try {
    const ghqList = await $`ghq list`.text();
    const match = ghqList.split("\n").find(l => l.toLowerCase().endsWith(`/${input.toLowerCase()}`));
    if (match) {
      repo = match.replace("github.com/", "");
    } else {
      console.error(`❌ Not found: ${input}`);
      console.error("   Provide full path: owner/repo");
      process.exit(1);
    }
  } catch {
    console.error(`❌ Not found: ${input}`);
    console.error("   Provide full path: owner/repo");
    process.exit(1);
  }
}

const [owner, name] = repo.split("/");
const ghqPath = join(homedir(), "Code/github.com", owner, name);
const learnPath = join(ROOT, "ψ/learn/repo/github.com", owner, name);

console.log(`📚 Learning: ${owner}/${name}`);

// 1. Clone via ghq
if (existsSync(ghqPath)) {
  console.log("  ↳ Updating existing repo...");
  await $`ghq get -u github.com/${repo}`.quiet();
} else {
  console.log("  ↳ Cloning...");
  await $`ghq get github.com/${repo}`.quiet();
}

// 2. Create symlink (with owner structure)
mkdirSync(dirname(learnPath), { recursive: true });
if (existsSync(learnPath)) {
  unlinkSync(learnPath);
}
symlinkSync(ghqPath, learnPath);
console.log(`  ↳ Symlink: ψ/learn/repo/github.com/${owner}/${name}`);

// 3. Register slug
mkdirSync(dirname(SLUGS_FILE), { recursive: true });
if (!existsSync(SLUGS_FILE)) {
  await Bun.write(SLUGS_FILE, "# Slug Registry (owner/repo: path)\n");
}

// Remove old entry if exists, add new
const content = await Bun.file(SLUGS_FILE).text();
const filtered = content.split("\n").filter(l => !l.startsWith(`${owner}/${name}:`)).join("\n");
await Bun.write(SLUGS_FILE, filtered);
appendFileSync(SLUGS_FILE, `${owner}/${name}: ${ghqPath}\n`);

console.log(`  ↳ Registered: ${owner}/${name}`);
console.log("");
console.log(`✅ Ready to learn: ${owner}/${name}`);
console.log(`   Path: ${ghqPath}`);
