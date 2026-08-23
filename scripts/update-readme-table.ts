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

/** Guard, not a renderer. The zombie table left the README on 2026-08-22, but the
 *  constant↔disk invariant still matters: a ZOMBIE_SKILLS entry with no directory
 *  means someone retired a skill in place and forgot the files (or vice versa).
 *  With the archive moved out the constant is empty, so this is a no-op today —
 *  it exists so the next in-place retirement cannot drift silently. */
async function assertZombieDirsExist(): Promise<void> {
  const skillsRoot = join(process.cwd(), 'src', 'skills');
  for (const name of ZOMBIE_SKILLS) {
    const dir = skillDirFor(name, skillsRoot);
    const skillFile = join(dir, 'SKILL.md');
    if (!existsSync(skillFile)) {
      // A ZOMBIE_SKILLS entry without a matching .archive/ dir means the
      // constant and the tree drifted — fail loudly instead of silently
      // shrinking the README zombie table.
      throw new Error(`ZOMBIE_SKILLS entry "${name}" has no SKILL.md at ${skillFile} — fix src/profiles.ts or restore the archive dir.`);
    }


  }
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

  await assertZombieDirsExist();

  if (secretStart !== -1 && secretEnd !== -1) {
    const secretBefore = readme.substring(0, secretStart + '<!-- secret-skills:start -->'.length);
    const secretAfter = readme.substring(secretEnd);

    // The 39 zombies moved to their own repo on 2026-08-22. This section used to
    // render them as a 39-row table with an `install -s <name>` command that no
    // longer resolves. Now it is a forwarding address — the table lives in the
    // archive repo's own README, where it is generated next to the skills it
    // describes rather than three files away from them.
    const secretSection = [
      '',
      `## Zombie Skills`,
      '',
      // No count here. It was hardcoded as 39 on 2026-08-22 and was wrong by the 23rd
      // (44 after a second archiving round) — the exact stale-number trap this repo
      // keeps re-learning. The archive repo's own README counts itself.
      'Archived skills — excluded from every profile — live in their own repository:',
      '',
      '**→ https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive**',
      '',
      'Moved out of this repo starting 2026-08-22. Nothing was deleted: their full history',
      'remains in this git log, and `src/skills/.archive/MOVED.md` is the breadcrumb.',
      '',
      '```bash',
      'git clone https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive',
      'cp -R arra-oracle-skills-archive/skills/<name> ~/.claude/skills/',
      '```',
      '',
      '`arra install -s <zombie-name>` no longer resolves — those skills are not bundled',
      'in the CLI any more. That path was removed deliberately, not by accident.',
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
