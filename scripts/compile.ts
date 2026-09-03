import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { parse as parseYaml } from 'yaml';
import pkg from '../package.json' with { type: 'json' };

// compile.ts — validate skill frontmatter + generate the marketplace manifest.
//
// Command stubs are NOT generated here anymore: nothing consumed the old
// src/commands/*.md output. The installer writes agent-specific stubs inline
// at install time (src/cli/installer.ts), and Claude Code invokes SKILL.md
// directly as /name. Skills are the only source of truth.
//
// Dual-root layout (public shelf / vault split):
//   skills/       — public shelf: the curated set; membership IS curation.
//                   Every external channel (Claude plugin marketplace,
//                   `npx skills add`) serves exactly this directory.
//   src/skills/   — vault: secret skills + .archive/ zombies + .template.
//                   Never listed externally.
// Until the shelf exists (pre-move), the vault is the single root and the
// manifest is emitted byte-identically to the legacy ./src/skills/* shape.

const SHELF_DIR = join(process.cwd(), 'skills');
const VAULT_DIR = join(process.cwd(), 'src', 'skills');
const MARKETPLACE_PATH = join(process.cwd(), '.claude-plugin', 'marketplace.json');

// ── Frontmatter validation (official Agent Skills spec) ────────────────
// name: ≤64 chars, lowercase/digits/hyphens, no reserved words
// description: non-empty, ≤1024 chars, no XML tags
// body: >500 lines is a warning (official guidance, not a hard limit)
// Ref: platform.claude.com/docs/en/agents-and-tools/agent-skills/overview

interface ValidationIssue {
  skill: string;
  message: string;
}

function validateSkill(
  skillName: string,
  frontmatter: string,
  fullContent: string,
  description: string,
  errors: ValidationIssue[],
  warnings: ValidationIssue[],
): void {
  const nameMatch = frontmatter.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : skillName;

  if (name.length > 64) {
    errors.push({ skill: skillName, message: `name is ${name.length} chars (max 64)` });
  }
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push({ skill: skillName, message: `name "${name}" must be lowercase letters, numbers, and hyphens only` });
  }
  if (/claude|anthropic/i.test(name)) {
    errors.push({ skill: skillName, message: `name "${name}" contains a reserved word (claude/anthropic)` });
  }
  if (nameMatch && name !== skillName) {
    warnings.push({ skill: skillName, message: `frontmatter name "${name}" doesn't match directory name` });
  }

  if (!description) {
    errors.push({ skill: skillName, message: 'description is missing or empty' });
  } else {
    if (description.length > 1024) {
      errors.push({ skill: skillName, message: `description is ${description.length} chars (max 1024)` });
    }
    if (/<[a-zA-Z][^>]*>/.test(description)) {
      errors.push({ skill: skillName, message: 'description contains XML/HTML tags' });
    }
  }

  const lineCount = fullContent.split('\n').length;
  if (lineCount > 500) {
    warnings.push({ skill: skillName, message: `SKILL.md is ${lineCount} lines (official guidance: keep under 500 — move detail to references/)` });
  }
}

// Strict-YAML gate: our regex-based flag parsing tolerates frontmatter that
// strict YAML parsers reject (unquoted `foo: bar` colons inside description —
// the kien-thai failure class). External consumers (vercel `npx skills`) use
// a strict parser and silently DROP such skills, so a shelf skill that fails
// here would be invisible on one channel while listed on the others.
function validateStrictYaml(
  skillName: string,
  frontmatter: string,
  issues: ValidationIssue[],
): void {
  try {
    const parsed = parseYaml(frontmatter);
    if (typeof parsed !== 'object' || parsed === null) {
      issues.push({ skill: skillName, message: 'frontmatter is not a YAML mapping' });
      return;
    }
    if (typeof parsed.name !== 'string' && parsed.name !== undefined) {
      issues.push({ skill: skillName, message: `frontmatter "name" parses as ${typeof parsed.name}, expected string` });
    }
    if (typeof parsed.description !== 'string') {
      issues.push({ skill: skillName, message: `frontmatter "description" parses as ${typeof parsed.description}, expected string — quote it or use a block scalar (>-) if it contains ": "` });
    }
  } catch (err) {
    issues.push({ skill: skillName, message: `frontmatter is not valid strict YAML (external installers will silently drop this skill): ${(err as Error).message.split('\n')[0]}` });
  }
}

async function compile() {
  console.log(`🔮 Validating skills + generating manifest (v${pkg.version})...`);

  const shelfExists = existsSync(SHELF_DIR);

  let count = 0;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  // Curated entries for .claude-plugin/marketplace.json — the explicit
  // allowlist external ecosystems read. With the shelf present the list is
  // exactly readdir(skills/); pre-move it falls back to the legacy
  // unflagged-vault-skills computation so the committed manifest stays
  // byte-identical (CI diff-gates it).
  const marketplaceSkills: { name: string; description: string }[] = [];
  const shelfNames = new Set<string>();
  const vaultActiveNames = new Set<string>();

  const validateRoot = async (root: string, isShelf: boolean) => {
    for (const dirent of await readdir(root, { withFileTypes: true })) {
      if (!dirent.isDirectory() || dirent.name.startsWith('.') || dirent.name === '_template') continue;

      const skillName = dirent.name;
      const skillPath = join(root, skillName, 'SKILL.md');
      if (!existsSync(skillPath)) continue;

      const content = await readFile(skillPath, 'utf-8');
      const parts = content.split(/^---\s*$/m);

      if (parts.length >= 3) {
        const frontmatter = parts[1];

        // Description via strict YAML (handles block scalars); regex fallback
        // for frontmatter that doesn't parse (reported by validateStrictYaml).
        let rawDescription = '';
        try {
          const parsed = parseYaml(frontmatter);
          if (parsed && typeof parsed.description === 'string') rawDescription = parsed.description.trim();
        } catch {}
        if (!rawDescription) {
          const descMatch = frontmatter.match(/description:\s*(.+)$/m);
          rawDescription = descMatch ? descMatch[1].trim() : '';
        }

        validateSkill(skillName, frontmatter, content, rawDescription, errors, warnings);
        validateStrictYaml(skillName, frontmatter, errors);
        if (!rawDescription) rawDescription = `${skillName} skill`;

        // Curation flags — same regexes as discoverSkills() in src/cli/skill-source.ts
        const isSecret = /secret:\s*(true|yes)/i.test(frontmatter);
        const isHidden = /hidden:\s*(true|yes)/i.test(frontmatter);
        const isZombie = /zombie:\s*(true|yes)/i.test(frontmatter);
        const isExplicitOnly = /explicit-only:\s*(true|yes)/i.test(frontmatter);
        const isFlagged = isSecret || isHidden || isZombie || isExplicitOnly;

        if (isShelf) {
          shelfNames.add(skillName);
          if (isFlagged) {
            errors.push({ skill: skillName, message: 'shelf skill carries a secret/hidden/zombie/explicit-only flag — flagged skills live in the vault (src/skills/), not on the public shelf. git mv it back.' });
          } else {
            marketplaceSkills.push({ name: skillName, description: rawDescription });
          }
        } else {
          vaultActiveNames.add(skillName);
          if (shelfExists && !isFlagged) {
            errors.push({ skill: skillName, message: 'unflagged skill in vault (src/skills/) — public skills live on the shelf. git mv it to skills/ or add a secret/hidden/zombie/explicit-only flag.' });
          }
          if (!shelfExists && !isFlagged) {
            marketplaceSkills.push({ name: skillName, description: rawDescription });
          }
        }

        console.log(`✓ ${skillName}`);
        count++;
      } else {
        errors.push({ skill: skillName, message: 'SKILL.md has no frontmatter block (--- ... ---)' });
      }
    }
  };

  if (shelfExists) await validateRoot(SHELF_DIR, true);
  if (existsSync(VAULT_DIR)) await validateRoot(VAULT_DIR, false);

  // Split-brain gate: the same name on both roots means a rebase resurrected
  // a moved skill. Fail with an actionable message instead of double-serving.
  for (const name of shelfNames) {
    if (vaultActiveNames.has(name)) {
      errors.push({ skill: name, message: `exists in BOTH skills/ and src/skills/ — delete or git mv one copy.` });
    }
  }

  // Dot-dir gate: the vercel skills CLI scans dot-directories INSIDE a
  // container (skills/.curated/ is a first-class pattern upstream), so a
  // skills/.archive/ would be publicly installable. Dot-dirs with SKILL.md
  // never belong on the shelf.
  if (shelfExists) {
    for (const dirent of await readdir(SHELF_DIR, { withFileTypes: true })) {
      if (!dirent.isDirectory() || !dirent.name.startsWith('.')) continue;
      const nested = await readdir(join(SHELF_DIR, dirent.name), { withFileTypes: true }).catch(() => [] as import('fs').Dirent[]);
      const leaks = nested.some((d) => d.isDirectory() && existsSync(join(SHELF_DIR, dirent.name, d.name, 'SKILL.md')))
        || existsSync(join(SHELF_DIR, dirent.name, 'SKILL.md'));
      if (leaks) {
        errors.push({ skill: `skills/${dirent.name}`, message: 'dot-directory under the public shelf contains SKILL.md — external installers scan dot-dirs inside skill containers, so this WOULD be served. Move it to the vault (src/skills/).' });
      }
    }
  }

  // ── Archive integrity gate ─────────────────────────────────────────────
  // Every skill parked under src/skills/.archive/ MUST carry a curation flag
  // (zombie/secret/hidden/explicit-only) in its frontmatter. That flag is the ONLY zombie
  // signal that survives into the compiled binary: the VFS (scripts/generate-vfs.ts)
  // flattens active + archived skills into one name→files map with NO .archive/
  // path info, so discoverSkills() in compiled mode can't tell them apart by
  // location. A skill moved to .archive/ but left unflagged therefore silently
  // leaks back into the `full`/`lab` install profiles. This gate fails the
  // build the moment that happens (regression: 2026-07 zombie round 2 moved 11
  // skills to .archive/ but forgot the frontmatter flag → they kept installing).
  const archiveDir = join(VAULT_DIR, '.archive');
  if (existsSync(archiveDir)) {
    for (const dirent of await readdir(archiveDir, { withFileTypes: true })) {
      if (!dirent.isDirectory() || dirent.name.startsWith('.')) continue;
      const md = join(archiveDir, dirent.name, 'SKILL.md');
      if (!existsSync(md)) continue;
      const fm = (await readFile(md, 'utf-8')).split(/^---\s*$/m)[1] ?? '';
      if (!/(zombie|secret|hidden|explicit-only):\s*(true|yes)/i.test(fm)) {
        errors.push({
          skill: `.archive/${dirent.name}`,
          message: 'archived skill lacks a zombie/secret/hidden/explicit-only frontmatter flag — it would leak into full/lab install (the compiled VFS has no .archive/ path signal). Add `zombie: true` to its frontmatter.',
        });
      }
      if (!/internal:\s*true/i.test(fm)) {
        errors.push({
          skill: `.archive/${dirent.name}`,
          message: 'archived skill lacks `metadata:\\n  internal: true` — external installers (npx skills) would list it. Add the metadata block to its frontmatter.',
        });
      }
    }
  }

  // ── .claude-plugin/marketplace.json — explicit allowlist manifest ──────
  // The only curation mechanism external ecosystems honor (Claude Code
  // plugin marketplaces read this; nothing scans for unlisted skills).
  // Descriptions are raw (no version prefix) to keep the committed file
  // stable across version bumps.
  marketplaceSkills.sort((a, b) => a.name.localeCompare(b.name));
  const marketplace = {
    name: 'oracle-skills',
    owner: {
      name: 'Nat Weerawan',
      url: 'https://github.com/Soul-Brews-Studio',
    },
    // No version field here on purpose: version lives ONLY in package.json,
    // always computed by /calver (date+time → v{yy}.{m}.{d}-alpha.{HMM}).
    // Embedding it would go stale on every calver bump (calver writes
    // package.json directly, bypassing the npm version hook) and trip the
    // CI drift gate. Keeping the manifest version-free = byte-stable across
    // releases; it only changes when skills actually change.
    metadata: {
      description: 'Oracle Skills — symbiotic-intelligence skills for Claude Code and friends',
    },
    plugins: [
      {
        name: 'oracle-skills',
        // './' (not '.') once the shelf lands: vercel's manifest reader
        // validates source with startsWith('./'). Pre-move stays '.' so the
        // committed manifest is byte-identical.
        source: shelfExists ? './' : '.',
        description: 'Curated Oracle skill set (secret/archived tiers are intentionally not listed)',
        strict: false,
        skills: marketplaceSkills.map((s) => (shelfExists ? `./skills/${s.name}` : `./src/skills/${s.name}`)),
      },
    ],
  };
  if (!existsSync(join(process.cwd(), '.claude-plugin'))) {
    await mkdir(join(process.cwd(), '.claude-plugin'));
  }
  await writeFile(MARKETPLACE_PATH, JSON.stringify(marketplace, null, 2) + '\n');
  console.log(`📦 marketplace.json: ${marketplaceSkills.length} curated skills listed`);

  for (const w of warnings) {
    console.warn(`⚠️  ${w.skill}: ${w.message}`);
  }
  if (errors.length > 0) {
    for (const e of errors) {
      console.error(`❌ ${e.skill}: ${e.message}`);
    }
    console.error(`\n💥 ${errors.length} validation error(s) — fix frontmatter before compiling.`);
    process.exit(1);
  }

  console.log(`\n✨ Validated ${count} skills — ${marketplaceSkills.length} curated in marketplace.json`);
}

compile().catch((err) => {
  console.error(err);
  process.exit(1);
});
