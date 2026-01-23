#!/usr/bin/env bun
// trace.ts - Main entry point for /trace skill
import { $ } from "bun";
import { existsSync } from "fs";
import { join } from "path";
import {
  getRoot,
  getPaths,
  today,
  now,
  isUrl,
  isGitHubUrl,
  cloneForTrace,
  searchLocal,
  searchGit,
  logTrace,
  type TraceResult,
} from "./utils.ts";

// --- Argument Parsing ---
interface TraceArgs {
  query: string;
  mode: "oracle" | "smart" | "deep";
  url?: string;
}

function parseArgs(): TraceArgs {
  const args = process.argv.slice(2);
  let mode: "oracle" | "smart" | "deep" = "smart"; // default
  const queryParts: string[] = [];

  for (const arg of args) {
    if (arg === "--oracle") {
      mode = "oracle";
    } else if (arg === "--smart") {
      mode = "smart";
    } else if (arg === "--deep") {
      mode = "deep";
    } else {
      queryParts.push(arg);
    }
  }

  const query = queryParts.join(" ");
  const url = isUrl(query) ? query : undefined;

  return { query, mode, url };
}

// --- Main ---
async function main() {
  const ROOT = getRoot();
  const args = parseArgs();

  if (!args.query) {
    console.log("Usage: ROOT=/path bun trace.ts <query> [--oracle|--smart|--deep]");
    console.log("");
    console.log("Modes:");
    console.log("  --oracle   Oracle only (fastest)");
    console.log("  --smart    Default, auto-escalate if < 3 Oracle results");
    console.log("  --deep     5 parallel agents (thorough)");
    process.exit(1);
  }

  const timestamp = `${today()} ${now()}`;
  console.log(`\n🔍 /trace: ${args.query}`);
  console.log(`📍 Mode: ${args.mode}`);
  console.log(`🕐 ${timestamp}\n`);

  // Handle URL input - clone first
  let searchPath: string | undefined;
  if (args.url && isGitHubUrl(args.url)) {
    searchPath = await cloneForTrace(args.url, ROOT);
    console.log(`\nCloned repo ready for tracing: ${searchPath}\n`);
  }

  // Initialize trace result
  const trace: TraceResult = {
    query: args.query,
    mode: args.mode,
    timestamp,
    oracleResults: 0,
    localFiles: [],
    gitCommits: [],
    escalated: false,
  };

  // Execute based on mode
  switch (args.mode) {
    case "oracle":
      console.log("📚 Oracle search only (use MCP oracle_search)");
      console.log(`\n→ Call: oracle_search("${args.query}", limit=15)`);
      console.log("\nAgent should execute Oracle search and display results.");
      break;

    case "smart":
      console.log("🧠 Smart mode: Oracle first, auto-escalate if needed");
      console.log(`\n→ Step 1: oracle_search("${args.query}", limit=10)`);
      console.log("→ Step 2: If Oracle returns < 3 results, auto-escalate to --deep");
      console.log("\nAgent should:");
      console.log("1. Call oracle_search");
      console.log("2. Count results");
      console.log("3. If < 3 results → launch 5 Explore agents (--deep behavior)");
      break;

    case "deep":
      console.log("🔬 Deep mode: 5 parallel Explore agents");
      console.log("\nAgent should launch 5 parallel Task tools with subagent_type='Explore':");
      console.log("1. Agent 1: Current repo files");
      console.log("2. Agent 2: Git history (commits, creates, deletes)");
      console.log("3. Agent 3: GitHub issues");
      console.log("4. Agent 4: Other repos (ghq, ~/Code)");
      console.log("5. Agent 5: Retrospectives & learnings (ψ/memory/)");
      break;
  }

  // Local search if we have a path
  if (searchPath) {
    console.log(`\n📁 Searching local path: ${searchPath}`);
    trace.localFiles = await searchLocal(args.query.replace(args.url || "", "").trim() || "README", searchPath);
    trace.gitCommits = await searchGit(args.query.replace(args.url || "", "").trim() || "initial", searchPath);

    if (trace.localFiles.length > 0) {
      console.log(`\nFound ${trace.localFiles.length} files:`);
      trace.localFiles.forEach((f) => console.log(`  - ${f}`));
    }

    if (trace.gitCommits.length > 0) {
      console.log(`\nFound ${trace.gitCommits.length} commits:`);
      trace.gitCommits.forEach((c) => console.log(`  - ${c.shortHash}: ${c.message}`));
    }
  }

  // Also search ψ/memory if not --oracle
  if (args.mode !== "oracle") {
    const memoryPath = join(ROOT, "ψ/memory");
    if (existsSync(memoryPath)) {
      const memoryFiles = await searchLocal(args.query, memoryPath);
      trace.localFiles.push(...memoryFiles);
      if (memoryFiles.length > 0) {
        console.log(`\n📝 Found ${memoryFiles.length} files in ψ/memory:`);
        memoryFiles.forEach((f) => console.log(`  - ${f}`));
      }
    }
  }

  // Log trace to file
  const tracePath = await logTrace(trace, ROOT);

  // Summary
  console.log("\n---");
  console.log(`✅ Trace logged: ${tracePath}`);
  console.log("\nAgent should also call oracle_trace() to log to Oracle MCP.");
}

main().catch(console.error);
