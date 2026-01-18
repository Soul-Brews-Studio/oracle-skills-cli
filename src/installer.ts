import { execSync } from 'child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import * as p from '@clack/prompts';
import { agents } from './agents.js';
import type { Skill, InstallOptions } from './types.js';

const REPO = 'Soul-Brews-Studio/plugin-marketplace';
const SKILLS_PATH = 'oracle-skills/skills';

export async function cloneRepo(): Promise<string> {
  const spinner = p.spinner();
  spinner.start('Cloning Oracle skills repository');

  const tempDir = join(tmpdir(), `oracle-skills-${Date.now()}`);

  try {
    execSync(
      `git clone --depth 1 --filter=blob:none --sparse https://github.com/${REPO}.git "${tempDir}"`,
      { stdio: 'pipe' }
    );
    execSync(`git sparse-checkout set ${SKILLS_PATH}`, {
      cwd: tempDir,
      stdio: 'pipe',
    });
    spinner.stop('Repository cloned');
    return tempDir;
  } catch (error) {
    spinner.stop('Clone failed, trying full clone');
    execSync(`git clone --depth 1 https://github.com/${REPO}.git "${tempDir}"`, {
      stdio: 'pipe',
    });
    return tempDir;
  }
}

export function discoverSkills(repoPath: string): Skill[] {
  const skillsPath = join(repoPath, SKILLS_PATH);

  if (!existsSync(skillsPath)) {
    return [];
  }

  const skillDirs = readdirSync(skillsPath, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.') && d.name !== '_template')
    .map((d) => d.name);

  const skills: Skill[] = [];

  for (const name of skillDirs) {
    const skillMdPath = join(skillsPath, name, 'SKILL.md');
    if (existsSync(skillMdPath)) {
      const content = readFileSync(skillMdPath, 'utf-8');
      const descMatch = content.match(/description:\s*(.+)/);
      skills.push({
        name,
        description: descMatch?.[1]?.trim() || '',
        path: join(skillsPath, name),
      });
    }
  }

  return skills;
}

export async function listSkills(repoPath: string): Promise<void> {
  const skills = discoverSkills(repoPath);

  if (skills.length === 0) {
    p.log.warn('No skills found');
    return;
  }

  p.log.info(`Found ${skills.length} skills:\n`);

  for (const skill of skills) {
    console.log(`  ${skill.name}`);
    if (skill.description) {
      console.log(`    ${skill.description}\n`);
    }
  }
}

export async function installSkills(
  repoPath: string,
  targetAgents: string[],
  options: InstallOptions
): Promise<void> {
  const allSkills = discoverSkills(repoPath);

  if (allSkills.length === 0) {
    p.log.error('No skills found to install');
    return;
  }

  // Filter skills if specific ones requested
  let skillsToInstall = allSkills;
  if (options.skills && options.skills.length > 0) {
    skillsToInstall = allSkills.filter((s) => options.skills!.includes(s.name));
    if (skillsToInstall.length === 0) {
      p.log.error(`No matching skills found. Available: ${allSkills.map((s) => s.name).join(', ')}`);
      return;
    }
  }

  // Confirm installation
  if (!options.yes) {
    const agentList = targetAgents.map((a) => agents[a as keyof typeof agents]?.displayName || a).join(', ');
    const confirmed = await p.confirm({
      message: `Install ${skillsToInstall.length} skills to ${agentList}?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.log.info('Installation cancelled');
      return;
    }
  }

  const spinner = p.spinner();
  spinner.start('Installing skills');

  let installedCount = 0;

  for (const agentName of targetAgents) {
    const agent = agents[agentName as keyof typeof agents];
    if (!agent) {
      p.log.warn(`Unknown agent: ${agentName}`);
      continue;
    }

    const targetDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);

    // Create target directory
    mkdirSync(targetDir, { recursive: true });

    // Copy each skill
    for (const skill of skillsToInstall) {
      const destPath = join(targetDir, skill.name);

      // Remove existing if present
      if (existsSync(destPath)) {
        rmSync(destPath, { recursive: true });
      }

      cpSync(skill.path, destPath, { recursive: true });
      installedCount++;
    }

    p.log.success(`${agent.displayName}: ${targetDir}`);
  }

  spinner.stop(`Installed ${skillsToInstall.length} skills to ${targetAgents.length} agent(s)`);
}

export function cleanup(repoPath: string): void {
  try {
    rmSync(repoPath, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
}
