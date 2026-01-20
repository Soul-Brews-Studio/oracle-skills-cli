#!/usr/bin/env bun
// offload.ts - Remove symlinks, keep ghq + slugs
import { mkdirSync, unlinkSync, appendFileSync } from "fs";
import { join } from "path";
import { getRoot, getPaths, getSymlinks, matchesSlug, today, now, LinkInfo } from "./utils.ts";

const arg = process.argv[2];
if (!arg) {
  console.log("Usage: ROOT=/path bun offload.ts [slug|all]");
  process.exit(1);
}

const ROOT = getRoot();
const { learnDir, incubateDir, logDir } = getPaths(ROOT);
mkdirSync(logDir, { recursive: true });

async function offload(slug?: string) {
  const logFile = join(logDir, `offload-${today()}.log`);
  if (!slug) await Bun.write(logFile, `# Offload ${today()} ${now()}\n`);

  let count = 0;

  for (const [type, dir] of [["learn", learnDir], ["incubate", incubateDir]] as const) {
    for (const link of await getSymlinks(dir)) {
      if (slug && !matchesSlug(link, slug)) continue;

      console.log(`Offloading from ${type}: ${link.slug}`);
      appendFileSync(logFile, `\n## ${link.slug}\n- Type: ${type}\n- Path: ${link.target}\n`);
      unlinkSync(link.path);
      count++;
    }
  }

  if (slug && count === 0) {
    console.log(`Not found: ${slug}`);
  } else {
    console.log(`Offloaded ${count} projects → ${logFile}`);
  }
}

await offload(arg === "all" ? undefined : arg);
