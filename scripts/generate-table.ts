import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const SKILLS_DIR = join(process.cwd(), 'src', 'skills');

// Skills that use Task tool (subagents)
const SUBAGENT_SKILLS = ['context-finder', 'learn', 'rrr', 'trace'];

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

async function parseSkill(skillName: string): Promise<Skill | null> {
  const skillPath = join(SKILLS_DIR, skillName, 'SKILL.md');
  
  if (!existsSync(skillPath)) return null;
  
  const content = await readFile(skillPath, 'utf-8');
  const parts = content.split(/^---\s*$/m);
  
  if (parts.length < 3) return null;
  
  const frontmatter = parts[1];
  const descMatch = frontmatter.match(/description:\s*(.+?)(?:\n|$)/);
  const rawDescription = descMatch ? descMatch[1].trim() : `${skillName} skill`;
  
  // Extract short description (before first period or "Use when")
  const shortDesc = rawDescription
    .split(/\. Use when|Use when/)[0]
    .replace(/\.$/, '')
    .trim();
  
  const scriptCount = await countScripts(join(SKILLS_DIR, skillName));
  
  let type: string;
  if (SUBAGENT_SKILLS.includes(skillName)) {
    type = 'subagent';
  } else if (scriptCount > 0) {
    type = `prompt + scripts (${scriptCount})`;
  } else {
    type = 'prompt';
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
  
  // Group by type priority: subagent > prompt + scripts > prompt
  const subagent = skills.filter(s => s.type === 'subagent').sort((a, b) => a.name.localeCompare(b.name));
  const withScripts = skills.filter(s => s.type.startsWith('prompt + scripts')).sort((a, b) => a.name.localeCompare(b.name));
  const prompt = skills.filter(s => s.type === 'prompt').sort((a, b) => a.name.localeCompare(b.name));
  
  // Generate table
  const lines: string[] = [
    '| # | Skill | Type | Description |',
    '|---|-------|------|-------------|',
  ];
  
  let num = 1;
  
  // Subagent group
  lines.push('|   | **— Subagent —** |  |  |');
  for (const s of subagent) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }
  
  // Prompt + Scripts group
  lines.push('|   | **— Prompt + Scripts —** |  |  |');
  for (const s of withScripts) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }
  
  // Prompt group
  lines.push('|   | **— Prompt —** |  |  |');
  for (const s of prompt) {
    lines.push(`| ${num++} | **${s.name}** | ${s.type} | ${s.description} |`);
  }
  
  console.log(lines.join('\n'));
}

generateTable().catch(console.error);
