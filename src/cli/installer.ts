import { existsSync, readdirSync, realpathSync } from 'fs';
import { join, dirname, basename } from 'path';
import { homedir, tmpdir } from 'os';
import { rm } from 'fs/promises';
import * as p from '@clack/prompts';
import { agents } from './agents.js';
import type { Skill, InstallOptions } from './types.js';
import { mkdirp, rmrf, cpr, mv, rmf, cp, type ShellMode } from './fs-utils.js';
import { resolveProfile, STANDARD_SKILLS, LAB_SKILLS, MINIMAL_SKILLS, MINIMAL_ONLY_SKILLS, ZOMBIE_SKILLS } from '../profiles.js';
import {
  discoverSkills as _discoverSkills,
  readSkillFile,
  writeSkillToDir,
  skillHasHooks,
  isCompiled,
  getPublicSkillsDir,
  extractDescription,
} from './skill-source.js';
import pkg from '../../package.json' with { type: 'json' };

/**
 * True when a local skills target IS this repo's own public shelf (skills/).
 * openclaw's skillsDir is literally 'skills' (agents.ts), so a local
 * install/uninstall run from the repo root would write into — or rmrf —
 * skill SOURCE. Guarded in install, uninstall, and the #230 shadow shield.
 */
function isSelfTarget(targetDir: string): boolean {
  try {
    return realpathSync(targetDir) === realpathSync(getPublicSkillsDir());
  } catch {
    return false; // either path missing → can't be the shelf
  }
}

// ── Codex 0.128.0+ plugin marketplace helpers ────────────────────────────────

/**
 * Detect if Codex 0.128.0+ plugin marketplace mode is active.
 * Codex 0.128.0 creates ~/.codex/config.toml; older versions do not.
 */
export function isCodexPluginMarketplace(homeDir?: string): boolean {
  const home = homeDir ?? homedir();
  return existsSync(join(home, '.codex', 'config.toml'));
}

/** Return the arra-oracle-skills marketplace bundle directory path. */
export function getCodexMarketplaceDir(homeDir?: string): string {
  const home = homeDir ?? homedir();
  return join(home, '.codex', '.tmp', 'bundled-marketplaces', 'arra-oracle-skills');
}

/**
 * Return the Codex 0.130+ plugin cache directory for arra-oracle-skills.
 * Codex resolves enabled plugins from `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`
 * (mirroring the marketplace source layout). Without populating this, Codex logs
 * "failed to load plugin: plugin is not installed" even when the marketplace is registered.
 */
export function getCodexPluginCacheDir(homeDir?: string): string {
  const home = homeDir ?? homedir();
  return join(home, '.codex', 'plugins', 'cache', 'arra-oracle-skills');
}

/**
 * Detect the installed Codex CLI version by invoking `codex --version`.
 * Returns the semver string ("0.130.0") or null if Codex is not on PATH.
 *
 * Used by codexUsesJsonFormat() to branch the plugin layout between the
 * TOML format (0.128–0.129) and the JSON format (0.130+).
 */
export function getCodexVersion(): string | null {
  try {
    const result = Bun.spawnSync(['codex', '--version']);
    if (result.exitCode !== 0) return null;
    const output = new TextDecoder().decode(result.stdout).trim();
    // Expected format: "codex-cli 0.130.0"
    const match = output.match(/(\d+)\.(\d+)\.(\d+)/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : null;
  } catch {
    return null;
  }
}

/**
 * Determine whether Codex expects the 0.130+ JSON plugin format
 * (`.codex-plugin/plugin.json` + `skills/<n>/SKILL.md`) instead of the
 * 0.128 TOML format (`plugin.toml` + `prompt.md`).
 *
 * Defaults to FALSE (TOML) when the version cannot be detected, preserving
 * compatibility with Codex 0.128.x installs that already work today.
 */
export function codexUsesJsonFormat(versionOverride?: string | null): boolean {
  const v = versionOverride === undefined ? getCodexVersion() : versionOverride;
  if (!v) return false;
  const parts = v.split('.').map(Number);
  const major = parts[0] ?? 0;
  const minor = parts[1] ?? 0;
  // 0.130.0 introduced the JSON plugin manifest + skills/<n>/SKILL.md layout
  return major > 0 || (major === 0 && minor >= 130);
}

/**
 * Install skills for Codex 0.128.0+ plugin marketplace.
 *
 * Branches the layout based on the runtime Codex version:
 *
 *   0.128–0.129 (TOML format — default when codex version cannot be detected):
 *     <marketplaceDir>/manifest.toml
 *     <marketplaceDir>/plugins/<skill>/plugin.toml
 *     <marketplaceDir>/plugins/<skill>/prompt.md
 *
 *   0.130+ (JSON format — matches first-party `openai-bundled` shape):
 *     <marketplaceDir>/plugins/<skill>/.codex-plugin/plugin.json
 *     <marketplaceDir>/plugins/<skill>/skills/<skill>/SKILL.md
 *
 * Then updates ~/.codex/config.toml with:
 *   [marketplaces.arra-oracle-skills]  source_type + source
 *   [plugins."<skill>@arra-oracle-skills"]  enabled = true
 *
 * Pass `opts.useJson` to override format detection (used by tests).
 */
export async function installCodexPluginMarketplace(
  skills: Skill[],
  version: string,
  shellMode: ShellMode,
  opts?: {
    marketplaceDir?: string;
    configPath?: string;
    useJson?: boolean;
    pluginCacheDir?: string;
  }
): Promise<void> {
  const marketplaceDir = opts?.marketplaceDir ?? getCodexMarketplaceDir();
  const configPath = opts?.configPath ?? join(homedir(), '.codex', 'config.toml');
  const useJson = opts?.useJson ?? codexUsesJsonFormat();
  const pluginCacheDir = opts?.pluginCacheDir ?? getCodexPluginCacheDir();

  // ── 1. Create marketplace bundle directory ─────────────────────────────────
  await mkdirp(marketplaceDir, shellMode);

  // ── 2. Marketplace manifest ───────────────────────────────────────────────
  // 0.128 TOML: <marketplaceDir>/manifest.toml
  // 0.130 JSON: <marketplaceDir>/.agents/plugins/marketplace.json
  const manifestPath = join(marketplaceDir, 'manifest.toml');
  if (useJson) {
    // Clean up stale TOML manifest from a prior 0.128 install
    if (existsSync(manifestPath)) await rmf(manifestPath, shellMode);

    // Write 0.130 marketplace manifest at .agents/plugins/marketplace.json.
    // Codex's `codex plugin marketplace add <path>` requires this manifest to
    // register the marketplace; without it: "marketplace root does not contain
    // a supported manifest".
    const agentsManifestDir = join(marketplaceDir, '.agents', 'plugins');
    await mkdirp(agentsManifestDir, shellMode);
    const marketplaceManifest = {
      name: 'arra-oracle-skills',
      interface: {
        displayName: 'Arra Oracle Skills',
      },
      plugins: skills
        .filter((s) => !s.hidden)
        .map((s) => ({
          name: s.name,
          source: {
            source: 'local',
            path: `./plugins/${s.name}`,
          },
          policy: {
            installation: 'AVAILABLE',
            authentication: 'ON_INSTALL',
          },
          category: 'Productivity',
        })),
    };
    await Bun.write(
      join(agentsManifestDir, 'marketplace.json'),
      `${JSON.stringify(marketplaceManifest, null, 2)}\n`
    );
  } else {
    const manifestContent = [
      `name = "arra-oracle-skills"`,
      `version = "${version}"`,
      `description = "Oracle skills for Codex by Soul Brews Studio"`,
      ``,
    ].join('\n');
    await Bun.write(manifestPath, manifestContent);
  }

  // ── 3. Per-skill plugin directories ───────────────────────────────────────
  const pluginsDir = join(marketplaceDir, 'plugins');
  await mkdirp(pluginsDir, shellMode);

  for (const skill of skills) {
    const skillPluginDir = join(pluginsDir, skill.name);
    await mkdirp(skillPluginDir, shellMode);

    if (useJson) {
      // ── Codex 0.130+ JSON format ────────────────────────────────────────
      const codexPluginDir = join(skillPluginDir, '.codex-plugin');
      await mkdirp(codexPluginDir, shellMode);
      const skillsSubDir = join(skillPluginDir, 'skills', skill.name);
      await mkdirp(skillsSubDir, shellMode);

      const pluginJson = {
        name: skill.name,
        version,
        description: skill.description,
        skills: './skills/',
        interface: {
          displayName: skill.name,
          shortDescription:
            skill.description.length > 100
              ? `${skill.description.slice(0, 97)}...`
              : skill.description,
        },
      };
      await Bun.write(
        join(codexPluginDir, 'plugin.json'),
        `${JSON.stringify(pluginJson, null, 2)}\n`
      );

      // Skill content → skills/<name>/SKILL.md
      if (isCompiled()) {
        // VFS mode: write entire skill tree under skills/<name>/
        await writeSkillToDir(skill.name, skillsSubDir);
      } else {
        const skillMdPath = join(skill.path, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          const content = await Bun.file(skillMdPath).text();
          await Bun.write(join(skillsSubDir, 'SKILL.md'), content);
        }
      }

      // Clean up stale TOML-format files from a prior 0.128 install
      const stalePluginToml = join(skillPluginDir, 'plugin.toml');
      const stalePromptMd = join(skillPluginDir, 'prompt.md');
      if (existsSync(stalePluginToml)) await rmf(stalePluginToml, shellMode);
      if (existsSync(stalePromptMd)) await rmf(stalePromptMd, shellMode);

      // ── Populate Codex 0.130+ plugin cache ─────────────────────────────
      // Codex resolves enabled plugins from `~/.codex/plugins/cache/<marketplace>/<plugin>/<version>/`,
      // NOT directly from the marketplace bundle. Without this, Codex logs:
      //   "failed to load plugin: plugin is not installed"
      // The cache layout mirrors the marketplace plugin dir (including .codex-plugin/plugin.json).
      const cachePluginRoot = join(pluginCacheDir, skill.name);
      await mkdirp(cachePluginRoot, shellMode);
      const cacheDest = join(cachePluginRoot, version);
      // Remove a stale same-version cache before copying to ensure clean state
      if (existsSync(cacheDest)) await rmrf(cacheDest, shellMode);
      await cpr(skillPluginDir, cacheDest, shellMode);
    } else {
      // ── Codex 0.128 TOML format ─────────────────────────────────────────
      const escapedDesc = skill.description.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const pluginToml = [
        `name = "${skill.name}"`,
        `description = "${escapedDesc}"`,
        `version = "${version}"`,
        `command = "/${skill.name}"`,
        ``,
      ].join('\n');
      await Bun.write(join(skillPluginDir, 'plugin.toml'), pluginToml);

      // prompt.md — skill body for Codex to execute
      if (isCompiled()) {
        // VFS mode: write entire skill tree (includes SKILL.md + any extras)
        await writeSkillToDir(skill.name, skillPluginDir);
      } else {
        // Filesystem mode: copy SKILL.md as prompt.md
        const skillMdPath = join(skill.path, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          const content = await Bun.file(skillMdPath).text();
          await Bun.write(join(skillPluginDir, 'prompt.md'), content);
        }
      }
    }
  }

  // ── 4. Update ~/.codex/config.toml ────────────────────────────────────────
  let configContent = existsSync(configPath) ? await Bun.file(configPath).text() : '';

  // Add marketplace registration if not already present
  const marketplaceSection = `[marketplaces.arra-oracle-skills]`;
  if (!configContent.includes(marketplaceSection)) {
    configContent += [
      ``,
      `${marketplaceSection}`,
      `source_type = "local"`,
      `source = "${marketplaceDir}"`,
      ``,
    ].join('\n');
  }

  // Enable each non-hidden skill as a plugin
  for (const skill of skills) {
    if (skill.hidden) continue;
    const pluginKey = `[plugins."${skill.name}@arra-oracle-skills"]`;
    if (!configContent.includes(pluginKey)) {
      configContent += [
        `${pluginKey}`,
        `enabled = true`,
        ``,
      ].join('\n');
    }
  }

  await Bun.write(configPath, configContent);
}

// Re-export discoverSkills from skill-source
export const discoverSkills = _discoverSkills;

/** Quote YAML description values that start with [ to prevent YAML sequence parsing */
function yamlQuote(desc: string): string {
  return desc.startsWith('[') ? `'${desc.replace(/'/g, "''")}'` : desc;
}

// Check if an installed skill was installed by arra-oracle-skills-cli
async function isOurSkill(skillPath: string): Promise<boolean> {
  const skillMdPath = join(skillPath, 'SKILL.md');
  if (!existsSync(skillMdPath)) return false;
  try {
    const content = await Bun.file(skillMdPath).text();
    const frontmatter = content.split(/^---\s*$/m)[1] ?? '';
    return /^installer:\s*arra-oracle-skills-cli(?:\s|$)/m.test(frontmatter);
  } catch {
    return false;
  }
}

/** Version stamped into an installed skill by a previous run, or null. */
async function installedVersionOf(skillPath: string): Promise<string | null> {
  try {
    const content = await Bun.file(join(skillPath, 'SKILL.md')).text();
    return /^installer:\s*arra-oracle-skills-cli v(\S+)/m.exec(content)?.[1] ?? null;
  } catch {
    return null;
  }
}

/**
 * Compare two CalVer-ish versions: 26.7.27-alpha.947 vs 26.7.16.
 * Returns >0 if a is newer, <0 if older, 0 if equal/incomparable.
 *
 * A release is newer than any prerelease of the same numbers (26.7.27 >
 * 26.7.27-alpha.947), matching semver ordering.
 */
export function compareVersions(a: string, b: string): number {
  const split = (v: string) => {
    const [core, pre = ''] = v.split('-', 2);
    return {
      nums: core.split('.').map((n) => parseInt(n, 10) || 0),
      pre: pre ? pre.split('.').map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p)) : null,
    };
  };
  const [x, y] = [split(a), split(b)];
  for (let i = 0; i < Math.max(x.nums.length, y.nums.length); i++) {
    const d = (x.nums[i] ?? 0) - (y.nums[i] ?? 0);
    if (d !== 0) return d;
  }
  // Core equal: no prerelease outranks a prerelease.
  if (!x.pre && y.pre) return 1;
  if (x.pre && !y.pre) return -1;
  if (!x.pre || !y.pre) return 0;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const [p, q] = [x.pre[i], y.pre[i]];
    if (p === undefined) return -1;
    if (q === undefined) return 1;
    if (p === q) continue;
    if (typeof p === 'number' && typeof q === 'number') return p - q;
    return String(p) < String(q) ? -1 : 1;
  }
  return 0;
}

export async function listSkills(): Promise<void> {
  const skills = await discoverSkills();

  if (skills.length === 0) {
    p.log.warn('No skills found');
    return;
  }

  p.log.info(`Found ${skills.length} skills:\n`);

  for (const skill of skills) {
    const tag = skill.hidden ? ' (hidden)' : skill.zombie ? ' (zombie)' : '';
    console.log(`  ${skill.name}${tag}`);
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

  const requestedNames = [...new Set(options.skills || [])];
  const knownNames = new Set(allSkills.map((skill) => skill.name));
  const explicitOnlySkills = allSkills.filter((skill) => skill.explicitOnly);
  const explicitOnlyNames = new Set(explicitOnlySkills.map((skill) => skill.name));
  const unknownNames = requestedNames.filter((name) => !knownNames.has(name));
  if (unknownNames.length > 0) {
    throw new Error(
      `Unknown skill${unknownNames.length === 1 ? '' : 's'}: ${unknownNames.join(', ')}. ` +
      `Available: ${[...knownNames].sort().join(', ')}`,
    );
  }

  // Resolve profile → skill list, then apply --skill filter
  // No-profile callers may request all public/profile-eligible skills, but
  // curation flags still require an exact -s name. The CLI normally supplies
  // its default profile; this also closes the lower-level/null fallback.
  let skillsToInstall = allSkills.filter(
    (skill) => !skill.secret && !skill.zombie && !skill.explicitOnly,
  );
  let profileSkillNames: string[] | null = null;

  if (options.profile) {
    const allNames = allSkills.map((s) => s.name);
    const secretNames = allSkills.filter((s) => s.secret).map((s) => s.name);
    const zombieNames = allSkills.filter((s) => s.zombie).map((s) => s.name);
    const explicitOnlyNames = allSkills.filter((s) => s.explicitOnly).map((s) => s.name);
    profileSkillNames = resolveProfile(
      options.profile,
      allNames,
      secretNames,
      zombieNames,
      explicitOnlyNames,
    );

    if (profileSkillNames) {
      const extras = options.skills || [];
      const allowed = new Set([...profileSkillNames, ...extras]);
      skillsToInstall = allSkills.filter((s) => allowed.has(s.name));
    }
    // null means "all skills" (full/lab)
  } else if (options.skills && options.skills.length > 0) {
    // -s without --profile: ADD named skills to whatever is already installed
    // This makes -s additive — it won't drop existing skills (#221)
    const alreadyInstalled = new Set<string>();
    for (const agentName of targetAgents) {
      const agent = agents[agentName as keyof typeof agents];
      if (!agent) continue;
      const dir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
      if (existsSync(dir)) {
        for (const d of readdirSync(dir, { withFileTypes: true })) {
          if (d.isDirectory() && !d.name.startsWith('.') && !explicitOnlyNames.has(d.name)) {
            alreadyInstalled.add(d.name);
          }
        }
      }
    }
    const requested = new Set(options.skills);
    const combined = new Set([...alreadyInstalled, ...requested]);
    skillsToInstall = allSkills.filter((s) => combined.has(s.name));
  }

  if (skillsToInstall.length === 0) {
    p.log.error(`No matching skills found. Available: ${allSkills.map((s) => s.name).join(', ')}`);
    return;
  }

  // An unmarked same-name copy has unknown provenance. Leaving it in place while
  // profiles hide the canonical explicit-only source would let a fresh loader
  // silently keep executing stale instructions. Do not overwrite it implicitly;
  // an exact -s request is the user's scoped choice to replace that exact name.
  const explicitlyRequested = new Set(requestedNames);
  const unmanagedExplicitConflicts: string[] = [];
  const managedExplicitRefreshes = new Map<string, string[]>();
  for (const agentName of targetAgents) {
    const agent = agents[agentName as keyof typeof agents];
    if (!agent) continue;
    const skillsDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
    if (!existsSync(skillsDir) || (!options.global && isSelfTarget(skillsDir))) continue;
    for (const skill of explicitOnlySkills) {
      if (explicitlyRequested.has(skill.name)) continue;
      const installedPath = join(skillsDir, skill.name);
      if (!existsSync(join(installedPath, 'SKILL.md'))) continue;
      if (!(await isOurSkill(installedPath))) {
        unmanagedExplicitConflicts.push(`${agentName}:${installedPath}`);
        continue;
      }
      const onDisk = await installedVersionOf(installedPath);
      if (onDisk && compareVersions(onDisk, pkg.version) >= 0) continue;
      const planned = managedExplicitRefreshes.get(agentName) || [];
      planned.push(skill.name);
      managedExplicitRefreshes.set(agentName, planned);
    }
  }
  if (unmanagedExplicitConflicts.length > 0) {
    throw new Error(
      `Unmanaged explicit-only skill conflict; refusing a silent stale-loader win: ` +
      `${unmanagedExplicitConflicts.join(', ')}. ` +
      `Preserve or relocate the existing copy, or replace it with an exact -s <name> request.`,
    );
  }
  const managedRefreshCount = [...managedExplicitRefreshes.values()]
    .reduce((count, names) => count + names.length, 0);
  if (managedRefreshCount > 0) {
    p.log.info(
      `Will refresh ${managedRefreshCount} older managed explicit-only skill ` +
      `cop${managedRefreshCount === 1 ? 'y' : 'ies'} already visible to loaders.`,
    );
  }

  // #285 Part 2 — Explicit-profile alignment.
  // When --profile <name> was explicitly passed on the CLI (not the default value),
  // remove arra-managed skills that are no longer in the target profile.
  // Bare `install` (no flag) and `install -s <skill>` remain purely additive (#257 Bug 5).
  if (options.profileExplicit && profileSkillNames !== null) {
    const targetSet = new Set(skillsToInstall.map((s) => s.name));

    for (const agentName of targetAgents) {
      const agent = agents[agentName as keyof typeof agents];
      if (!agent) continue;

      const skillsDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
      if (!existsSync(skillsDir)) continue;

      // Self-target guard: alignment rm-rf's non-profile skills — running it
      // against the repo's own public shelf would delete skill SOURCE (the
      // isOurSkill substring check can match shelf files whose PROSE mentions
      // the installer marker). The install loop below refuses this agent too.
      if (!options.global && isSelfTarget(skillsDir)) continue;

      const installedDirs = readdirSync(skillsDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name);

      const toRemove: string[] = [];
      for (const name of installedDirs) {
        if (targetSet.has(name)) continue;
        if (await isOurSkill(join(skillsDir, name))) {
          toRemove.push(name);
        }
      }

      if (toRemove.length === 0) continue;

      // Always print the diff (even under -y, per #267 follow-up)
      console.log(`\n⚠  Profile alignment — will REMOVE arra-managed skills not in '${options.profile}': ${toRemove.join(', ')}\n`);

      if (!options.yes) {
        const confirmed = await p.confirm({
          message: `Remove ${toRemove.length} skill(s) from ${agent.displayName}?`,
        });
        if (p.isCancel(confirmed) || !confirmed) {
          p.log.info('Alignment cancelled — continuing with additive install only');
          continue;
        }
      }

      const shellMode: ShellMode = options.shellMode || 'auto';
      for (const name of toRemove) {
        const skillPath = join(skillsDir, name);
        await rm(skillPath, { recursive: true, force: true });

        // Also remove command stubs if commands mode is active
        if (agent.commandsDir && options.commands) {
          const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
          const ext = agent.commandFormat === 'toml' ? 'toml' : 'md';
          const flatFile = join(commandsDir, `${name}.${ext}`);
          if (existsSync(flatFile)) await rmf(flatFile, shellMode);
        }

        // Also remove from plugins if present
        const pluginPath = join(homedir(), '.claude', 'plugins', name);
        if (existsSync(pluginPath) && await isOurSkill(pluginPath)) {
          await rm(pluginPath, { recursive: true, force: true });
        }
      }
      p.log.info(`Alignment: removed ${toRemove.length} skill(s) not in '${options.profile}' profile`);
    }
  }

  // Confirm installation
  if (!options.yes) {
    const agentList = targetAgents.map((a) => agents[a as keyof typeof agents]?.displayName || a).join(', ');
    const confirmed = await p.confirm({
      message: `Install ${skillsToInstall.length} selected skills to ${agentList}` +
        (managedRefreshCount > 0 ? ` and refresh ${managedRefreshCount} existing internal cop${managedRefreshCount === 1 ? 'y' : 'ies'}` : '') +
        `?`,
    });

    if (p.isCancel(confirmed) || !confirmed) {
      p.log.info('Installation cancelled');
      return;
    }
  }

  const spinner = p.spinner();
  spinner.start('Installing skills');

  let agentsInstalled = 0;
  let skillCopiesInstalled = 0;
  for (const agentName of targetAgents) {
    const agent = agents[agentName as keyof typeof agents];
    if (!agent) {
      p.log.warn(`Unknown agent: ${agentName}`);
      continue;
    }

    const targetDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
    const shellMode: ShellMode = options.shellMode || 'auto';
    const replacementRecoveryDir = join(
      tmpdir(),
      `arra-oracle-skills-replaced-${new Date().toISOString().replace(/[:.]/g, '-')}-${agentName.replace(/[^a-zA-Z0-9_-]/g, '_')}`,
    );

    // Self-target guard: never install INTO the repo's own public shelf.
    if (!options.global && isSelfTarget(targetDir)) {
      p.log.error(
        `Refusing to install into ${agent.skillsDir}/ for ${agent.displayName} — that directory is this repo's skill source (public shelf). Run from another directory or use -g.`
      );
      process.exitCode = 1;
      continue;
    }
    agentsInstalled++;

    // Create target directory
    await mkdirp(targetDir, shellMode);

    // #230 Local-skill-precedence shield (workaround for Claude Code's
    // global-over-local loader order): when installing GLOBALLY, skip any
    // skill whose name already exists as a NON-OURS local skill in the
    // user's cwd. Claude Code would load the global copy and shadow the
    // user's local override — which is the opposite of what they want.
    // Use --force-global to install anyway.
    let agentSkillsToInstall = [...skillsToInstall];

    // Explicit-only skills never belong to a profile, but an older managed copy
    // may already be visible to the loader from a previous release. Refresh only
    // that already-installed, attributable copy; never introduce a new internal
    // skill through a profile and never downgrade a newer installed version.
    const selectedForAgent = new Set(agentSkillsToInstall.map((skill) => skill.name));
    const refreshedExplicitOnly: string[] = [];
    for (const name of managedExplicitRefreshes.get(agentName) || []) {
      if (selectedForAgent.has(name)) continue;
      const skill = explicitOnlySkills.find((candidate) => candidate.name === name);
      if (!skill) continue;
      agentSkillsToInstall.push(skill);
      selectedForAgent.add(skill.name);
      refreshedExplicitOnly.push(skill.name);
    }
    if (refreshedExplicitOnly.length > 0) {
      p.log.info(
        `Refreshing managed explicit-only skill(s) already installed: ${refreshedExplicitOnly.join(', ')}`,
      );
    }
    skillCopiesInstalled += agentSkillsToInstall.length;
    const shadowedSkills: string[] = [];
    if (options.global && !options.forceGlobal) {
      const localSkillsDir = join(process.cwd(), agent.skillsDir);
      // Skip the shield when cwd's skills/ IS the shelf itself: the source
      // tree is not a user override, and treating it as one silently no-ops
      // every global install run from the repo root.
      if (existsSync(localSkillsDir) && !isSelfTarget(localSkillsDir)) {
        const filtered: Skill[] = [];
        for (const skill of agentSkillsToInstall) {
          const localSkillMd = join(localSkillsDir, skill.name, 'SKILL.md');
          if (existsSync(localSkillMd) && !(await isOurSkill(join(localSkillsDir, skill.name)))) {
            shadowedSkills.push(skill.name);
            continue;
          }
          filtered.push(skill);
        }
        agentSkillsToInstall = filtered;
      }
      if (shadowedSkills.length > 0) {
        p.log.warn(
          `Skipping ${shadowedSkills.length} skill(s) shadowed by your local ${agent.skillsDir}/: ${shadowedSkills.join(', ')}`
        );
        p.log.info(
          `Your local skill(s) take precedence. Use --force-global to install the Oracle version anyway.`
        );
      }
    }

    // Auto-cleanup: remove orphaned skills installed by arra-oracle-skills-cli
    // Only removes skills that: 1) have installer: arra-oracle-skills-cli marker, 2) no longer exist in source
    const sourceSkillNames = allSkills.map((s) => s.name);

    if (existsSync(targetDir)) {
      const installedDirs = readdirSync(targetDir, { withFileTypes: true })
        .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
        .map((d) => d.name);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const trashDir = join(tmpdir(), `arra-oracle-skills-stale-${timestamp}`);
      let movedAny = false;
      const failedMoves: string[] = [];

      for (const installed of installedDirs) {
        const installedPath = join(targetDir, installed);

        // Only cleanup if: 1) it's ours, 2) not in source anymore
        if (await isOurSkill(installedPath) && !sourceSkillNames.includes(installed)) {
          // #500: absence from THIS source tree does not mean the skill is dead —
          // it may simply be newer than the tree we are installing from. Installing
          // a `main` checkout (v26.7.16) over a skill stamped v26.7.25-alpha.1900
          // evicted the newer copy, because the check was name-membership only.
          // The installer is neither the only writer nor always the latest
          // authority, so never let an older tree eat newer work.
          const onDisk = await installedVersionOf(installedPath);
          if (onDisk && compareVersions(onDisk, pkg.version) > 0) {
            p.log.warn(
              `Keeping ${installed}: installed v${onDisk} is newer than this tree (v${pkg.version}). ` +
                `Not in source here — install from a tree that has it, or remove it explicitly.`,
            );
            continue;
          }
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

    for (const skill of agentSkillsToInstall) {
      // Check if skill has hooks - needs plugin installation
      if (await skillHasHooks(skill.name)) {
        skillsWithHooks.push(skill);
      }

      const destPath = join(targetDir, skill.name);

        // Remove existing if present
        if (existsSync(destPath)) {
          if (
            skill.explicitOnly &&
            explicitlyRequested.has(skill.name) &&
            !(await isOurSkill(destPath))
          ) {
            await mkdirp(replacementRecoveryDir, shellMode);
            await mv(destPath, join(replacementRecoveryDir, skill.name), shellMode);
            p.log.info(`Preserved replaced ${skill.name}: ${replacementRecoveryDir}`);
          } else {
            await rmrf(destPath, shellMode);
          }
        }

        // Copy skill folder (VFS mode writes from memory, fs mode copies from disk)
        if (isCompiled()) {
          await writeSkillToDir(skill.name, destPath);
        } else {
          await cpr(skill.path, destPath, shellMode);
        }

        // Inject version into SKILL.md frontmatter and description
        const skillMdPath = join(destPath, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          let content = await Bun.file(skillMdPath).text();
          if (content.startsWith('---')) {
            // Add installer field after opening ---
            content = content.replace(
              /^---\n/,
              `---\ninstaller: arra-oracle-skills-cli v${pkg.version}\norigin: Nat Weerawan's brain, digitized — how one human works with AI, captured as code — Soul Brews Studio\n`
            );
            // Prepend version AND scope to description (G=Global, L=Local, SKILL for other agents)
            const scopeChar = scope === 'Global' ? 'G' : 'L';
            const tierTag = skill.explicitOnly ? '[internal]'
              : (STANDARD_SKILLS as readonly string[]).includes(skill.name) ? '[standard]'
              : (LAB_SKILLS as readonly string[]).includes(skill.name) ? '[lab]'
              : (MINIMAL_ONLY_SKILLS as readonly string[]).includes(skill.name) ? '[minimal]'
              : (ZOMBIE_SKILLS as readonly string[]).includes(skill.name) ? '[zombie]'
              : '[core]';
            // Block-scalar descriptions (description: >-) would be corrupted
            // by the single-line rewrite below (it would capture the literal
            // ">-" and orphan the indented body → invalid YAML in the
            // installed copy). Fold them to a quoted single line instead.
            if (/^description:[ \t]*[>|][+-]?[ \t]*\r?$/m.test(content)) {
              const folded = extractDescription(content);
              const desc = `${tierTag} v${pkg.version} ${scopeChar}-SKLL | ${folded}`;
              content = content.replace(
                /^description:[ \t]*[>|][+-]?[ \t]*\r?\n(?:(?:[ \t]+[^\n]*)?\r?\n)*?(?=[^ \t\r\n])/m,
                `description: ${yamlQuote(desc)}\n`
              );
            } else {
              content = content.replace(
                /^(description:\s*)'?(.+?)'?(\n)/m,
                (_, p1, p2, p3) => {
                  const desc = `${tierTag} v${pkg.version} ${scopeChar}-SKLL | ${p2}`;
                  return `${p1}${yamlQuote(desc)}${p3}`;
                }
              );
            }
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
        if (isCompiled()) {
          await writeSkillToDir(skill.name, pluginDest);
        } else {
          await cpr(skill.path, pluginDest, shellMode);
        }

        // Create .claude-plugin/plugin.json if not exists
        const pluginJsonDir = join(pluginDest, '.claude-plugin');
        const pluginJsonPath = join(pluginJsonDir, 'plugin.json');
        if (!existsSync(pluginJsonPath)) {
          await mkdirp(pluginJsonDir, shellMode);
          const pluginJson = {
            name: skill.name,
            description: skill.description,
            version: pkg.version,
            author: { name: 'Nat Weerawan', organization: 'Soul Brews Studio' },
          };
          await Bun.write(pluginJsonPath, JSON.stringify(pluginJson, null, 2));
        }

        p.log.success(`Plugin (hooks): ~/.claude/plugins/${skill.name}`);
      }
    }

    // Write manifest with version info.
    //
    // #458: this used to record only the skills THIS run installed, so a
    // follow-up `install -s dream` rewrote a 20-entry manifest down to 8 while
    // 21 skills sat on disk — a receipt that contradicts the thing it describes,
    // and `about` reads it. Derive the list from the directory instead: disk is
    // the fact, the manifest is just a record of it, so the two cannot drift no
    // matter which flags produced the install.
    const installedOnDisk = readdirSync(targetDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
      .map((d) => d.name)
      .filter((name) => existsSync(join(targetDir, name, 'SKILL.md')))
      .sort();

    const manifest = {
      version: pkg.version,
      installedAt: new Date().toISOString(),
      skills: installedOnDisk,
      agent: agentName,
    };
    await Bun.write(join(targetDir, '.arra-oracle-skills.json'), JSON.stringify(manifest, null, 2));

    // Write human-readable VERSION.md for agents to report
    const versionMd = `# Oracle Skills

Installed by: **arra-oracle-skills-cli v${pkg.version}**
Installed at: ${new Date().toISOString()}
Agent: ${agent.displayName}
Skills: ${agentSkillsToInstall.length}

## Report This Version

When asked about skills version, report:
\`\`\`
arra-oracle-skills-cli v${pkg.version}
\`\`\`

## Installed Skills

${agentSkillsToInstall.map((s) => `- ${s.name}`).join('\n')}

## Update Skills

\`\`\`bash
bunx --bun arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli#v${pkg.version} install -y -g
\`\`\`
`;
    await Bun.write(join(targetDir, 'VERSION.md'), versionMd);

    // Deduplicate: if agent has commandsOptIn (e.g. Claude Code), remove any
    // existing command stubs that overlap with installed skills to prevent
    // duplicate G-SKLL + G-CMD entries in slash command lists
    if (agent.commandsDir && agent.commandsOptIn && !options.commands) {
      const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
      if (existsSync(commandsDir)) {
        const ext = agent.commandFormat === 'toml' ? 'toml' : 'md';
        for (const skill of agentSkillsToInstall) {
          const cmdFile = join(commandsDir, `${skill.name}.${ext}`);
          if (existsSync(cmdFile)) {
            await rmf(cmdFile, shellMode);
          }
        }
      }
    }

    // Install flat command files to commands/ (OpenCode, Claude Code, etc.)
    // Agents with commandsOptIn only get commands when --commands flag is passed
    if (agent.commandsDir && (!agent.commandsOptIn || options.commands)) {
      const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
      await mkdirp(commandsDir, shellMode);

      const scopeChar = scope === 'Global' ? 'G' : 'L';
      const skillsPath = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
      
      const cmdFormat = agent.commandFormat || 'md';

      for (const skill of agentSkillsToInstall) {
        // Hidden skills: install SKILL.md but skip command stub (not in autocomplete)
        if (skill.hidden) continue;

        const skillMdPath = join(targetDir, skill.name, 'SKILL.md');
        if (existsSync(skillMdPath)) {
          if (cmdFormat === 'toml') {
            // Gemini CLI: .toml slash commands
            const desc = skill.description.replace(/"/g, '\\"');
            const tomlContent = `description = "v${pkg.version} ${scopeChar}-CMD | ${desc}"
prompt = """
You are running the /${skill.name} skill.

Read the skill file at ${skillsPath}/${skill.name}/SKILL.md and follow ALL instructions in it.

Arguments: {{args}}

---
arra-oracle-skills-cli v${pkg.version}
"""
`;
            await Bun.write(join(commandsDir, `${skill.name}.toml`), tomlContent);
          } else if (agentName === 'codex') {
            // Codex: .md prompts → ~/.codex/prompts/ → /prompts:skill-name
            const stubContent = `---
description: ${yamlQuote(`v${pkg.version} ${scopeChar}-CMD | ${skill.description}`)}
argument-hint: "[args]"
---

You are running the /${skill.name} skill.

Read the skill file at ${skillsPath}/${skill.name}/SKILL.md and follow ALL instructions in it.

Pass these arguments to the skill: $ARGUMENTS

---
*🧬 Nat Weerawan × Oracle · Symbiotic Intelligence · v${pkg.version}*
*Digitized from Nat Weerawan's brain — thousands of hours working alongside AI, captured as code*
`;
            await Bun.write(join(commandsDir, `${skill.name}.md`), stubContent);
          } else {
            // Claude Code, OpenCode, etc.: .md slash commands
            const stubContent = `---
description: ${yamlQuote(`v${pkg.version} ${scopeChar}-CMD | ${skill.description}`)}
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
*arra-oracle-skills-cli v${pkg.version}*
`;
            await Bun.write(join(commandsDir, `${skill.name}.md`), stubContent);
          }
        }
      }
      p.log.success(`${agent.displayName} commands: ${commandsDir}`);

    }

    // OpenCode only: install plugin if exists
    if (agentName === 'opencode') {
      const pluginDir = options.global
        ? join(homedir(), '.config/opencode/plugins')
        : join(process.cwd(), '.opencode/plugins');
      await mkdirp(pluginDir, shellMode);
      const hookSrc = join(dirname(import.meta.path), '..', 'hooks', 'opencode', 'arra-oracle-skills.ts');
      if (existsSync(hookSrc)) {
        await cp(hookSrc, join(pluginDir, 'arra-oracle-skills.ts'), shellMode);
        p.log.success(`OpenCode plugin: ${pluginDir}/arra-oracle-skills.ts`);
      }
    }

    // Codex: skip marketplace + plugin cache — write to ~/.codex/skills/ ONLY.
    // The marketplace bundle + cache caused triple-duplicate autocomplete entries
    // (skills/ + marketplace/ + cache/ all visible to Codex). Skills-only is clean.
    // Clean up stale marketplace/cache from prior installs.
    if (agentName === 'codex') {
      const marketplaceDir = getCodexMarketplaceDir();
      const cacheDir = getCodexPluginCacheDir();
      if (existsSync(marketplaceDir)) {
        await rm(marketplaceDir, { recursive: true, force: true });
        p.log.info('Cleaned stale Codex marketplace bundle');
      }
      if (existsSync(cacheDir)) {
        await rm(cacheDir, { recursive: true, force: true });
        p.log.info('Cleaned stale Codex plugin cache');
      }
    }

    p.log.success(`${agent.displayName}: ${targetDir}`);

    // Install semantics (post-#285):
    //   `install` (no flag)              → purely additive (Bug 5 protection, #257)
    //   `install -s <skill>`             → purely additive
    //   `install --profile <name>` (explicit) → ALIGN: remove arra-managed skills not in target
    //                                            Non-arra skills NEVER touched.
  }

  spinner.stop(
    agentsInstalled > 0
      ? `Installed ${skillCopiesInstalled} skill cop${skillCopiesInstalled === 1 ? 'y' : 'ies'} to ${agentsInstalled} agent(s)`
      : 'Nothing installed (all targets refused or unknown)'
  );

  // Migration: remove deprecated lite skills from prior installs.
  // Lites (forward-lite, recap-lite, rrr-lite) were killed 2026-05-14;
  // minimal profile now uses the full versions directly.
  const deprecatedLites = ['forward-lite', 'recap-lite', 'rrr-lite'];
  for (const agentName of targetAgents) {
    const agent = agents[agentName as keyof typeof agents];
    if (!agent) continue;
    const skillsDir = options.global ? agent.globalSkillsDir : join(process.cwd(), agent.skillsDir);
    let migrated = false;
    for (const lite of deprecatedLites) {
      const litePath = join(skillsDir, lite);
      if (existsSync(litePath) && await isOurSkill(litePath)) {
        await rm(litePath, { recursive: true, force: true });
        migrated = true;
      }
    }
    if (migrated) {
      p.log.info(`Migrated: removed deprecated lite skills (forward-lite, recap-lite, rrr-lite)`);
      const manifestPath = join(skillsDir, '.arra-oracle-skills.json');
      if (existsSync(manifestPath)) {
        try {
          const content = await Bun.file(manifestPath).text();
          const m = JSON.parse(content);
          m.skills = m.skills.filter((s: string) => !deprecatedLites.includes(s));
          await Bun.write(manifestPath, JSON.stringify(m, null, 2));
        } catch {}
      }
    }
  }
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

    // Self-target guard: never uninstall FROM the repo's own public shelf.
    // Must run before any rmrf — `uninstall -s <name>` bypasses the
    // isOurSkill marker gate below and would delete skill SOURCE.
    if (!options.global && isSelfTarget(targetDir)) {
      p.log.error(
        `Refusing to uninstall from ${agent.skillsDir}/ for ${agent.displayName} — that directory is this repo's skill source (public shelf).`
      );
      process.exitCode = 1;
      continue;
    }

    // Get installed skills (all agents use directories now)
    const entries = readdirSync(targetDir, { withFileTypes: true });
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
    let skipped = 0;
    for (const skill of toRemove) {
      const skillPath = join(targetDir, skill);

      // When removing all skills (no -s flag), only remove our own
      if (!options.skills && !await isOurSkill(skillPath)) {
        skipped++;
        continue;
      }

      await rmrf(skillPath, shellMode);

      // Clean up commands/ flat files (OpenCode, Claude Code, Gemini, etc.)
      if (agent.commandsDir) {
        const commandsDir = options.global ? agent.globalCommandsDir! : join(process.cwd(), agent.commandsDir);
        const ext = agent.commandFormat === 'toml' ? 'toml' : 'md';
        const flatFile = join(commandsDir, `${skill}.${ext}`);
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

    if (skipped > 0) {
      p.log.info(`${agent.displayName}: skipped ${skipped} external skills`);
    }
    agentsProcessed++;
    p.log.success(`${agent.displayName}: removed ${toRemove.length - skipped} skills`);
  }

  return { removed: totalRemoved, agents: agentsProcessed };
}
