#!/usr/bin/env bun
// learn.ts - Clone repo for read-only study
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { dirname, join } from "path";
import { getRoot, getPaths, parseRepo, ghqPath, updateSlugsFile } from "./utils.ts";

const input = process.argv[2];
if (!input) {
  console.log("Usage: ROOT=/path bun learn.ts <owner/repo|url>");
  process.exit(1);
}

const ROOT = getRoot();
const { slugsFile, learnDir } = getPaths(ROOT);

// Parse input (handles URLs, owner/repo, or just repo name)
let repo: string;
if (input.startsWith("http") || input.includes("/")) {
  repo = parseRepo(input).slug;
} else {
  // Search ghq for short name
  const list = await $`ghq list`.text();
  const match = list.split("\n").find((l) => l.toLowerCase().endsWith(`/${input.toLowerCase()}`));
  if (!match) {
    console.error(`Not found: ${input}. Use owner/repo format.`);
    process.exit(1);
  }
  repo = match.replace("github.com/", "");
}

const { owner, name } = parseRepo(repo);
const localPath = ghqPath(owner, name);
const linkPath = join(learnDir, owner, name);

console.log(`Learning: ${owner}/${name}`);

// Clone/update via ghq
await $`ghq get ${existsSync(localPath) ? "-u" : ""} github.com/${repo}`.quiet();

// Create symlink
mkdirSync(dirname(linkPath), { recursive: true });
if (existsSync(linkPath)) unlinkSync(linkPath);
symlinkSync(localPath, linkPath);

// Register slug
await updateSlugsFile(slugsFile, `${owner}/${name}`, localPath);

console.log(`Ready: ${localPath}`);
