import type { Command } from 'commander';
import { join } from 'path';
import { existsSync } from 'fs';
import * as p from '@clack/prompts';
import { agents, getDefaultAgents, getAgentNames, detectInstalledAgents, thClawsAvailable } from '../agents.js';
import { listSkills, installSkills, discoverSkills } from '../installer.js';
import { profiles, resolveProfile } from '../../profiles.js';
import type { ShellMode } from '../fs-utils.js';

/**
 * #337 — Preview the skills that would be installed, so the install prompt
 * can show the list BEFORE asking the user to confirm. Mirrors (a subset of)
 * the resolution logic in `installSkills`:
 *   - explicit `-s <names>` without explicit `--profile`  →  just those names
 *     (the installer is also additive with already-installed skills, but for
 *     preview purposes we show what the user explicitly asked for).
 *   - otherwise  →  profile-resolved set ∪ any `-s` extras.
 * Secrets, zombies, and explicit-only skills are filtered out the same way
 * `resolveProfile` filters them.
 */
async function computePreviewSkillNames(
  options: { profile?: string; skill?: string[] },
  cmd: any,
): Promise<string[]> {
  const profileSource = cmd?.getOptionValueSource?.('profile') ?? 'default';
  const profileExplicit = profileSource === 'cli';

  const all = await discoverSkills();
  const allNames = all.map((s) => s.name);
  const secretNames = all.filter((s) => s.secret).map((s) => s.name);
  const zombieNames = all.filter((s) => s.zombie).map((s) => s.name);
  const explicitOnlyNames = all.filter((s) => s.explicitOnly).map((s) => s.name);

  // -s without explicit --profile: additive mode — show the explicit picks.
  if (options.skill && options.skill.length > 0 && !profileExplicit) {
    return [...new Set(options.skill)];
  }

  const resolved = resolveProfile(
    options.profile || 'minimal',
    allNames,
    secretNames,
    zombieNames,
    explicitOnlyNames,
  );
  const profileSkills = resolved ?? allNames.filter(
    (s) => !secretNames.includes(s) && !zombieNames.includes(s) && !explicitOnlyNames.includes(s),
  );
  const extras = options.skill || [];
  return [...new Set([...profileSkills, ...extras])];
}

export function registerInstall(program: Command, version: string) {
  program
    .command('install', { isDefault: true })
    .description('Install Oracle skills to agents')
    .option('-g, --global', 'Install to user directory instead of project')
    // #331: -l is explicit-local symmetric to -g. No flag still defaults to local
    // for back-compat. Conflict with -g caught below.
    .option('-l, --local', 'Install to project .claude/skills/ (explicit form of the default)')
    .option('-a, --agent <agents...>', 'Target specific agents (e.g., claude-code, opencode)')
    .option('-s, --skill <skills...>', 'Install specific skills by name')
    .option('-p, --profile <name>', 'Install a skill profile (minimal, standard, full, lab)', 'minimal')
    // #331: --list moved off -l to free it for --local. Long form only.
    .option('--list', 'List available skills without installing')
    .option('-y, --yes', 'Skip confirmation prompts')
    .option('--with-commands', 'Also install command stubs to ~/.claude/commands/')
    .option('--force-global', 'Install global skills even if a same-named local skill exists (#230)')
    // #330: federated agents are explicit opt-in. Old --no-thclaws semantics
    // are inverted into --with-thclaws (thClaws is no longer auto-detected).
    .option('--with-thclaws', 'Include thClaws if detected (federated agent — explicit opt-in)')
    .option('--thclaws-only', 'Install ONLY to thClaws paths (skips Claude Code, Codex, OpenCode, etc.)')
    .option('--all-detected', 'Install to ALL detected agents incl. federated (CI escape hatch)')
    .option('--shell', 'Force Bun.$ shell commands (use on Windows to test shell compatibility)')
    .option('--no-shell', 'Force Node.js fs operations (use on Unix if Bun.$ causes issues)')
    .action(async (options, cmd) => {
      p.intro(`🔮 Oracle Skills Installer v${version}`);

      try {
        // #331: -g + -l is a contradiction; fail fast with a clear message.
        if (options.global && options.local) {
          p.log.error('Cannot pass both --global (-g) and --local (-l) — pick one or omit both (default is local).');
          process.exit(1);
        }

        if (options.list) {
          await listSkills();
          p.outro('Use --skill <name> to install specific skills');
          return;
        }

        let targetAgents: string[] = options.agent || [];

        // --thclaws-only short-circuits everything: write ONLY to thClaws.
        // Useful for testing the thClaws path in isolation.
        if (options.thclawsOnly) {
          targetAgents = ['thclaws'];
        } else if (targetAgents.length === 0) {
          // #330: build the auto-detect set with explicit opt-ins layered on.
          // Base = getDefaultAgents() now filters federated out by default.
          let detected: string[];
          if (options.allDetected) {
            // Escape hatch: ALL detected including federated.
            detected = detectInstalledAgents();
          } else {
            detected = getDefaultAgents();
            // --with-thclaws: add thclaws to the auto set if binary is present.
            if (options.withThclaws && thClawsAvailable() && !detected.includes('thclaws')) {
              detected = [...detected, 'thclaws'];
            }
          }

          if (detected.length > 0) {
            p.log.info(`Detected agents: ${detected.map((a) => agents[a as keyof typeof agents]?.displayName).join(', ')}`);

            if (!options.yes) {
              // #337: show the skill list BEFORE asking to confirm — users
              // shouldn't have to consent without knowing what's coming.
              const previewSkills = await computePreviewSkillNames(options, cmd);
              if (previewSkills.length > 0) {
                const head = previewSkills.slice(0, 5).map((s) => `/${s}`).join(', ');
                const more = previewSkills.length > 5 ? ` (+${previewSkills.length - 5} more)` : '';
                p.log.info(`Skills to install (${previewSkills.length}): ${head}${more}`);
              }

              const useDetected = await p.confirm({
                message: previewSkills.length > 0
                  ? `Install ${previewSkills.length} skills to detected agents?`
                  : 'Install to detected agents?',
              });

              if (p.isCancel(useDetected)) {
                p.log.info('Cancelled');
                return;
              }

              if (useDetected) {
                targetAgents = detected;
              }
            } else {
              // #398: with -y (non-interactive), only update agents that ALREADY
              // have arra skills installed. Prevents cross-contamination where
              // /go update from Claude Code also writes to ~/.codex/skills/.
              // First install is always interactive (no -y) so user chooses.
              const alreadyInstalled = detected.filter((a) => {
                const agent = agents[a as keyof typeof agents];
                if (!agent) return false;
                const manifestPath = join(agent.globalSkillsDir, '.arra-oracle-skills.json');
                return existsSync(manifestPath);
              });
              targetAgents = alreadyInstalled.length > 0 ? alreadyInstalled : detected;
            }
          }

          if (targetAgents.length === 0) {
            // #459: -y means "don't ask me". Falling through to the picker here
            // made a non-interactive run hit EOF on stdin, resolve to nothing,
            // and exit 0 having installed NOTHING — so CI and `/go update`
            // automation read a silent no-op as success. Fail loudly instead,
            // and say what to pass, since "no agents detected" is usually a
            // fresh machine rather than a mistake.
            if (options.yes) {
              p.log.error(
                'No agents detected, so there is nothing to install.\n' +
                '  Name one explicitly, e.g.:  -a claude-code\n' +
                `  Supported: ${getAgentNames().join(', ')}`
              );
              process.exit(1);
            }

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

        const validAgents = getAgentNames();
        const invalidAgents = targetAgents.filter((a) => !validAgents.includes(a));
        if (invalidAgents.length > 0) {
          p.log.error(`Unknown agents: ${invalidAgents.join(', ')}`);
          p.log.info(`Valid agents: ${validAgents.join(', ')}`);
          return;
        }

        // Target-display: show user which targets are active vs skipped.
        // #330: thclaws is now opt-in. Make the skip-reason clearer for federated.
        const allDefault = ['claude-code', 'codex', 'thclaws'] as const;
        const reportLines: string[] = [`Installing skills to detected targets:`];
        for (const name of allDefault) {
          const agent = agents[name as keyof typeof agents];
          if (!agent) continue;
          const dir = options.global ? agent.globalSkillsDir : agent.skillsDir;
          if (targetAgents.includes(name)) {
            reportLines.push(`  ✓ ${agent.displayName.padEnd(12)} (${dir})`);
          } else {
            // Explain why it was skipped
            let reason = 'not selected';
            if (name === 'thclaws') {
              if (!thClawsAvailable()) reason = 'no binary detected — skipping';
              else if (!options.withThclaws && !options.allDetected) reason = 'federated — pass --with-thclaws or -a thclaws';
              else reason = 'skipped';
            } else if (!agent.detectInstalled()) {
              reason = 'no install detected — skipping';
            }
            reportLines.push(`  ✗ ${agent.displayName.padEnd(12)} (${reason})`);
          }
        }
        // Also list any non-default targets that were explicitly chosen
        for (const name of targetAgents) {
          if ((allDefault as readonly string[]).includes(name)) continue;
          const agent = agents[name as keyof typeof agents];
          if (!agent) continue;
          const dir = options.global ? agent.globalSkillsDir : agent.skillsDir;
          reportLines.push(`  ✓ ${agent.displayName.padEnd(12)} (${dir})`);
        }
        p.log.info(reportLines.join('\n'));

        const shellMode: ShellMode = options.shell ? 'shell'
          : options.noShell ? 'no-shell'
          : 'auto';

        if (options.profile && !profiles[options.profile]) {
          p.log.error(`Unknown profile: ${options.profile}`);
          p.log.info(`Available profiles: ${Object.keys(profiles).join(', ')}`);
          return;
        }

        // Detect whether --profile was explicitly passed on CLI or came from the default value.
        // Commander exposes this via getOptionValueSource: 'cli' = user typed it, 'default' = default.
        const profileSource = (cmd as any).getOptionValueSource?.('profile') ?? 'default';
        const profileExplicit = profileSource === 'cli';

        await installSkills(targetAgents, {
          global: options.global,
          skills: options.skill,
          profile: options.profile,
          profileExplicit,
          yes: options.yes,
          commands: options.withCommands,
          forceGlobal: options.forceGlobal,
          shellMode,
          thclawsOnly: !!options.thclawsOnly,
          withThclaws: !!options.withThclaws,
          allDetected: !!options.allDetected,
        });

        p.outro('✨ Oracle skills installed!');

        // Awakening — show CLI commands on first install
        console.log(`
  🔮 Oracle Skills v${version} — Awakened

  CLI Commands:
    arra-oracle-skills agents             # list supported agents
    arra-oracle-skills about              # prereqs + system status
    arra-oracle-skills list -g            # show installed skills
    arra-oracle-skills select -g          # interactive skill picker
    arra-oracle-skills install -g -y      # reinstall all skills
    arra-oracle-skills uninstall -g -y    # remove all skills

  Restart your agent to activate skills.
`);
      } catch (error) {
        p.log.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
      }
    });
}
