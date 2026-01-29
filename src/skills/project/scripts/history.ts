#!/usr/bin/env bun
// history.ts - Git timeline analysis
import { $ } from "bun";
import { existsSync } from "fs";
import { basename } from "path";
import { resolveSlug } from "./resolve-slug.ts";

const args = process.argv.slice(2);
const sinceArg = args.find((a) => a.startsWith("--since="));
const since = sinceArg?.slice(8) || "6 months ago";
const input = args.find((a) => !a.startsWith("--"));

if (!input) {
  console.log("Usage: ROOT=/path bun history.ts <slug|path> [--since=6months]");
  process.exit(0);
}

const path = await resolveSlug(input);
if (!path || !existsSync(`${path}/.git`)) {
  console.log(`Not a git repo: ${input}`);
  process.exit(1);
}

const name = basename(path);
const git = (cmd: string) => $`git -C ${path} ${cmd.split(" ")}`.text().catch(() => "");

console.log(`# ${name}\nPath: ${path}\nSince: ${since}\n`);

// Stats
const [total, recent, first, last] = await Promise.all([
  git("rev-list --count HEAD"),
  git(`rev-list --count --since=${since} HEAD`),
  git("log --reverse --format=%ad --date=short").then((s) => s.split("\n")[0]),
  git("log -1 --format=%ad --date=short"),
]);

console.log(`## Summary\n| Metric | Value |\n|--------|-------|\n| Total | ${total.trim()} |\n| Recent | ${recent.trim()} |\n| First | ${first} |\n| Last | ${last.trim()} |\n`);

// Recent commits
console.log("## Recent Commits\n```");
console.log((await git(`log --oneline --since=${since} -15`)).trim() || "(none)");
console.log("```\n");

// Top files
const files = (await git(`log --name-only --pretty="" --since=${since}`)).trim().split("\n").filter(Boolean);
const counts: Record<string, number> = {};
files.forEach((f) => (counts[f] = (counts[f] || 0) + 1));
const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);

console.log("## Top Changed Files\n```");
top.forEach(([f, c]) => console.log(`  ${c} ${f}`));
console.log("```");
