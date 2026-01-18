export interface AgentConfig {
  name: string;
  displayName: string;
  skillsDir: string;
  globalSkillsDir: string;
  detectInstalled: () => boolean;
}

export type AgentType =
  | 'opencode'
  | 'claude-code'
  | 'codex'
  | 'cursor'
  | 'amp'
  | 'kilo'
  | 'roo'
  | 'goose'
  | 'gemini'
  | 'antigravity'
  | 'copilot'
  | 'clawdbot'
  | 'droid'
  | 'windsurf';

export interface Skill {
  name: string;
  description: string;
  path: string;
}

export interface InstallOptions {
  global?: boolean;
  skills?: string[];
  yes?: boolean;
  agents?: string[];
}
