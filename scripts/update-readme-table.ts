import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { profiles, ZOMBIE_SKILLS, skillDirFor } from '../src/profiles.js';

const README_PATH = join(process.cwd(), 'README.md');

function generateProfileTable(totalSkills: number): string {
  const lines: string[] = [
    '| Profile | Count | Skills |',
    '|---------|-------|--------|',
  ];

  for (const [name, profile] of Object.entries(profiles)) {
    const skills = profile.include;
    if (skills && skills.length > 0) {
      lines.push(`| **${name}** | ${skills.length} | ${skills.map(s => `\`${s}\``).join(', ')} |`);
    } else {
      lines.push(`| **${name}** | ${totalSkills} | all |`);
    }
  }

  return lines.join('\n');
}

async function generateZombieTable(): Promise<string> {
  const skillsRoot = join(process.cwd(), 'src', 'skills');
  const rows: string[] = [];

  for (const name of ZOMBIE_SKILLS) {
    const dir = skillDirFor(name, skillsRoot);
    const skillFile = join(dir, 'SKILL.md');
    if (!existsSync(skillFile)) {
      // A ZOMBIE_SKILLS entry without a matching .archive/ dir means the
      // constant and the tree drifted — fail loudly instead of silently
      // shrinking the README zombie table.
      throw new Error(`ZOMBIE_SKILLS entry "${name}" has no SKILL.md at ${skillFile} — fix src/profiles.ts or restore the archive dir.`);
    }

    const content = await readFile(skillFile, 'utf-8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) continue;

    const fm = frontmatterMatch[1];
    const descMatch = fm.match(/^description:\s*['"]?(.*?)['"]?\s*$/m);
    let desc = descMatch ? descMatch[1] : name;
    // Strip [core]/[lab] markers and version prefixes from description
    desc = desc.replace(/^\[.*?\]\s*/g, '').replace(/^v[\d.]+-?\S*\s*\|\s*/, '');
    if (desc.length > 60) desc = desc.substring(0, 57) + '...';

    rows.push(`| \`/${name}\` | ${desc} |`);
  }

  return rows.join('\n');
}

async function updateReadmeTable() {
  // Generate new skills table
  const table = execSync('bun run scripts/generate-table.ts', { encoding: 'utf-8' }).trim();

  // Read current README
  let readme = await readFile(README_PATH, 'utf-8');

  // --- Update skills table ---
  const skillsStart = readme.indexOf('<!-- skills:start -->');
  const skillsEnd = readme.indexOf('<!-- skills:end -->');

  if (skillsStart === -1 || skillsEnd === -1) {
    console.log('Could not find skills table markers in README');
    process.exit(1);
  }

  const before = readme.substring(0, skillsStart + '<!-- skills:start -->'.length);
  const after = readme.substring(skillsEnd);

  // --- Count total skills (used in both summary + profile table) ---
  const skillCount = (table.match(/^\| \d+/gm) || []).length;

  // Render the skills table open. It was collapsed back when the shelf carried 32
  // skills; the 2026-07-25 curation cut it to ~22, and the graveyard table further
  // down (39 rows) sits expanded — so collapsing the shorter, more useful one hid
  // the thing the README exists to advertise.
  const skillsSection = [
    `📚 **${skillCount} skills**`,
    '',
    table,
  ].join('\n');

  readme = `${before}\n\n${skillsSection}\n\n${after}`;

  // --- Update profiles section ---
  const profileStart = readme.indexOf('<!-- profiles:start -->');
  const profileEnd = readme.indexOf('<!-- profiles:end -->');

  if (profileStart !== -1 && profileEnd !== -1) {
    const profileBefore = readme.substring(0, profileStart + '<!-- profiles:start -->'.length);
    const profileAfter = readme.substring(profileEnd);

    const profileTable = generateProfileTable(skillCount);

    readme = `${profileBefore}\n\n${profileTable}\n\nSwitch anytime: \`/go standard\`, \`/go full\`, \`/go lab\`\n\n${profileAfter}`;
  }

  // --- Update header skill count ---
  readme = readme.replace(
    /\d+ skills for AI coding agents/,
    `${skillCount} skills for AI coding agents`
  );

  // NOTE: install commands are no longer version-stamped from package.json.
  // Under the GitHub-only release flow not every CalVer bump is published to
  // npm, so stamping pinned READMEs to versions npx couldn't resolve (404 —
  // e.g. 26.7.6-alpha.1059 was bumped+tagged but never published). Install
  // commands use the evergreen `github:...#alpha` / `@latest` forms instead.

  // --- Update zombie skills section ---
  const secretStart = readme.indexOf('<!-- secret-skills:start -->');
  const secretEnd = readme.indexOf('<!-- secret-skills:end -->');

  if (secretStart !== -1 && secretEnd !== -1) {
    const secretBefore = readme.substring(0, secretStart + '<!-- secret-skills:start -->'.length);
    const secretAfter = readme.substring(secretEnd);

    const zombieTable = await generateZombieTable();
    const zombieCount = zombieTable.split('\n').filter(l => l.startsWith('|')).length;

    // Collapse the graveyard, not the shelf. This table is the longest in the
    // README and the least useful to a newcomer — the inverse of the skills
    // table above, which renders open. A blank line after <summary> is required
    // for GitHub to render the table inside the collapsed block.
    const secretSection = [
      '',
      `## Zombie Skills`,
      '',
      '<details>',
      `<summary>🧟 <strong>${zombieCount} zombie skills</strong> — excluded from all profiles, installable by name</summary>`,
      '',
      '```bash',
      'bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -s <name>',
      '```',
      '',
      '| Skill | What |',
      '|-------|------|',
      zombieTable,
      '',
      '</details>',
      '',
    ].join('\n');

    readme = `${secretBefore}\n${secretSection}${secretAfter}`;
  }

  // Check if changed
  const original = await readFile(README_PATH, 'utf-8');
  if (readme === original) {
    console.log('README is up to date');
    process.exit(0);
  }

  // Write updated README
  await writeFile(README_PATH, readme);
  console.log('README updated (skills table + profiles)');

  // Stage the change
  execSync('git add README.md');
  console.log('README.md staged');
}

updateReadmeTable().catch(console.error);
