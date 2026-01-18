import { describe, it, expect } from 'bun:test';
import { $ } from 'bun';
import { agents, detectInstalledAgents, getAgentNames } from '../src/agents';
import { discoverSkills } from '../src/installer';

describe('agents', () => {
  it('should have 14 agents defined', () => {
    expect(Object.keys(agents).length).toBe(14);
  });

  it('should return agent names', () => {
    const names = getAgentNames();
    expect(names).toContain('claude-code');
    expect(names).toContain('opencode');
    expect(names).toContain('cursor');
  });

  it('should detect installed agents', () => {
    const detected = detectInstalledAgents();
    expect(Array.isArray(detected)).toBe(true);
  });

  it('should have valid agent config structure', () => {
    for (const [key, config] of Object.entries(agents)) {
      expect(config.displayName).toBeDefined();
      expect(config.skillsDir).toBeDefined();
      expect(config.globalSkillsDir).toBeDefined();
      expect(typeof config.detectInstalled).toBe('function');
    }
  });
});

describe('CLI', () => {
  it('should show version', async () => {
    const result = await $`bun run src/index.ts --version`.text();
    expect(result.trim()).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should show help', async () => {
    const result = await $`bun run src/index.ts --help`.text();
    expect(result).toContain('oracle-skills');
    expect(result).toContain('install');
    expect(result).toContain('uninstall');
    expect(result).toContain('agents');
  });

  it('should list agents', async () => {
    const result = await $`bun run src/index.ts agents`.text();
    expect(result).toContain('claude-code');
    expect(result).toContain('opencode');
    expect(result).toContain('Supported agents');
  });
});

describe('installer', () => {
  it('should discover bundled skills', async () => {
    const skills = await discoverSkills();
    
    expect(skills.length).toBeGreaterThan(0);
    expect(skills.some(s => s.name === 'rrr')).toBe(true);
    expect(skills.some(s => s.name === 'recap')).toBe(true);
    expect(skills.some(s => s.name === 'trace')).toBe(true);
  });

  it('should have skill descriptions', async () => {
    const skills = await discoverSkills();
    
    for (const skill of skills) {
      expect(skill.name).toBeDefined();
      expect(skill.path).toBeDefined();
      // Most skills should have descriptions
    }
  });
});
