import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import type { AgentConfig, AgentType } from './types.js';

const home = homedir();
const hermesHome = process.env.HERMES_HOME || join(home, '.hermes');
const hermesProfile =
  process.env.HERMES_ACTIVE_PROFILE || process.env.HERMES_PROFILE || 'default';

export function thClawsAvailable(): boolean {
  try {
    execSync('command -v thclaws', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export function grokAvailable(): boolean {
  try {
    execSync('command -v grok', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

export const agents: Record<AgentType, AgentConfig> = {
  opencode: {
    name: 'opencode',
    displayName: 'OpenCode',
    skillsDir: '.opencode/skills', // skills/<name>/SKILL.md (agent skills)
    globalSkillsDir: join(home, '.config/opencode/skills'),
    commandsDir: '.opencode/commands', // commands/<name>.md (slash commands)
    globalCommandsDir: join(home, '.config/opencode/commands'),
    useFlatFiles: true, // Commands use flat <name>.md files
    federated: true, // #330: third-party — explicit -a opencode or --all-detected
    detectInstalled: () => existsSync(join(home, '.config/opencode')),
  },
  'claude-code': {
    name: 'claude-code',
    displayName: 'Claude Code',
    skillsDir: '.claude/skills',
    globalSkillsDir: join(home, '.claude/skills'),
    commandsDir: '.claude/commands',
    globalCommandsDir: join(home, '.claude/commands'),
    useFlatFiles: true,
    commandsOptIn: true, // Only install commands with --commands flag
    detectInstalled: () => existsSync(join(home, '.claude')),
  },
  codex: {
    name: 'codex',
    displayName: 'Codex',
    skillsDir: '.codex/skills',
    globalSkillsDir: join(home, '.codex/skills'),
    commandsDir: '.codex/prompts',
    globalCommandsDir: join(home, '.codex/prompts'),
    useFlatFiles: true,
    detectInstalled: () => existsSync(join(home, '.codex')),
  },
  hermes: {
    name: 'hermes',
    displayName: 'Hermes Agent',
    skillsDir: `.hermes/profiles/${hermesProfile}/skills/oracle`,
    globalSkillsDir: join(
      hermesHome,
      'profiles',
      hermesProfile,
      'skills',
      'oracle'
    ),
    detectInstalled: () => existsSync(hermesHome),
  },
  cursor: {
    name: 'cursor',
    displayName: 'Cursor',
    skillsDir: '.cursor/skills',
    globalSkillsDir: join(home, '.cursor/skills'),
    detectInstalled: () => existsSync(join(home, '.cursor')),
  },
  amp: {
    name: 'amp',
    displayName: 'Amp',
    skillsDir: '.agents/skills',
    globalSkillsDir: join(home, '.config/agents/skills'),
    detectInstalled: () => existsSync(join(home, '.config/amp')),
  },
  kilo: {
    name: 'kilo',
    displayName: 'Kilo Code',
    skillsDir: '.kilocode/skills',
    globalSkillsDir: join(home, '.kilocode/skills'),
    detectInstalled: () => existsSync(join(home, '.kilocode')),
  },
  roo: {
    name: 'roo',
    displayName: 'Roo Code',
    skillsDir: '.roo/skills',
    globalSkillsDir: join(home, '.roo/skills'),
    detectInstalled: () => existsSync(join(home, '.roo')),
  },
  goose: {
    name: 'goose',
    displayName: 'Goose',
    skillsDir: '.goose/skills',
    globalSkillsDir: join(home, '.config/goose/skills'),
    detectInstalled: () => existsSync(join(home, '.config/goose')),
  },
  gemini: {
    name: 'gemini',
    displayName: 'Gemini CLI',
    skillsDir: '.gemini/skills',
    globalSkillsDir: join(home, '.gemini/skills'),
    commandsDir: '.gemini/commands',
    globalCommandsDir: join(home, '.gemini/commands'),
    useFlatFiles: true,
    commandFormat: 'toml',
    detectInstalled: () => existsSync(join(home, '.gemini')),
  },
  antigravity: {
    name: 'antigravity',
    displayName: 'Antigravity',
    skillsDir: '.agent/skills',
    globalSkillsDir: join(home, '.gemini/antigravity/skills'),
    detectInstalled: () => existsSync(join(home, '.gemini/antigravity')),
  },
  copilot: {
    name: 'copilot',
    displayName: 'GitHub Copilot',
    skillsDir: '.github/skills',
    globalSkillsDir: join(home, '.copilot/skills'),
    federated: true, // #330: third-party — explicit -a copilot or --all-detected
    detectInstalled: () => existsSync(join(home, '.copilot')),
  },
  openclaw: {
    name: 'openclaw',
    displayName: 'OpenClaw',
    skillsDir: 'skills',
    globalSkillsDir: join(home, '.openclaw/skills'),
    federated: true, // #330: third-party — explicit -a openclaw or --all-detected
    detectInstalled: () => existsSync(join(home, '.openclaw')),
  },
  droid: {
    name: 'droid',
    displayName: 'Droid',
    skillsDir: '.factory/skills',
    globalSkillsDir: join(home, '.factory/skills'),
    detectInstalled: () => existsSync(join(home, '.factory')),
  },
  windsurf: {
    name: 'windsurf',
    displayName: 'Windsurf',
    skillsDir: '.windsurf/skills',
    globalSkillsDir: join(home, '.codeium/windsurf/skills'),
    detectInstalled: () => existsSync(join(home, '.codeium/windsurf')),
  },
  cline: {
    name: 'cline',
    displayName: 'Cline',
    skillsDir: '.cline/skills',
    globalSkillsDir: join(home, '.cline/skills'),
    detectInstalled: () => existsSync(join(home, '.cline')),
  },
  aider: {
    name: 'aider',
    displayName: 'Aider',
    skillsDir: '.aider/skills',
    globalSkillsDir: join(home, '.aider/skills'),
    detectInstalled: () => existsSync(join(home, '.aider')),
  },
  continue: {
    name: 'continue',
    displayName: 'Continue',
    skillsDir: '.continue/skills',
    globalSkillsDir: join(home, '.continue/skills'),
    detectInstalled: () => existsSync(join(home, '.continue')),
  },
  zed: {
    name: 'zed',
    displayName: 'Zed',
    skillsDir: '.zed/skills',
    globalSkillsDir: join(home, '.zed/skills'),
    detectInstalled: () => existsSync(join(home, '.zed')),
  },
  grok: {
    name: 'grok',
    displayName: 'Grok CLI',
    skillsDir: '.grok/skills',
    globalSkillsDir: join(home, '.grok/skills'),
    detectInstalled: () =>
      existsSync(join(home, '.grok')) || grokAvailable(),
  },
  thclaws: {
    name: 'thclaws',
    displayName: 'thClaws',
    // Project-scoped install is intentionally out of scope for now — project
    // owners make that decision manually. Only user-global path is supported.
    // skillsDir is kept for the install path resolver but is never written to
    // unless someone passes -g (which is the documented usage).
    skillsDir: '.thclaws/skills',
    globalSkillsDir: join(home, '.config/thclaws/skills'),
    federated: true, // #330: third-party — explicit -a thclaws, --with-thclaws, or --all-detected
    // Detect by binary presence rather than config-dir presence: thClaws may
    // exist on PATH before the user has ever created ~/.config/thclaws.
    detectInstalled: () => thClawsAvailable(),
  },
};

/**
 * Default agents to install to (unless --agent overrides).
 *
 * #330: federated agents (thclaws, opencode, copilot, openclaw) are NOT here —
 * they require explicit opt-in via `-a <name>`, `--with-thclaws`, or
 * `--all-detected`. Only host Anthropic agents auto-install.
 *
 * Original federation contract (#324) shipped thclaws in this list; #330
 * inverts that to make federation install deliberate rather than implicit.
 */
export const defaultAgentNames = ['claude-code', 'codex'];

export function detectInstalledAgents(): string[] {
  return Object.entries(agents)
    .filter(([_, config]) => config.detectInstalled())
    .map(([name]) => name);
}

/**
 * Get default agents to auto-install to.
 *
 * #330: filters federated agents OUT of the auto-detect set. They remain
 * available via explicit `-a <name>` or `--with-<name>` / `--all-detected`.
 */
export function getDefaultAgents(): string[] {
  const installed = detectInstalledAgents();
  // Exclude federated agents — they're opt-in only
  const nonFederated = installed.filter(
    (a) => !agents[a as AgentType]?.federated
  );
  const defaults = defaultAgentNames.filter((a) => nonFederated.includes(a));
  return defaults.length > 0 ? defaults : nonFederated;
}

export function getAgentNames(): string[] {
  return Object.keys(agents);
}
