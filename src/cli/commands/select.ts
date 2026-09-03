import type { Command } from 'commander';
import * as p from '@clack/prompts';
import { agents, detectInstalledAgents } from '../agents.js';
import { installSkills, discoverSkills } from '../installer.js';
import type { ShellMode } from '../fs-utils.js';
import type { Skill } from '../types.js';

export function selectableSkills(skills: Skill[]): Skill[] {
  return skills.filter((skill) => !skill.secret && !skill.explicitOnly);
}

export function selectableInitialValues(installed: Iterable<string>, visible: Skill[]): string[] {
  const visibleNames = new Set(visible.map((skill) => skill.name));
  return [...installed].filter((name) => visibleNames.has(name));
}

export function registerSelect(program: Command, version: string) {
  program
    .command('select')
    .description('Interactively select skills to install')
    .option('-g, --global', 'Install to user directory instead of project')
    .option('-a, --agent <agents...>', 'Target specific agents')
    .option('--commands', 'Also install command stubs to ~/.claude/commands/')
    .option('--shell', 'Force Bun.$ shell commands')
    .option('--no-shell', 'Force Node.js fs operations')
    .action(async (options) => {
      p.intro(`🔮 Oracle Skills Selector v${version}`);

      try {
        const allSkills = await discoverSkills();
        if (allSkills.length === 0) {
          p.log.error('No skills found');
          return;
        }

        const detected = detectInstalledAgents();
        let targetAgents: string[] = options.agent || detected;

        if (targetAgents.length === 0) {
          p.log.error('No agents detected. Use --agent to specify.');
          return;
        }

        // Find already-installed skills (check first detected agent)
        const firstAgent = agents[targetAgents[0] as keyof typeof agents];
        const installedDir = options.global ? firstAgent?.globalSkillsDir : undefined;
        const installedSet = new Set<string>();
        if (installedDir) {
          const { existsSync, readdirSync } = await import('fs');
          if (existsSync(installedDir)) {
            for (const d of readdirSync(installedDir, { withFileTypes: true })) {
              if (d.isDirectory() && !d.name.startsWith('.')) installedSet.add(d.name);
            }
          }
        }

        // Internal explicit-name-only skills must not leak through the picker:
        // selecting one here would bypass the exact `-s <name>` boundary.
        const visibleSkills = selectableSkills(allSkills);
        const selected = await p.multiselect({
          message: `Select skills to install (${visibleSkills.length} available):`,
          options: visibleSkills
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((s) => ({
              value: s.name,
              label: s.name,
              hint: s.description.split('.')[0].substring(0, 50),
            })),
          initialValues: selectableInitialValues(installedSet, visibleSkills),
          required: true,
        });

        if (p.isCancel(selected)) {
          p.log.info('Cancelled');
          return;
        }

        const selectedSkills = selected as string[];
        p.log.info(`Selected ${selectedSkills.length} skills for ${targetAgents.length} agent(s)`);

        const shellMode: ShellMode = options.shell ? 'shell'
          : options.noShell ? 'no-shell'
          : 'auto';

        await installSkills(targetAgents, {
          global: options.global,
          skills: selectedSkills,
          yes: true,
          commands: options.commands,
          shellMode,
        });

        p.outro(`✨ Installed ${selectedSkills.length} skills! Restart your agent to activate.`);
      } catch (error) {
        p.log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });
}
