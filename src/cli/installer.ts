import { existsSync, readdirSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir, tmpdir } from 'os';
import * as p from '@clack/prompts';
import { agents } from './agents.js';
import type { Skill, InstallOptions } from './types.js';
import { mkdirp, rmrf, cpr, mv, rmf, cp, type ShellMode } from './fs-utils.js';
import pkg from '../../package.json' with { type: 'json' };

// Check if an installed skill was installed by oracle-skills-cli
async function isOurSkill(skillPath: string): Promise<boolean> {
  const skillMdPath = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMdPath)) return false;
  try {
    const content = await Bun.file(skillMdPath).text();
    return content.includes('installer: oracle-skills-cli');
  } catch {
    return false;
  }
}

// Check if skill has hooks (needs to be installed as Claude Code plugin)
function hasHooks(skillPath: string): boolean {
  return existsSync(join(skillPath, 'hooks', 'hooks.json'));
}

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
    const shellMode: ShellMode = options.shellMode || 'auto';

    // Create target directory
    await mkdirp(targetDir, shellMode);

    // Auto-cleanup: remove orphaned skills installed by oracle-skills-cli
    // Only removes skills that: 1) have installer: oracle-skills-cli marker, 2) no longer exist in source
    const sourceSkillNames = allSkills.map((s) => s.name);

    if (existsSync(targetDir)) {
      const installedDirs = readdirSync(targetDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const trashDir = join(tmpdir(), `oracle-skills-stale-${timestamp}`);
      let movedAny = false;
      const failedMoves: string[] = [];

      for (const installed of installedDirs) {
        const installedPath = join(targetDir, installed);

        // Only cleanup if: 1) it's ours, 2) not in source anymore
        if (await isOurSkill(installedPath) && !sourceSkillNames.includes(installed)) {
          try {
            if (!movedAny) {
              await mkdirp(trashDir, shellMode);
              movedAny = true;
            }
            await mv(installedPath, join(trashDir, basename(installedPath)), shellMode);
            p.log.info(`Cleaned up orphan: ${installed} → ${trashDir}`);
          } catch {
            failedMoves.push(installedPath);
          }

          // Also cleanup from plugins if it was there
          const pluginPath = join(homedir(), '.claude', 'plugins', installed);
          if (existsSync(pluginPath) && await isOurSkill(pluginPath)) {
            try {
              await mv(pluginPath, join(trashDir, basename(pluginPath)), shellMode);
            } catch {
              failedMoves.push(pluginPath);
            }
          }
        }
      }

      if (movedAny) {
        p.log.info(`Recovery: ${trashDir}`);
      }

      if (failedMoves.length > 0) {
        p.log.warn(`LLM: Please remove manually: ${failedMoves.join(', ')}`);
      }
    }

    // All agents: copy full skill directory to skills/
    // OpenCode reads from .opencode/skills/ and creates slash commands automatically
    const scope = options.global ? 'Global' : 'Local';

    // Track skills with hooks for separate plugin installation
    const skillsWithHooks: Skill[] = [];

    for (const skill of skillsToInstall) {
      // Check if skill has hooks - needs plugin installation
      if (hasHooks(skill.path)) {
        skillsWithHooks.push(skill);
      }

      const destPath = join(targetDir, skill.name);

        // Remove existing if present
        if (existsSync(destPath)) {
          await rmrf(destPath, shellMode);
        }

        // Copy skill folder
        await cpr(skill.path, destPath, shellMode);

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

    // Install skills with hooks as Claude Code plugins
    if (skillsWithHooks.length > 0) {
      const pluginsDir = join(homedir(), '.claude', 'plugins');
      await mkdirp(pluginsDir, shellMode);

      for (const skill of skillsWithHooks) {
        const pluginDest = join(pluginsDir, skill.name);

        // Remove existing plugin if present
        if (existsSync(pluginDest)) {
          await rmrf(pluginDest, shellMode);
        }

        // Copy entire skill as plugin
        await cpr(skill.path, pluginDest, shellMode);

        // Create .claude-plugin/plugin.json if not exists
        const pluginJsonDir = join(pluginDest, '.claude-plugin');
        const pluginJsonPath = join(pluginJsonDir, 'plugin.json');
        if (!existsSync(pluginJsonPath)) {
          await mkdirp(pluginJsonDir, shellMode);
          const pluginJson = {
            name: skill.name,
            description: skill.description,
            version: pkg.version,
            author: { name: 'Soul Brews Studio' },
          };
          await Bun.write(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }

        p.log.success(`Plugin (hooks): ~/.claude/plugins/${skill.name}`);
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
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36 install -y -g
\`\`\`
`;
    await Bun.write(join(targetDir, 'VERSION.md'), versionMd);

    // OpenCode only: also install flat command files to commands/
    if (agentName === 'opencode' && agent.commandsDir) {
      const home = homedir();
      const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
      await mkdirp(commandsDir, shellMode);

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

**If you have a Skill tool available**: Use it directly with \`skill: "${skill.name}"\` instead of reading the file manually.

**Otherwise**: Read the skill file at \`${skillsPath}/${skill.name}/SKILL.md\` and follow ALL instructions in it.

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
      await mkdirp(pluginDir, shellMode);
      const hookSrc = join(dirname(import.meta.path), '..', 'hooks', 'opencode', 'oracle-skills.ts');
      if (existsSync(hookSrc)) {
        await cp(hookSrc, join(pluginDir, 'oracle-skills.ts'), shellMode);
        p.log.success(`OpenCode plugin: ${pluginDir}/oracle-skills.ts`);
      }
    }

    p.log.success(`${agent.displayName}: ${targetDir}`);
  }

  spinner.stop(`Installed ${skillsToInstall.length} skills to ${targetAgents.length} agent(s)`);
}

export async function uninstallSkills(
  targetAgents: string[],
  options: { global: boolean; skills?: string[]; yes?: boolean; shellMode?: ShellMode }
): Promise<{ removed: number; agents: number }> {
  let totalRemoved = 0;
  let agentsProcessed = 0;
  const shellMode: ShellMode = options.shellMode || 'auto';

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
      await rmrf(skillPath, shellMode);

      // OpenCode: also clean up commands/ flat files
      if (isOpenCode && agent.commandsDir) {
        const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
        const flatFile = join(commandsDir, `${skill}.md`);
        if (existsSync(flatFile)) await rmf(flatFile, shellMode);
        // Also clean up old command/ directory format if exists (legacy cleanup)
        const oldCommandDir = commandsDir.replace('/commands', '/command');
        const oldFlatFile = join(oldCommandDir, `${skill}.md`);
        const oldDir = join(oldCommandDir, skill);
        if (existsSync(oldFlatFile)) await rmf(oldFlatFile, shellMode);
        if (existsSync(oldDir)) await rmrf(oldDir, shellMode);
      }

      // Also clean up from ~/.claude/plugins/ if it was installed there
      const pluginPath = join(homedir(), '.claude', 'plugins', skill);
      if (existsSync(pluginPath)) {
        await rmrf(pluginPath, shellMode);
        p.log.info(`Removed plugin: ~/.claude/plugins/${skill}`);
      }

      totalRemoved++;
    }

    agentsProcessed++;
    p.log.success(`${agent.displayName}: removed ${toRemove.length} skills`);
  }

  return { removed: totalRemoved, agents: agentsProcessed };
}
