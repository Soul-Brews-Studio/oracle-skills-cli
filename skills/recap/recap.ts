#!/usr/bin/env bun
// Fast recap - no AI, just git status
// Usage: bun recap.ts

import { $ } from "bun";
import { existsSync, realpathSync } from "fs";
import { join } from "path";

// Get repo root
const root = (await $`git rev-parse --show-toplevel 2>/dev/null`.text()).trim() || process.cwd();
process.chdir(root);

// Gather git data
const branch = (await $`git branch --show-current`.text()).trim();
let ahead = "0";
try {
  ahead = (await $`git rev-list --count @{u}..HEAD 2>/dev/null`.text()).trim() || "0";
} catch {}
const lastCommit = (await $`git log --oneline -1`.text()).trim().slice(8, 68);

// Resolve ψ symlink (used for focus + schedule)
const psi = existsSync("ψ") ? realpathSync("ψ") : "ψ";

// Focus state
let focusState = "none";
let focusTask = "No active focus";
const focusFile = join(psi, "inbox", "focus-agent-main.md");
if (existsSync(focusFile)) {
  const focusContent = await Bun.file(focusFile).text();
  const stateMatch = focusContent.match(/^STATE:\s*(.+)/m);
  const taskMatch = focusContent.match(/^TASK:\s*(.+)/m);
  if (stateMatch) focusState = stateMatch[1].trim();
  if (taskMatch) focusTask = taskMatch[1].trim().slice(0, 80);
}

// Schedule
let schedule = "No schedule";
const scheduleFile = join(psi, "inbox", "schedule.md");
if (existsSync(scheduleFile)) {
  const match = (await Bun.file(scheduleFile).text()).split('\n')
    .find(l => l.startsWith('| ') && !l.includes('---') && !l.includes('Date'));
  if (match) schedule = match.replace(/\|/g, '').trim().slice(0, 120);
}

// Latest retro and handoff
const monthDir = `ψ/memory/retrospectives/${new Date().toISOString().slice(0, 7)}`;
let latestRetro = "none";
let latestHandoff = "none";

try {
  const retros = (await $`ls -t ${monthDir}/*/*.md 2>/dev/null`.text()).trim().split('\n');
  const retro = retros.find(f => !f.includes('CLAUDE'));
  if (retro) latestRetro = retro.split('/').pop() || "none";
} catch {}

try {
  const handoffs = (await $`ls -t ψ/inbox/handoff/*.md 2>/dev/null`.text()).trim().split('\n');
  const handoff = handoffs.find(f => !f.includes('CLAUDE'));
  if (handoff) latestHandoff = handoff.split('/').pop() || "none";
} catch {}

// Git status
await $`git config core.quotePath false`.quiet();
const status = (await $`git status --porcelain`.text()).trim();
const lines = status ? status.split('\n') : [];

const modified = lines.filter(l => l.startsWith(' M'));
const untracked = lines.filter(l => l.startsWith('??'));

// Session detection
let sessionLine = "";
try {
  const encodedPwd = root.replace(/^\//, '-').replace(/[\/.]/g, '-');
  const claudeHome = process.env.CLAUDE_CONFIG_DIR || `${process.env.HOME}/.claude`;
  const projectDir = `${claudeHome}/projects/${encodedPwd}`;
  if (existsSync(projectDir)) {
    const jsonls = (await $`ls -t ${projectDir}/*.jsonl 2>/dev/null`.text()).trim().split('\n').filter(Boolean);
    if (jsonls.length) {
      const envSessionId = process.env.CLAUDE_CODE_SESSION_ID;
      const envJsonl = envSessionId ? `${projectDir}/${envSessionId}.jsonl` : "";
      const chosenJsonl = envJsonl && existsSync(envJsonl) ? envJsonl : jsonls[0];
      const sessionId = chosenJsonl.split('/').pop()!.replace('.jsonl', '');
      const shortId = sessionId.slice(0, 8);
      const firstLine = (await $`head -1 ${chosenJsonl}`.text()).trim();
      let startStr = "";
      try {
        const ts = JSON.parse(firstLine).timestamp;
        if (ts) {
          const start = new Date(ts);
          const elapsed = Math.round((Date.now() - start.getTime()) / 60000);
          const h = Math.floor(elapsed / 60);
          const m = elapsed % 60;
          startStr = h > 0 ? `${h}h ${String(m).padStart(2, '0')}m` : `${m}m`;
        }
      } catch {}
      const repoName = root.split('/').pop() || '';
      sessionLine = `${shortId} | ${repoName}${startStr ? ` | ${startStr}` : ''}`;
    }
  }
} catch {}

// Output
const now = new Date();
const time = now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false });
const date = now.toLocaleDateString('en', { day: '2-digit', month: 'short', year: 'numeric' });

console.log("# RECAP");
console.log("");
if (sessionLine) console.log(`📡 Session: ${sessionLine}`);
console.log(`🕐 ${time} | ${date}`);
console.log("");
console.log("---");
console.log("");
console.log("## 🚧 FOCUS");
console.log(`\`${focusState}\` ${focusTask}`);
console.log("");
console.log("## 📅 TODAY");
console.log(schedule);
console.log("");
console.log(`## 📊 GIT: ${branch} (+${ahead} ahead)`);
console.log(`Last: ${lastCommit}`);
console.log("");

if (modified.length) {
  console.log(`**Modified** (${modified.length}):`);
  modified.forEach(l => console.log(`  ${l.slice(3)}`));
  console.log("");
}

if (untracked.length) {
  console.log(`**Untracked** (${untracked.length}):`);
  untracked.forEach(l => console.log(`  ${l.slice(3)}`));
  console.log("");
}

console.log("---");
console.log("");
console.log("## 📝 LAST SESSION");
console.log(`Retro: ${latestRetro}`);
console.log(`Handoff: ${latestHandoff}`);
