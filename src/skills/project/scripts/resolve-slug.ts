#!/usr/bin/env bun
// resolve-slug.ts - Resolve slug to path
import { $ } from "bun";
import { existsSync } from "fs";
import { expandPath, findInSlugs, getSymlinks, getPaths } from "./utils.ts";

const ROOT = process.env.ROOT;
const paths = ROOT ? getPaths(ROOT) : null;

export async function resolveSlug(input: string): Promise<string | null> {
  // 1. Direct path
  const expanded = expandPath(input);
  if (existsSync(expanded)) return expanded;

  // 2. Slugs.yaml
  if (paths) {
    const fromSlugs = await findInSlugs(paths.slugsFile, input);
    if (fromSlugs) return fromSlugs;

    // 3. Learn/incubate symlinks
    for (const dir of [paths.learnDir, paths.incubateDir]) {
      for (const link of await getSymlinks(dir)) {
        if (link.slug === input || link.repo === input) return link.target || link.path;
      }
    }
  }

  // 4. ghq
  try {
    const paths = (await $`ghq list -p`.text()).trim().split("\n");
    return paths.find((p) => p.toLowerCase().endsWith(`/${input.toLowerCase()}`)) || null;
  } catch {
    return null;
  }
}

if (import.meta.main) {
  const input = process.argv[2];
  if (!input) {
    console.log("Usage: ROOT=/path bun resolve-slug.ts <slug>");
    process.exit(1);
  }

  const result = await resolveSlug(input);
  if (result) {
    console.log(`Resolved: ${input} → ${result}`);
  } else {
    console.log(`Not found: ${input}`);
    process.exit(1);
  }
}
