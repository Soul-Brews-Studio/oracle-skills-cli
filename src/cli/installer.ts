import { $ } from 'bun';
import { existsSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import * as p from '@clack/prompts';
import { agents } from './agents.js';
import type { Skill, InstallOptions } from './types.js';
import pkg from '../../package.json' with { type: 'json' };

// Skills are bundled in the repo
function getSkillsDir(): string {
  // Get directory relative to this file
  const thisFile = import.meta.path;
  return join(dirname(thisFile), '..', 'skills');
}

// Compiled stubs for flat file agents (OpenCode)
function getCommandsDir(): string {
  const thisFile = import.meta.path;
  return join(dirname(thisFile), '..', 'commands');
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

    // All agents: copy full skill directory to skills/
    // OpenCode reads from .opencode/skills/ and creates slash commands automatically
    const scope = options.global ? 'Global' : 'Local';

    for (const skill of skillsToInstall) {
      const destPath = join(targetDir, skill.name);

        // Remove existing if present
        if (existsSync(destPath)) {
          await $`rm -rf ${destPath}`.quiet();
        }

        // Copy skill folder
        await $`cp -r ${skill.path} ${destPath}`.quiet();

        // Inject version into SKILL.md frontmatter and description
        const skillMdPath = join(destPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          let content = await Bun.file(skillMdPath).text();
          if (content.startsWith('---')) {
            // Add installer field after opening ---
            content = content.replace(
              /^---\n/,
              `---\ninstaller: oracle-skills-cli v${pkg.version}\n`
            );
            // Prepend version AND scope to description (G=Global, L=Local, SKILL for other agents)
            const scopeChar = scope === 'Global' ? 'G' : 'L';
            content = content.replace(
              /^(description:\s*)(.+?)(\n)/m,
              `$1v${pkg.version} ${scopeChar}-SKLL | $2$3`
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
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.34 install -y -g
\`\`\`
`;
    await Bun.write(join(targetDir, 'VERSION.md'), versionMd);

    // OpenCode only: also install flat command files to commands/
    if (agentName === 'opencode' && agent.commandsDir) {
      const home = require('os').homedir();
      const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
      await $`mkdir -p ${commandsDir}`.quiet();

      const scopeChar = scope === 'Global' ? 'G' : 'L';
      const skillsPath = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
      
      for (const skill of skillsToInstall) {
        const skillMdPath = join(targetDir, skill.name, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          // Create stub that points to full skill in skills/
          const stubContent = `---
description: v${pkg.version} ${scopeChar}-CMD | ${skill.description}
allowed-tools:
  - Bash
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Task
  - WebFetch
---

# /${skill.name}

Execute the \`${skill.name}\` skill with args: \`$ARGUMENTS\`

**Skill file**: \`${skillsPath}/${skill.name}/SKILL.md\`

Read the skill file above and follow ALL instructions in it.

---
*oracle-skills-cli v${pkg.version}*
`;
          const commandPath = join(commandsDir, `${skill.name}.md`);
          await Bun.write(commandPath, stubContent);
        }
      }
      p.log.success(`OpenCode commands: ${commandsDir}`);

      // Install plugin if exists
      const pluginDir = options.global
        ? join(home, '.config/opencode/plugins')
        : join(process.cwd(), '.opencode/plugins');
      await $`mkdir -p ${pluginDir}`.quiet();
      const hookSrc = join(dirname(import.meta.path), '..', 'hooks', 'opencode', 'oracle-skills.ts');
      if (existsSync(hookSrc)) {
        await $`cp ${hookSrc} ${join(pluginDir, 'oracle-skills.ts')}`.quiet();
        p.log.success(`OpenCode plugin: ${pluginDir}/oracle-skills.ts`);
      }
    }

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

    // Get installed skills (all agents use directories now)
    const entries = readdirSync(targetDir, { withFileTypes: true });
    const isOpenCode = agentName === 'opencode';
    
    const installed = entries
      .filter((d) => {
        if (d.name.startsWith('.')) return false;
        if (d.name === 'VERSION.md') return false;
        return d.isDirectory();
      })
      .map((d) => d.name)

    // Filter if specific skills requested
    const toRemove = options.skills
      ? installed.filter((s) => options.skills!.includes(s))
      : installed;

    if (toRemove.length === 0) continue;

    // Remove skills
    for (const skill of toRemove) {
      const skillPath = join(targetDir, skill);
      await $`rm -rf ${skillPath}`.quiet();
      
      // OpenCode: also clean up commands/ flat files
      if (isOpenCode && agent.commandsDir) {
        const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
        const flatFile = join(commandsDir, `${skill}.md`);
        if (existsSync(flatFile)) await $`rm -f ${flatFile}`.quiet();
        // Also clean up old command/ directory format if exists (legacy cleanup)
        const oldCommandDir = commandsDir.replace('/commands', '/command');
        const oldFlatFile = join(oldCommandDir, `${skill}.md`);
        const oldDir = join(oldCommandDir, skill);
        if (existsSync(oldFlatFile)) await $`rm -f ${oldFlatFile}`.quiet();
        if (existsSync(oldDir)) await $`rm -rf ${oldDir}`.quiet();
      }
      totalRemoved++;
    }

    agentsProcessed++;
    p.log.success(`${agent.displayName}: removed ${toRemove.length} skills`);
  }

  return { removed: totalRemoved, agents: agentsProcessed };
}
