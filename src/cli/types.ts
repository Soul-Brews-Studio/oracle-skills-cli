export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string;
  commandsDir?: string; // Separate commands directory (OpenCode uses .opencode/command/)
  globalCommandsDir?: string;
  useFlatFiles?: boolean; // Use skillname.md instead of skillname/SKILL.md (OpenCode commands)
  commandsOptIn?: boolean; // Only install commands with --commands flag (default: false = always install)
  commandFormat?: 'md' | 'toml'; // Command stub format (default: 'md')
  // #330: federated agents are third-party (thClaws, opencode, copilot, openclaw),
  // not the host. Excluded from auto-detect default set; require explicit -a or
  // --with-<name> flag to opt in. Host agents (Anthropic — claude-code, codex)
  // remain auto-detected. See also: getDefaultAgents() in agents.ts.
  federated?: boolean;
  detectInstalled: () => boolean;
}

export type AgentType =
  | 'opencode'
  | 'claude-code'
  | 'codex'
  | 'hermes'
  | 'cursor'
  | 'amp'
  | 'kilo'
  | 'roo'
  | 'goose'
  | 'gemini'
  | 'antigravity'
  | 'copilot'
  | 'openclaw'
  | 'droid'
  | 'windsurf'
  | 'cline'
  | 'aider'
  | 'continue'
  | 'zed'
  | 'thclaws'
  | 'grok';

export interface Skill {
  name: string;
  description: string;
  path: string;
  hidden?: boolean; // If true, install SKILL.md but skip command stub (hidden from autocomplete)
  secret?: boolean; // If true, excluded from ALL profiles — install only by name (-s flag)
  zombie?: boolean; // If true, excluded from ALL profiles — internal development candidates, not for users
}

import type { ShellMode } from './fs-utils.js';

export interface InstallOptions {
  global?: boolean;
  skills?: string[];
  profile?: string;
  profileExplicit?: boolean; // #285: true when --profile was explicitly passed on CLI (not default)
  yes?: boolean;
  agents?: string[];
  commands?: boolean; // Also install command stubs (for agents with commandsOptIn)
  forceGlobal?: boolean; // #230 Override local-skill-precedence check and install global anyway
  shellMode?: ShellMode;
  thclawsOnly?: boolean; // thClaws target — write ONLY to thClaws paths (testing)
  // #330: opt-in flags for federated agents (replaces noThclaws semantics)
  withThclaws?: boolean; // include thClaws if binary detected (federated agents are opt-in)
  allDetected?: boolean; // escape hatch: install to all detected agents incl. federated (for CI)
}
