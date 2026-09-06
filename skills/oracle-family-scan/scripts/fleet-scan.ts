#!/usr/bin/env bun
// fleet-scan.ts - My Oracle fleet status via gh CLI
// Usage: bun fleet-scan.ts
//
// Part 1: Oracle births from arra-oracle-v3 issues (paginated — no limit cap)
// Part 2: Open issues across orgs
// Part 3: Recently pushed Oracle repos

import { $ } from "bun";

const ORACLE_REPO = "Soul-Brews-Studio/arra-oracle-v3";
const ORGS = ["Soul-Brews-Studio", "laris-co", "nazt"];
const BIRTH_PATTERN = /awaken|born|birth|enter.*chat|hello|สวัสดี|arrived/i;

// --- Part 1: Oracle Births from arra-oracle-v3 ---
type Birth = { number: number; title: string; date: string; author: string };

// Use gh api --paginate to fetch ALL issues (no 300-cap). GitHub /issues endpoint
// includes PRs too, but BIRTH_PATTERN naturally excludes them — PRs don't match
// "awaken|born|birth|..." title patterns.
//
// Emit one JSON object per line (NDJSON) rather than a "|"-joined string: issue
// titles routinely contain "|" (e.g. "Oracle | Born ..."), which shifted the
// fields on split and left `date` undefined — crashing at `b.date.slice` below.
const birthIssuesRaw = await $`gh api --paginate "repos/${ORACLE_REPO}/issues?state=all&per_page=100" --jq '.[] | {number, title, date: .created_at[:10], author: (.user.login // "unknown")} | @json'`.text();

const allBirths: Birth[] = birthIssuesRaw.trim().split("\n").filter(Boolean)
  .map(line => JSON.parse(line) as Birth)
  .filter(b => typeof b.title === "string" && typeof b.date === "string")
  .filter(b => BIRTH_PATTERN.test(b.title));

const uniqueAuthors = new Set(allBirths.map(b => b.author));

// By month
const byMonth = new Map<string, number>();
for (const b of allBirths) {
  const month = b.date.slice(0, 7);
  byMonth.set(month, (byMonth.get(month) || 0) + 1);
}

// Recent births (last 4 days)
const now = new Date();
const recentCutoff = new Date(now.getTime() - 4 * 86400000).toISOString().slice(0, 10);
const thisWeek = allBirths.filter(b => b.date >= recentCutoff);

// --- Part 2: Open Issues across orgs ---
type Issue = { repo: string; number: number; title: string; updated: string; labels: string };
const allIssues: Issue[] = [];

await Promise.all(
  ORGS.map(async (org) => {
    try {
      const repos = (await $`gh repo list ${org} --json name --limit 50 --jq '.[].name'`.text())
        .trim().split("\n").filter(Boolean);
      await Promise.all(
        repos.map(async (repo) => {
          try {
            const json = await $`gh issue list --repo ${org}/${repo} --state open --limit 10 --json number,title,updatedAt,labels`.quiet().json() as Array<{ number: number; title: string; updatedAt: string; labels: Array<{ name: string }> }>;
            for (const i of json) {
              allIssues.push({
                repo: `${org}/${repo}`,
                number: i.number,
                title: i.title.slice(0, 60),
                updated: i.updatedAt.split("T")[0],
                labels: i.labels.map(l => l.name).join(","),
              });
            }
          } catch {}
        })
      );
    } catch {}
  })
);

allIssues.sort((a, b) => b.updated.localeCompare(a.updated));

// --- Part 3: Recently pushed repos (Oracle pattern) ---
type RepoActivity = { name: string; pushed: string; daysAgo: number };
const recentRepos: RepoActivity[] = [];

await Promise.all(
  ORGS.map(async (org) => {
    try {
      const repos = await $`gh repo list ${org} --limit 100 --json nameWithOwner,pushedAt`.quiet().json() as Array<{ nameWithOwner: string; pushedAt: string }>;
      for (const r of repos) {
        const pushed = new Date(r.pushedAt);
        const daysAgo = Math.floor((now.getTime() - pushed.getTime()) / 86400000);
        if (daysAgo <= 14) {
          recentRepos.push({ name: r.nameWithOwner, pushed: r.pushedAt.split("T")[0], daysAgo });
        }
      }
    } catch {}
  })
);

recentRepos.sort((a, b) => a.daysAgo - b.daysAgo);

// --- Output ---
console.log("# My Oracle Fleet\n");

// Births summary
console.log(`## Oracle Family — ${allBirths.length} births, ${uniqueAuthors.size} unique humans\n`);
console.log("### Growth by Month\n");
console.log("| Month | Births |");
console.log("|-------|--------|");
for (const [month, count] of [...byMonth.entries()].sort()) {
  const bar = "█".repeat(Math.ceil(count / 2));
  console.log(`| ${month} | ${bar} ${count} |`);
}

if (thisWeek.length) {
  console.log(`\n### Recent Births (${thisWeek.length} in last 4 days)\n`);
  console.log("| # | Oracle | Author | Date |");
  console.log("|---|--------|--------|------|");
  for (const b of thisWeek) {
    // Extract oracle name: strip emoji, "Oracle", "Awakens", etc.
    let name = b.title
      .replace(/[\u{1F300}-\u{1FAD6}\u{2600}-\u{27BF}]/gu, "") // emoji
      .replace(/\[Birth\]\s*/i, "")
      .replace(/\bOracle\b/gi, "")
      .replace(/\b(Awakens?|Re-Awakens?|born|Birth|arrived|enter.*chat|has entered)\b/gi, "")
      .replace(/[—–\-:].*/g, "") // strip subtitle after dash
      .trim()
      .slice(0, 25);
    if (!name) name = b.title.slice(0, 25);
    console.log(`| #${b.number} | ${name} | @${b.author} | ${b.date} |`);
  }
}

// Recently active repos
if (recentRepos.length) {
  console.log(`\n## Active Repos (pushed in last 14 days: ${recentRepos.length})\n`);
  console.log("| Repo | Last Push | Days Ago |");
  console.log("|------|-----------|----------|");
  for (const r of recentRepos) {
    const age = r.daysAgo === 0 ? "today" : r.daysAgo === 1 ? "yesterday" : `${r.daysAgo}d`;
    console.log(`| ${r.name} | ${r.pushed} | ${age} |`);
  }
}

// Open issues
if (allIssues.length) {
  console.log(`\n## Open Issues (${allIssues.length})\n`);
  const byRepo = new Map<string, Issue[]>();
  for (const issue of allIssues) {
    const list = byRepo.get(issue.repo) || [];
    list.push(issue);
    byRepo.set(issue.repo, list);
  }
  for (const [repo, issues] of byRepo) {
    console.log(`### ${repo} (${issues.length})`);
    for (const i of issues) {
      const labels = i.labels ? ` [${i.labels}]` : "";
      console.log(`- #${i.number} ${i.title}${labels} *(${i.updated})*`);
    }
  }
}

if (!allBirths.length && !allIssues.length && !recentRepos.length) {
  console.log("No data found.");
}
