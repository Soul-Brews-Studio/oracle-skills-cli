#!/usr/bin/env bun
// index.ts - Index manifest files to Oracle knowledge base
import { $ } from "bun";
import { existsSync, readdirSync } from "fs";
import { join, basename } from "path";
import { getRoot, getPaths, today } from "./utils.ts";

const args = process.argv.slice(2);
const cmd = args[0] || "list";

// Show usage only for help flag (list is default, doesn't need ROOT check first)
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: ROOT=/path bun index.ts [list|all|slug] [--dry-run]");
  process.exit(0);
}

const ROOT = getRoot();
const { logDir } = getPaths(ROOT);
const dryRun = args.includes("--dry-run");
const dateArg = args.find((a) => a.match(/^20\d{2}-\d{2}-\d{2}$/) || a === "today");
const date = dateArg === "today" || !dateArg ? today() : dateArg;

// Get our orgs for scoring
const ourOrgs = await $`gh api user/orgs --jq '.[].login'`.text().catch(() => "");
const ourUser = await $`gh api user --jq '.login'`.text().catch(() => "");
const orgPattern = new RegExp(`github.com/(${[...ourOrgs.trim().split("\n"), ourUser.trim()].filter(Boolean).join("|")})/`);

function scoreFile(file: string): number {
  if (file.includes("/ψ/") && file.endsWith(".md")) return 1;
  if (orgPattern.test(file)) {
    if (file.includes("/retrospectives/") || file.includes("/learnings/") || file.includes("/memory/")) return 1;
  }
  return 0;
}

function listManifests() {
  const manifests = readdirSync(logDir).filter((f) => f.startsWith(`index-${date}-`) && f.endsWith(".json"));
  
  console.log(`Manifests for ${date}:`);
  
  let total = 0, indexable = 0;
  
  for (const m of manifests) {
    const data = JSON.parse(Bun.file(join(logDir, m)).toString());
    const files = data.files || [];
    const scored = files.filter((f: string) => scoreFile(f) > 0);
    
    const slug = m.replace(`index-${date}-`, "").replace(".json", "").replace("_", "/");
    console.log(`  ${slug}: ${scored.length}/${files.length} indexable`);
    
    total += files.length;
    indexable += scored.length;
  }
  
  console.log(`\nTotal: ${total} files, ${indexable} indexable`);
}

async function indexManifest(manifestPath: string) {
  const data = JSON.parse(await Bun.file(manifestPath).text());
  const slug = data.project;
  
  console.log(`\nIndexing: ${slug}`);
  console.log(`  Source: ${data.source}`);
  
  let indexed = 0, skipped = 0;
  
  for (const file of data.files || []) {
    const score = scoreFile(file);
    if (!score) { skipped++; continue; }
    if (!existsSync(file)) { console.log(`  Not found: ${basename(file)}`); continue; }
    
    console.log(`  ${dryRun ? "[DRY] " : ""}${basename(file)}`);
    indexed++;
  }
  
  console.log(`  Indexed: ${indexed}, Skipped: ${skipped}`);
}

// Main
if (cmd === "list" || cmd === "--list") {
  listManifests();
} else if (cmd === "all") {
  const manifests = readdirSync(logDir).filter((f) => f.startsWith(`index-${date}-`) && f.endsWith(".json"));
  for (const m of manifests) await indexManifest(join(logDir, m));
} else {
  const safeSlug = cmd.replace("/", "_");
  const manifestPath = join(logDir, `index-${date}-${safeSlug}.json`);
  if (existsSync(manifestPath)) {
    await indexManifest(manifestPath);
  } else {
    console.log(`Not found: ${manifestPath}`);
    listManifests();
  }
}
