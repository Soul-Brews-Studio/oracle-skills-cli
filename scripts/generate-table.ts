import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SKILLS_DIR = join(process.cwd(), 'src', 'skills');

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
  // Remove "Use when..." and everything after
  let short = desc.split(/\.\s*Use when/i)[0].trim();
  
  // Remove trailing period
  short = short.replace(/\.$/, '');
  
  // If still too long, take first phrase before common separators
  if (short.length > MAX_DESC_LENGTH) {
    const separators = [' - ', ' — ', '. ', ', and ', ' and ', ' with ', ' via '];
    for (const sep of separators) {
      const idx = short.indexOf(sep);
      if (idx > 10 && idx < MAX_DESC_LENGTH) {
        short = short.substring(0, idx);
        break;
      }
    }
  }
  
  // Final truncation at word boundary if still too long
  if (short.length > MAX_DESC_LENGTH) {
    const truncated = short.substring(0, MAX_DESC_LENGTH);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > MAX_DESC_LENGTH * 0.6) {
      short = truncated.substring(0, lastSpace);
    } else {
      short = truncated;
    }
  }
  
  // Clean up trailing punctuation
  short = short.replace(/[,;:\s]+$/, '');
  
  return short;
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
  
  // Extract description from frontmatter
  const descMatch = frontmatter.match(/description:\s*(.+?)(?:\n|$)/);
  const rawDescription = descMatch ? descMatch[1].trim() : `${skillName} skill`;
  
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
  
  // Group by type priority: skill + subagent > skill + code > skill
  const subagent = skills.filter(s => s.type === 'skill + subagent').sort((a, b) => a.name.localeCompare(b.name));
  const withCode = skills.filter(s => s.type === 'skill + code').sort((a, b) => a.name.localeCompare(b.name));
  const skill = skills.filter(s => s.type === 'skill').sort((a, b) => a.name.localeCompare(b.name));
  
  // Generate table
  const lines: string[] = [
    '| # | Skill | Type | Description |',
    '|---|-------|------|-------------|',
  ];
  
  let num = 1;
  
  // Subagent group
  for (const s of subagent) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }

  // Skill + code group
  lines.push('| - |  |  |  |');
  for (const s of withCode) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }

  // Skill group
  lines.push('| - |  |  |  |');
  for (const s of skill) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }
  
  console.log(lines.join('\n'));
}

generateTable().catch(console.error);
