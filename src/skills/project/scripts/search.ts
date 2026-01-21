#!/usr/bin/env bun
// search.ts - Find repos (local ghq first, GitHub API fallback)
import { $ } from "bun";

const args = process.argv.slice(2);
const query = args[0];
const remote = args.includes("--remote");

if (!query) {
  console.log("Usage: bun search.ts <query> [--remote]");
  process.exit(1);
}

// List orgs mode
if (query === "--list-orgs") {
  console.log("Organizations:");
  const orgs = (await $`gh api user/orgs --jq '.[].login'`.text()).trim().split("\n").filter(Boolean);
  for (const org of orgs) {
    const count = await $`gh repo list ${org} --limit 1000 --json name --jq 'length'`.text().catch(() => "?");
    console.log(`  ${org} (${count.trim()} repos)`);
  }
  process.exit(0);
}

// Local search (ghq)
console.log(`Searching local: ${query}\n`);
const local = (await $`ghq list`.text().catch(() => ""))
  .split("\n")
  .filter((l) => l.toLowerCase().includes(query.toLowerCase()));

if (local.length) {
  console.log(`Found ${local.length} local:`);
  local.forEach((r) => console.log(`  ~/Code/${r}`));
  if (!remote) process.exit(0);
}

// Remote search - fallback or when --remote
if (remote || !local.length) {
  console.log("\nSearching GitHub...\n");

  const user = (await $`gh api user --jq '.login'`.text()).trim();
  console.log(`Personal (${user}):`);
  const personal = await $`gh repo list ${user} --limit 100 --json name --jq '.[].name'`.text().catch(() => "");
  personal.split("\n").filter((n) => n.toLowerCase().includes(query.toLowerCase())).forEach((n) => console.log(`  ${n}`));

  const orgs = (await $`gh api user/orgs --jq '.[].login'`.text()).trim().split("\n").filter(Boolean);
  for (const org of orgs) {
    const repos = await $`gh repo list ${org} --limit 100 --json name --jq '.[].name'`.text().catch(() => "");
    const matches = repos.split("\n").filter((n) => n.toLowerCase().includes(query.toLowerCase()));
    if (matches.length) {
      console.log(`\n${org}:`);
      matches.forEach((n) => console.log(`  ${org}/${n}`));
    }
  }
}

console.log("\nTo clone: /project learn owner/repo");
