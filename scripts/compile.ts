import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import pkg from '../package.json' with { type: 'json' };

const SKILLS_DIR = join(process.cwd(), 'skills');
const COMMANDS_DIR = join(process.cwd(), 'commands');

// Default skill path (can be overridden at install time)
const DEFAULT_SKILL_PATH = '{skillPath}';

async function compile() {
  console.log(`🔮 Compiling skills to commands (v${pkg.version})...`);

  if (!existsSync(COMMANDS_DIR)) {
    await mkdir(COMMANDS_DIR);
  }

  const skills = await readdir(SKILLS_DIR, { withFileTypes: true });

  let count = 0;

  for (const dirent of skills) {
    if (!dirent.isDirectory() || dirent.name.startsWith('.') || dirent.name === '_template') continue;

    const skillName = dirent.name;
    const skillPath = join(SKILLS_DIR, skillName, 'SKILL.md');

    if (existsSync(skillPath)) {
      const content = await readFile(skillPath, 'utf-8');
      
      // Parse frontmatter
      const parts = content.split(/^---\s*$/m);
      
      if (parts.length >= 3) {
        const frontmatter = parts[1];
        
        // Extract description
        const descMatch = frontmatter.match(/description:\s*(.+)$/m);
        const rawDescription = descMatch ? descMatch[1].trim() : `${skillName} skill`;
        
        // Inject version
        const description = `v${pkg.version} | ${rawDescription}`;
        
        // Create stub command that tells agent to execute skill with args
        const commandContent = `---
description: ${description}
---

# /${skillName}

Execute the \`${skillName}\` skill with the provided arguments.

## Instructions

1. Read the skill file: \`${DEFAULT_SKILL_PATH}/${skillName}/SKILL.md\`
2. Follow all instructions in the skill file
3. Pass these arguments to the skill: \`$ARGUMENTS\`

## Skill Location

- Local: \`.claude/skills/${skillName}/SKILL.md\`
- Global: \`~/.claude/skills/${skillName}/SKILL.md\`

---
*oracle-skills-cli v${pkg.version}*
`;

        await writeFile(join(COMMANDS_DIR, `${skillName}.md`), commandContent);
        console.log(`✓ ${skillName} (v${pkg.version})`);
        count++;
      }
    }
  }

  console.log(`\n✨ Compiled ${count} skill stubs to ${COMMANDS_DIR}`);
}

compile().catch(console.error);
