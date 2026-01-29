#!/usr/bin/env bun
// recap-rich.ts - Full context recap
import { $ } from "bun";
import { existsSync, readdirSync } from "fs";
import { join, basename } from "path";

const ROOT = process.env.ROOT || (await $`git rev-parse --show-toplevel`.text().catch(() => process.cwd())).trim();
await $`git -C ${ROOT} config core.quotePath false`.quiet().catch(() => {});

const now = new Date();
const date = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const time = now.toTimeString().slice(0, 5);
const month = now.toISOString().slice(0, 7);

console.log("# RECAP (Rich)");
console.log(`\n${time} | ${date}\n\n---\n`);

// Focus
console.log("## FOCUS");
const focusFile = join(ROOT, "ψ/inbox/focus-agent-main.md");
if (existsSync(focusFile)) {
  const content = await Bun.file(focusFile).text();
  const state = content.match(/^STATE:(.*)$/m)?.[1]?.trim() || "none";
  const task = content.match(/^TASK:(.*)$/m)?.[1]?.trim() || "No active focus";
  console.log(`\`${state}\` ${task}`);
} else {
  console.log("No focus file");
}

// Schedule
console.log("\n## TODAY");
const scheduleFile = join(ROOT, "ψ/inbox/schedule.md");
if (existsSync(scheduleFile)) {
  const schedule = await Bun.file(scheduleFile).text();
  const todayNum = now.getDate();
  const monthName = now.toLocaleDateString("en-US", { month: "short" });
  const matches = schedule.split("\n").filter((l) => 
    l.includes(monthName) && (l.includes(` ${todayNum} `) || l.includes(` ${todayNum + 1} `))
  ).slice(0, 3);
  console.log(matches.join("\n") || "No schedule");
}

// Git
console.log("\n## GIT");
console.log(await $`git -C ${ROOT} status -sb`.text());
console.log("**Last 3 commits:**");
console.log(await $`git -C ${ROOT} log --oneline -3`.text());

// Tracks
console.log("## TRACKS");
const tracksDir = join(ROOT, "ψ/inbox/tracks");
if (existsSync(tracksDir)) {
  const tracks = readdirSync(tracksDir)
    .filter((f) => f.endsWith(".md") && !f.includes("INDEX") && !f.includes("CLAUDE"))
    .slice(0, 6);
  for (const t of tracks) {
    const content = await Bun.file(join(tracksDir, t)).text();
    const id = t.match(/^(\d+)/)?.[1] || "-";
    const name = content.split("\n")[0]?.replace(/^# Track[^:]*: /, "") || t;
    console.log(`- ${id}: ${name}`);
  }
}

// Latest retro
console.log("\n---\n\n## LAST SESSION");
const retroDir = join(ROOT, `ψ/memory/retrospectives/${month}`);
if (existsSync(retroDir)) {
  const days = readdirSync(retroDir).filter((d) => !d.startsWith(".")).sort().reverse();
  for (const day of days) {
    const files = readdirSync(join(retroDir, day)).filter((f) => f.endsWith(".md") && !f.includes("CLAUDE"));
    if (files.length) {
      const retro = await Bun.file(join(retroDir, day, files[0])).text();
      console.log(`**From**: ${files[0]}\n`);
      const summary = retro.match(/## Session Summary\n([\s\S]*?)(?=\n## |$)/)?.[1]?.trim();
      if (summary) console.log(`**Summary**:\n${summary.split("\n").slice(0, 8).join("\n")}`);
      break;
    }
  }
}

// Handoff
const handoffDir = join(ROOT, "ψ/inbox/handoff");
if (existsSync(handoffDir)) {
  const handoffs = readdirSync(handoffDir).filter((f) => f.endsWith(".md") && !f.includes("CLAUDE")).sort().reverse();
  if (handoffs.length) {
    const content = await Bun.file(join(handoffDir, handoffs[0])).text();
    console.log(`\n**Handoff**: ${handoffs[0]}`);
    console.log(content.split("\n").slice(2, 20).join("\n"));
  }
}

// Context
console.log("\n---\n\n## CONTEXT\n");
const status = await $`git -C ${ROOT} status --porcelain`.text();
const modified = status.split("\n").filter((l) => l.startsWith(" M")).map((l) => l.slice(3));
const untracked = status.split("\n").filter((l) => l.startsWith("??")).map((l) => l.slice(3));

if (modified.length) console.log("**Modified**:\n" + modified.map((f) => `  ${f}`).join("\n"));
if (untracked.length) console.log("\n**Untracked**:\n" + untracked.map((f) => `  ${f}`).join("\n"));
