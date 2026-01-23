// utils.ts - Trace-specific utilities
import { $ } from "bun";
import { existsSync, mkdirSync, unlinkSync, symlinkSync } from "fs";
import { dirname, join } from "path";

// Re-export shared utilities from project
export { parseRepo, ghqPath, getRoot, today, now, getPaths } from "../../project/scripts/utils.ts";
import { parseRepo, ghqPath, getRoot, getPaths, today, now } from "../../project/scripts/utils.ts";

// --- URL Detection ---
export function isUrl(input: string): boolean {
  return input.startsWith("http://") || input.startsWith("https://");
}

export function isGitHubUrl(input: string): boolean {
  return isUrl(input) && input.includes("github.com");
}

// --- Clone for Trace (ghq + symlink pattern) ---
export async function cloneForTrace(url: string, root: string): Promise<string> {
  const { owner, name, slug } = parseRepo(url);
  const localPath = ghqPath(owner, name);
  const { learnDir, slugsFile } = getPaths(root);
  const linkPath = join(learnDir, owner, name);

  console.log(`Cloning for trace: ${slug}`);

  // Clone/update via ghq
  await $`ghq get ${existsSync(localPath) ? "-u" : ""} github.com/${slug}`.quiet();

  // Create symlink to ψ/learn/owner/repo
  mkdirSync(dirname(linkPath), { recursive: true });
  if (existsSync(linkPath)) unlinkSync(linkPath);
  symlinkSync(localPath, linkPath);

  console.log(`Ready: ${localPath}`);
  return localPath;
}

// --- Oracle Search Wrapper ---
export interface OracleResult {
  id: string;
  title: string;
  type: string;
  score: number;
  preview?: string;
}

// Note: Oracle search is called via MCP from the main agent
// This returns instructions for the agent to execute
export function getOracleSearchInstruction(query: string, limit = 10): string {
  return `oracle_search("${query}", limit=${limit})`;
}

// --- Local Search ---
export async function searchLocal(query: string, path: string): Promise<string[]> {
  try {
    const result = await $`grep -ril "${query}" "${path}" 2>/dev/null | head -10`.text();
    return result.trim().split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

// --- Git Search ---
export interface GitCommit {
  hash: string;
  shortHash: string;
  message: string;
  date: string;
}

export async function searchGit(query: string, path: string): Promise<GitCommit[]> {
  try {
    const result = await $`cd "${path}" && git log --oneline --grep="${query}" --format="%H|%h|%s|%ci" | head -10`.text();
    return result.trim().split("\n").filter(Boolean).map((line) => {
      const [hash, shortHash, message, date] = line.split("|");
      return { hash, shortHash, message, date };
    });
  } catch {
    return [];
  }
}

// --- Trace File Management ---
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 30);
}

export function getTraceFilename(query: string): string {
  const dateStr = today();
  const timeStr = now().replace(":", "");
  const slug = slugify(query);
  return `${dateStr}-${timeStr}-${slug}.md`;
}

export interface TraceResult {
  query: string;
  mode: "oracle" | "smart" | "deep";
  timestamp: string;
  oracleResults: number;
  localFiles: string[];
  gitCommits: GitCommit[];
  escalated: boolean;
}

export async function logTrace(trace: TraceResult, root: string): Promise<string> {
  const tracesDir = join(root, "ψ/memory/traces");
  mkdirSync(tracesDir, { recursive: true });

  const filename = getTraceFilename(trace.query);
  const filepath = join(tracesDir, filename);

  const content = `---
query: "${trace.query}"
mode: ${trace.mode}
timestamp: ${trace.timestamp}
oracle_results: ${trace.oracleResults}
escalated: ${trace.escalated}
---

# Trace: ${trace.query}

**Mode**: ${trace.mode}${trace.escalated ? " (auto-escalated from smart)" : ""}
**Time**: ${trace.timestamp}

## Oracle Results
Found ${trace.oracleResults} result(s)

## Local Files
${trace.localFiles.length > 0 ? trace.localFiles.map((f) => `- ${f}`).join("\n") : "None found"}

## Git Commits
${trace.gitCommits.length > 0 ? trace.gitCommits.map((c) => `- ${c.shortHash}: ${c.message}`).join("\n") : "None found"}
`;

  await Bun.write(filepath, content);
  console.log(`Trace logged: ${filepath}`);
  return filepath;
}
