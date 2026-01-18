#!/usr/bin/env bun
import { program } from 'commander';
import * as p from '@clack/prompts';
import { agents, detectInstalledAgents, getAgentNames } from './agents.js';
import { cloneRepo, listSkills, installSkills, uninstallSkills, cleanup } from './installer.js';
import pkg from '../package.json' with { type: 'json' };

const VERSION = pkg.version;

program
  .name('oracle-skills')
  .description('Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents')
  .version(VERSION);

// Install command (default)
program
  .command('install', { isDefault: true })
  .description('Install Oracle skills to agents')
  .option('-g, --global', 'Install to user directory instead of project')
  .option('-a, --agent <agents...>', 'Target specific agents (e.g., claude-code, opencode)')
  .option('-s, --skill <skills...>', 'Install specific skills by name')
  .option('-l, --list', 'List available skills without installing')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    p.intro('🔮 Oracle Skills Installer');

    let repoPath: string | null = null;

    try {
      // Clone the repo
      repoPath = await cloneRepo();

      // List mode - just show skills and exit
      if (options.list) {
        await listSkills(repoPath);
        p.outro('Use --skill <name> to install specific skills');
        return;
      }

      // Determine target agents
      let targetAgents: string[] = options.agent || [];

      if (targetAgents.length === 0) {
        // Auto-detect installed agents
        const detected = detectInstalledAgents();

        if (detected.length > 0) {
          p.log.info(`Detected agents: ${detected.map((a) => agents[a as keyof typeof agents]?.displayName).join(', ')}`);

          if (!options.yes) {
            const useDetected = await p.confirm({
              message: 'Install to detected agents?',
            });

            if (p.isCancel(useDetected)) {
              p.log.info('Cancelled');
              return;
            }

            if (useDetected) {
              targetAgents = detected;
            }
          } else {
            targetAgents = detected;
          }
        }

        // If still no agents, prompt user to select
        if (targetAgents.length === 0) {
          const selected = await p.multiselect({
            message: 'Select agents to install to:',
            options: Object.entries(agents).map(([key, config]) => ({
              value: key,
              label: config.displayName,
              hint: options.global ? config.globalSkillsDir : config.skillsDir,
            })),
            required: true,
          });

          if (p.isCancel(selected)) {
            p.log.info('Cancelled');
            return;
          }

          targetAgents = selected as string[];
        }
      }

      // Validate agent names
      const validAgents = getAgentNames();
      const invalidAgents = targetAgents.filter((a) => !validAgents.includes(a));
      if (invalidAgents.length > 0) {
        p.log.error(`Unknown agents: ${invalidAgents.join(', ')}`);
        p.log.info(`Valid agents: ${validAgents.join(', ')}`);
        return;
      }

      // Install skills
      await installSkills(repoPath, targetAgents, {
        global: options.global,
        skills: options.skill,
        yes: options.yes,
      });

      p.outro('✨ Oracle skills installed! Restart your agent to activate.');
    } catch (error) {
      p.log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    } finally {
      // Cleanup temp directory
      if (repoPath) {
        cleanup(repoPath);
      }
    }
  });

// Uninstall command
program
  .command('uninstall')
  .description('Remove installed Oracle skills')
  .option('-g, --global', 'Uninstall from user directory')
  .option('-a, --agent <agents...>', 'Target specific agents')
  .option('-s, --skill <skills...>', 'Remove specific skills only')
  .option('-y, --yes', 'Skip confirmation prompts')
  .action(async (options) => {
    p.intro('🔮 Oracle Skills Uninstaller');

    try {
      // Determine target agents
      let targetAgents: string[] = options.agent ? [...options.agent] : [];

      // Skip auto-detect if agents specified
      if (targetAgents.length > 0) {
        p.log.info(`Using specified agents: ${targetAgents.join(', ')}`);
      } else {
        const detected = detectInstalledAgents();
        if (detected.length > 0) {
          p.log.info(`Detected agents: ${detected.map((a) => agents[a as keyof typeof agents]?.displayName).join(', ')}`);
          targetAgents = detected;
        }
      }

      if (targetAgents.length === 0) {
        p.log.error('No agents detected. Use --agent to specify.');
        return;
      }

      // Confirm
      if (!options.yes) {
        const skillInfo = options.skill ? `skills: ${options.skill.join(', ')}` : 'all Oracle skills';
        const confirmed = await p.confirm({
          message: `Remove ${skillInfo} from ${targetAgents.length} agent(s)?`,
        });

        if (p.isCancel(confirmed) || !confirmed) {
          p.log.info('Cancelled');
          return;
        }
      }

      const spinner = p.spinner();
      spinner.start('Removing skills');

      const result = await uninstallSkills(targetAgents, {
        global: options.global,
        skills: options.skill,
        yes: options.yes,
      });

      spinner.stop(`Removed ${result.removed} skills from ${result.agents} agent(s)`);
      p.outro('✨ Skills removed. Restart your agent to apply changes.');
    } catch (error) {
      p.log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      process.exit(1);
    }
  });

// Agents command
program
  .command('agents')
  .description('List all supported agents')
  .action(() => {
    console.log('\nSupported agents:\n');
    for (const [key, config] of Object.entries(agents)) {
      const installed = config.detectInstalled() ? '✓' : ' ';
      console.log(`  [${installed}] ${key.padEnd(15)} ${config.displayName}`);
    }
    console.log('\n  ✓ = detected on this system\n');
  });

// List installed skills command
program
  .command('list')
  .description('Show installed Oracle skills')
  .option('-g, --global', 'Show global (user-level) skills')
  .option('-a, --agent <agents...>', 'Show skills for specific agents')
  .action(async (options) => {
    const { readdirSync, existsSync } = await import('fs');
    const { join } = await import('path');

    let targetAgents: string[] = options.agent || [];

    if (targetAgents.length === 0) {
      targetAgents = detectInstalledAgents();
    }

    if (targetAgents.length === 0) {
      console.log('\nNo agents detected. Use --agent to specify.\n');
      return;
    }

    console.log('\nInstalled Oracle skills:\n');

    let totalSkills = 0;

    for (const agentName of targetAgents) {
      const agent = agents[agentName as keyof typeof agents];
      if (!agent) continue;

      const skillsDir = options.global
        ? agent.globalSkillsDir
        : join(process.cwd(), agent.skillsDir);

      const scope = options.global ? '(global)' : '(local)';

      if (!existsSync(skillsDir)) {
        console.log(`  ${agent.displayName} ${scope}: (no skills directory)`);
        continue;
      }

      const skills = readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name);

      if (skills.length === 0) {
        console.log(`  ${agent.displayName} ${scope}: (empty)`);
      } else {
        console.log(`  ${agent.displayName} ${scope}: ${skills.length} skills`);
        for (const skill of skills) {
          console.log(`    - ${skill}`);
        }
        totalSkills += skills.length;
      }
      console.log('');
    }

    console.log(`Total: ${totalSkills} skills across ${targetAgents.length} agent(s)\n`);
  });

program.parse();
