#!/usr/bin/env node
import { program } from 'commander';
import * as p from '@clack/prompts';
import { agents, detectInstalledAgents, getAgentNames } from './agents.js';
import { cloneRepo, listSkills, installSkills, cleanup } from './installer.js';

const VERSION = '1.0.0';

program
  .name('oracle-skills')
  .description('Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents')
  .version(VERSION)
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

// Add agents subcommand
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

program.parse();
