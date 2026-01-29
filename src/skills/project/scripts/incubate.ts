#!/usr/bin/env bun
// incubate.ts - Clone or create repo for active work
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { dirname, join } from "path";
import { getRoot, getPaths, parseRepo, ghqPath, updateSlugsFile } from "./utils.ts";

const args = process.argv.slice(2);
const input = args[0];
if (!input) {
  console.log("Usage: ROOT=/path bun incubate.ts <owner/repo|name> [--org org]");
  process.exit(1);
}

const ROOT = getRoot();
const { slugsFile, incubateDir } = getPaths(ROOT);
const orgFlag = args.indexOf("--org");
const defaultOrg = orgFlag !== -1 ? args[orgFlag + 1] : "laris-co";

const { owner, name, slug } = parseRepo(input, defaultOrg);
const localPath = ghqPath(owner, name);
const linkPath = join(incubateDir, owner, name);

console.log(`Incubating: ${slug}`);

// Check if repo exists on GitHub
const repoExists = await $`gh repo view ${slug}`.quiet().then(() => true).catch(() => false);

if (repoExists) {
  await $`ghq get -u github.com/${slug}`.quiet();
} else {
  console.log("  Creating new repo...");
  await $`gh repo create ${slug} --private --clone=false`;
  await $`ghq get github.com/${slug}`.quiet();

  // Init if empty
  if (!existsSync(join(localPath, "README.md"))) {
    await Bun.write(join(localPath, "README.md"), `# ${name}\n`);
    await $`git -C ${localPath} add README.md && git -C ${localPath} commit -m "Initial commit"`;
    await $`git -C ${localPath} push origin main`.quiet().catch(() => $`git -C ${localPath} push origin master`.quiet());
  }
}

// Create symlink
mkdirSync(dirname(linkPath), { recursive: true });
if (existsSync(linkPath)) unlinkSync(linkPath);
symlinkSync(localPath, linkPath);

// Register slug
await updateSlugsFile(slugsFile, slug, localPath);

console.log(`Ready: ${localPath}`);
console.log(`GitHub: https://github.com/${slug}`);
