// utils.ts - Shared utilities for project scripts
import { Glob } from "bun";
import { existsSync, lstatSync, readlinkSync } from "fs";
import { join, basename, dirname } from "path";
import { homedir } from "os";

// --- Environment ---
export function getRoot(): string {
  const ROOT = process.env.ROOT;
  if (!ROOT) {
    console.error("Error: ROOT environment variable required");
    process.exit(1);
  }
  return ROOT;
}

export function getPaths(root: string) {
  return {
    slugsFile: join(root, "ψ/memory/slugs.yaml"),
    learnDir: join(root, "ψ/learn/repo/github.com"),
    incubateDir: join(root, "ψ/incubate/repo/github.com"),
    logDir: join(root, "ψ/memory/logs"),
  };
}

// --- Date/Time ---
export const today = () => new Date().toISOString().slice(0, 10);
export const now = () => new Date().toTimeString().slice(0, 5);

// --- Slug parsing ---
export type RepoInfo = { owner: string; name: string; slug: string };

export function parseRepo(input: string, defaultOrg = "laris-co"): RepoInfo {
  if (input.startsWith("http")) {
    const slug = input.replace("https://github.com/", "").replace(".git", "");
    const [owner, name] = slug.split("/");
    return { owner, name, slug };
  }
  if (input.includes("/")) {
    const [owner, name] = input.split("/");
    return { owner, name, slug: input };
  }
  return { owner: defaultOrg, name: input, slug: `${defaultOrg}/${input}` };
}

export function ghqPath(owner: string, name: string): string {
  return join(homedir(), "Code/github.com", owner, name);
}

// --- Symlink operations ---
export type LinkInfo = { path: string; org: string; repo: string; slug: string; target?: string };

export async function getSymlinks(baseDir: string): Promise<LinkInfo[]> {
  if (!existsSync(baseDir)) return [];

  const links: LinkInfo[] = [];
  const glob = new Glob("*/*");

  for await (const match of glob.scan({ cwd: baseDir, onlyFiles: false })) {
    const fullPath = join(baseDir, match);
    try {
      if (lstatSync(fullPath).isSymbolicLink()) {
        const [org, repo] = match.split("/");
        const target = (() => { try { return readlinkSync(fullPath); } catch { return undefined; } })();
        links.push({ path: fullPath, org, repo, slug: `${org}/${repo}`, target });
      }
    } catch {}
  }
  return links;
}

export function matchesSlug(link: LinkInfo, slug: string): boolean {
  return slug.includes("/") ? link.slug === slug : link.repo === slug;
}

// --- Slugs.yaml operations ---
export async function findInSlugs(slugsFile: string, input: string): Promise<string | null> {
  if (!existsSync(slugsFile)) return null;

  const content = await Bun.file(slugsFile).text();
  for (const line of content.split("\n")) {
    const matches =
      line.startsWith(`${input}:`) ||
      line.includes(`/${input}:`) ||
      (!input.includes("/") && line.startsWith(`${input}:`));

    if (matches) {
      const path = line.split(":").slice(1).join(":").trim().replace(/^~/, homedir());
      if (existsSync(path)) return path;
    }
  }
  return null;
}

export async function updateSlugsFile(slugsFile: string, slug: string, path: string) {
  const dir = dirname(slugsFile);
  const { mkdirSync } = await import("fs");
  mkdirSync(dir, { recursive: true });

  if (!existsSync(slugsFile)) {
    await Bun.write(slugsFile, "# Slug Registry (owner/repo: path)\n");
  }

  const content = await Bun.file(slugsFile).text();
  const filtered = content.split("\n").filter((l) => !l.startsWith(`${slug}:`)).join("\n");
  await Bun.write(slugsFile, `${filtered}\n${slug}: ${path}\n`);
}

// --- Path expansion ---
export function expandPath(input: string): string {
  return input.replace(/^~/, homedir());
}
