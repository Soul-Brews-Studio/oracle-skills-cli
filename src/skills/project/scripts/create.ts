#!/usr/bin/env bun
// create.ts - Create new GitHub repo, init, commit, push
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { join } from "path";
import { getRoot, getPaths, ghqPath } from "./utils.ts";

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith("--"));
if (!name) {
  console.log("Usage: ROOT=/path bun create.ts <name> [--public]");
  process.exit(1);
}

const ROOT = getRoot();
const { incubateDir } = getPaths(ROOT);
const ORG = "laris-co";
const isPublic = args.includes("--public");

const localPath = ghqPath(ORG, name);
const linkPath = join(incubateDir, ORG, name);
const visibility = isPublic ? "public" : "private";

console.log(`Creating: ${ORG}/${name} (${visibility})`);

// 1. Create GitHub repo
await $`gh repo create ${ORG}/${name} --${visibility} --clone=false`.quiet().catch(() => {
  console.log("  Repo may already exist, continuing...");
});

// 2. Clone via ghq
await $`ghq get -u github.com/${ORG}/${name}`.quiet().catch(() => {});

// 3. Init if no .git
if (!existsSync(`${localPath}/.git`)) {
  mkdirSync(localPath, { recursive: true });
  await $`git -C ${localPath} init`;
  await $`git -C ${localPath} remote add origin git@github.com:${ORG}/${name}.git`;
}

// 4. Create README if missing
if (!existsSync(`${localPath}/README.md`)) {
  await Bun.write(`${localPath}/README.md`, `# ${name}\n\nCreated by Oracle Open Framework\n`);
}

// 5. Initial commit if needed
const hasCommits = await $`git -C ${localPath} log --oneline -1`.quiet().then(() => true).catch(() => false);
if (!hasCommits) {
  await $`git -C ${localPath} add -A`;
  await $`git -C ${localPath} commit -m "Initial commit"`;
}

// 6. Push
await $`git -C ${localPath} push -u origin main`.quiet()
  .catch(() => $`git -C ${localPath} push -u origin master`.quiet())
  .catch(() => $`git -C ${localPath} branch -M main && git -C ${localPath} push -u origin main`.quiet());

// 7. Create symlink
mkdirSync(join(incubateDir, ORG), { recursive: true });
if (existsSync(linkPath)) unlinkSync(linkPath);
symlinkSync(localPath, linkPath);

console.log(`\nCreated: ${ORG}/${name} (${visibility})`);
console.log(`  GitHub: https://github.com/${ORG}/${name}`);
console.log(`  Local: ${localPath}`);
