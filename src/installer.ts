import { $ } from 'bun';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import * as p from '@clack/prompts';
import { agents } from './agents.js';
import type { Skill, InstallOptions } from './types.js';
import pkg from '../package.json' with { type: 'json' };

// Skills are bundled in the repo
function getSkillsDir(): string {
  // Get directory relative to this file
  const thisFile = import.meta.path;
  return join(dirname(thisFile), '..', 'skills');
}

export async function discoverSkills(): Promise<Skill[]> {
  const skillsPath = getSkillsDir();

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
      const content = await Bun.file(skillMdPath).text();
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

export async function listSkills(): Promise<void> {
  const skills = await discoverSkills();

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
  targetAgents: string[],
  options: InstallOptions
): Promise<void> {
  const allSkills = await discoverSkills();

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

  for (const agentName of targetAgents) {
    const agent = agents[agentName as keyof typeof agents];
    if (!agent) {
      p.log.warn(`Unknown agent: ${agentName}`);
      continue;
    }

    const targetDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);

    // Create target directory
    await $`mkdir -p ${targetDir}`.quiet();

    // Copy each skill and inject version
    for (const skill of skillsToInstall) {
      const destPath = join(targetDir, skill.name);

      // Remove existing if present
      if (existsSync(destPath)) {
        await $`rm -rf ${destPath}`.quiet();
      }

      // Copy skill folder
      await $`cp -r ${skill.path} ${destPath}`.quiet();

      // Inject version into SKILL.md frontmatter
      const skillMdPath = join(destPath, 'SKILL.md');
      if (existsSync(skillMdPath)) {
        let content = await Bun.file(skillMdPath).text();
        // Add version after opening ---
        if (content.startsWith('---')) {
          content = content.replace(
            /^---\n/,
            `---\ninstaller: oracle-skills-cli v${pkg.version}\n`
          );
          await Bun.write(skillMdPath, content);
        }
      }
    }

    // Write manifest with version info
    const manifest = {
      version: pkg.version,
      installedAt: new Date().toISOString(),
      skills: skillsToInstall.map((s) => s.name),
      agent: agentName,
    };
    await Bun.write(join(targetDir, '.oracle-skills.json'), JSON.stringify(manifest, null, 2));

    // Write human-readable VERSION.md for agents to report
    const versionMd = `# Oracle Skills

Installed by: **oracle-skills-cli v${pkg.version}**
Installed at: ${new Date().toISOString()}
Agent: ${agent.displayName}
Skills: ${skillsToInstall.length}

## Report This Version

When asked about skills version, report:
\`\`\`
oracle-skills-cli v${pkg.version}
\`\`\`

## Installed Skills

${skillsToInstall.map((s) => `- ${s.name}`).join('\n')}

## Update Skills

\`\`\`bash
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli install -y -g
\`\`\`
`;
    await Bun.write(join(targetDir, 'VERSION.md'), versionMd);

    p.log.success(`${agent.displayName}: ${targetDir}`);
  }

  spinner.stop(`Installed ${skillsToInstall.length} skills to ${targetAgents.length} agent(s)`);
}

export async function uninstallSkills(
  targetAgents: string[],
  options: { global: boolean; skills?: string[]; yes?: boolean }
): Promise<{ removed: number; agents: number }> {
  let totalRemoved = 0;
  let agentsProcessed = 0;

  for (const agentName of targetAgents) {
    const agent = agents[agentName as keyof typeof agents];
    if (!agent) {
      p.log.warn(`Unknown agent: ${agentName}`);
      continue;
    }

    const targetDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);

    if (!existsSync(targetDir)) {
      continue;
    }

    // Get installed skills
    const installed = readdirSync(targetDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name);

    // Filter if specific skills requested
    const toRemove = options.skills
      ? installed.filter((s) => options.skills!.includes(s))
      : installed;

    if (toRemove.length === 0) continue;

    // Remove skills
    for (const skill of toRemove) {
      const skillPath = join(targetDir, skill);
      await $`rm -rf ${skillPath}`.quiet();
      totalRemoved++;
    }

    agentsProcessed++;
    p.log.success(`${agent.displayName}: removed ${toRemove.length} skills`);
  }

  return { removed: totalRemoved, agents: agentsProcessed };
}
