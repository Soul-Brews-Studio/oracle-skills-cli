import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { extractDescription } from '../src/cli/skill-source.js';

// Public shelf (skills/) once the move lands; vault (src/skills/) pre-move.
// The README table lists PUBLIC skills only — post-move that's the shelf,
// which also drops the secret release-* rows the old table leaked.
const SKILLS_DIR = existsSync(join(process.cwd(), 'skills'))
  ? join(process.cwd(), 'skills')
  : join(process.cwd(), 'src', 'skills');

// Max description length for compact display
const MAX_DESC_LENGTH = 45;

interface Skill {
  name: string;
  description: string;
  type: string;
  scriptCount: number;
}

async function countScripts(skillDir: string): Promise<number> {
  try {
    const files = await readdir(skillDir, { recursive: true });
    return files.filter(f => f.toString().endsWith('.ts') || f.toString().endsWith('.js')).length;
  } catch {
    return 0;
  }
}

function shortenDescription(desc: string): string {
  let short = desc.trim();

  // Strip the installer's own prefix — "[standard] v26.7.25-alpha.1900 G-SKLL | ..."
  // gets prepended to installed copies and leaks back in when a skill is
  // promoted from ~/.claude/skills into the repo.
  short = short.replace(/^\[[^\]]+\]\s*/, '').replace(/^v[\d.]+\S*\s*/, '').replace(/^G-SKLL\s*\|\s*/, '');

  // Strip YAML quoting. Without this, any description written as 'foo' or "foo"
  // rendered with a dangling quote — the table showed `"บำเพ็ญเพียร` and
  // `'Multi-perspective analysis`, which reads like the file is corrupted.
  short = short.replace(/^['"]/, '').replace(/['"]$/, '');

  // Drop the trigger half — everything from "Use when" / "TRIGGER" onward is
  // for the model, not for a human skimming the table.
  short = short.split(/\.\s*Use when/i)[0];
  short = short.split(/\s*TRIGGER(?:\s+when)?[:\s]/i)[0];
  short = short.trim().replace(/\.$/, '');

  if (short.length <= MAX_DESC_LENGTH) return short.replace(/[,;:\s]+$/, '');

  // Cut at a real clause boundary only. Earlier this also split on ", and",
  // " and ", " with ", " via " — which turned "Spawn, lead, and tear down a
  // team" into the meaningless "Spawn, lead".
  for (const sep of [' — ', ' - ', '. ']) {
    const idx = short.indexOf(sep);
    if (idx > 10 && idx < MAX_DESC_LENGTH) return short.substring(0, idx).replace(/[,;:\s]+$/, '');
  }

  // Otherwise truncate on a word boundary and SAY that it was truncated, so a
  // clipped phrase doesn't read as the whole description.
  const truncated = short.substring(0, MAX_DESC_LENGTH);
  const lastSpace = truncated.lastIndexOf(' ');
  const body = lastSpace > MAX_DESC_LENGTH * 0.6 ? truncated.substring(0, lastSpace) : truncated;
  return body.replace(/[,;:\s]+$/, '') + '…';
}

function isSubagent(frontmatter: string, body: string): boolean {
  // Check allowed-tools for Task in frontmatter
  if (/allowed-tools:[\s\S]*?- Task/i.test(frontmatter)) {
    return true;
  }

  // Check for actual Task tool invocation patterns (not just mentions)
  const taskToolPatterns = [
    /subagent_type\s*[=:]/i,          // Task tool parameter
    /Task\s+tool.*subagent/i,         // "Task tool with subagent"
    /launch\s+\d+\s+.*agent/i,        // "launch 3 haiku agents"
  ];

  return taskToolPatterns.some(p => p.test(body));
}

async function parseSkill(skillName: string): Promise<Skill | null> {
  const skillPath = join(SKILLS_DIR, skillName, 'SKILL.md');
  
  if (!existsSync(skillPath)) return null;
  
  const content = await readFile(skillPath, 'utf-8');
  const parts = content.split(/^---\s*$/m);
  
  if (parts.length < 3) return null;
  
  const frontmatter = parts[1];
  const body = parts.slice(2).join('---');
  
  // Extract description from frontmatter (block-scalar aware)
  const rawDescription = extractDescription(frontmatter) || `${skillName} skill`;
  
  // Shorten description
  const shortDesc = shortenDescription(rawDescription);
  
  // Count scripts
  const scriptCount = await countScripts(join(SKILLS_DIR, skillName));
  
  // Determine type
  let type: string;
  if (isSubagent(frontmatter, body)) {
    type = 'skill + subagent';
  } else if (scriptCount > 0) {
    type = 'skill + code';
  } else {
    type = 'skill';
  }
  
  return {
    name: skillName,
    description: shortDesc,
    type,
    scriptCount,
  };
}

async function generateTable() {
  const entries = await readdir(SKILLS_DIR, { withFileTypes: true });
  const skills: Skill[] = [];
  
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    
    const skill = await parseSkill(entry.name);
    if (skill) skills.push(skill);
  }
  
  // One flat A→Z list. This used to be three type buckets (subagent / code /
  // plain) separated by blank `| - |` spacer rows, which meant you could not
  // find a skill by name without knowing its type first — and the spacers broke
  // the row numbering into meaningless runs. Type is still a column, so nothing
  // is lost; it is just no longer the primary axis.
  skills.sort((a, b) => a.name.localeCompare(b.name));

  const lines: string[] = [
    '| # | Skill | Type | Description |',
    '|---|-------|------|-------------|',
  ];

  let num = 1;
  for (const s of skills) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }

  console.log(lines.join('\n'));
}

generateTable().catch(console.error);
