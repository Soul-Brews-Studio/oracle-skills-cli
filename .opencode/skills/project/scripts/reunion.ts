#!/usr/bin/env bun
// reunion.ts - Scan project, create manifest, optionally offload
import { $ } from "bun";
import { existsSync, mkdirSync, appendFileSync, readdirSync } from "fs";
import { join, basename } from "path";
import { getRoot, getPaths, getSymlinks, matchesSlug, today, now, LinkInfo } from "./utils.ts";

const args = process.argv.slice(2);
const slug = args.find((a) => !a.startsWith("--"));
if (!slug) {
  console.log("Usage: ROOT=/path bun reunion.ts [slug|all] [--keep]");
  process.exit(1);
}

const ROOT = getRoot();
const { learnDir, incubateDir, logDir } = getPaths(ROOT);
mkdirSync(logDir, { recursive: true });
const keep = args.includes("--keep");

async function findProject(slug: string): Promise<LinkInfo | null> {
  for (const dir of [learnDir, incubateDir]) {
    for (const link of await getSymlinks(dir)) {
      if (matchesSlug(link, slug)) return link;
    }
  }
  return null;
}

async function reunionSingle(slug: string) {
  const link = await findProject(slug);
  if (!link?.target) {
    console.log(`Not loaded: ${slug}. Use: /project learn ${slug}`);
    return;
  }

  console.log(`Reunion: ${link.slug}`);
  console.log(`  Path: ${link.target}`);

  // Sync via ghq
  await $`ghq get -u github.com/${link.slug}`.quiet().catch(() => {});

  // Find knowledge files
  const manifest = join(logDir, `index-${today()}-${link.slug.replace("/", "_")}.json`);
  const files: string[] = [];

  for (const dir of ["ψ/memory", "learnings", "retrospectives", "docs"]) {
    const fullDir = join(link.target, dir);
    if (!existsSync(fullDir)) continue;
    
    const found = readdirSync(fullDir, { recursive: true })
      .filter((f) => String(f).endsWith(".md"))
      .map((f) => join(fullDir, String(f)));
    files.push(...found);
    
    if (found.length) console.log(`  Found ${found.length} files in ${dir}/`);
  }

  // Write manifest
  await Bun.write(manifest, JSON.stringify({
    project: link.slug,
    source: `https://github.com/${link.slug}`,
    local_path: link.target,
    scanned: `${today()} ${now()}`,
    files,
  }, null, 2));

  console.log(`  Manifest: ${manifest}`);
  appendFileSync(join(logDir, `reunion-${today()}.log`), `- ${link.slug}: reunion at ${now()}\n`);

  // Offload unless --keep
  if (!keep) {
    const { unlinkSync } = await import("fs");
    unlinkSync(link.path);
    console.log(`  Offloaded (use --keep to retain)`);
  }
}

async function reunionAll() {
  const allLinks = [
    ...(await getSymlinks(learnDir)),
    ...(await getSymlinks(incubateDir)),
  ];
  
  const unique = [...new Set(allLinks.map((l) => l.slug))];
  console.log(`Found ${unique.length} projects\n`);

  for (const slug of unique) {
    await reunionSingle(slug);
    console.log("---");
  }
}

if (slug === "all") {
  await reunionAll();
} else {
  await reunionSingle(slug);
}
