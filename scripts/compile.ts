import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';

const SKILLS_DIR = join(process.cwd(), 'skills');
const COMMANDS_DIR = join(process.cwd(), 'commands');

async function compile() {
  console.log('🔮 Compiling skills to commands...');

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
        const body = parts.slice(2).join('---').trim();
        
        // Extract description
        const descMatch = frontmatter.match(/description:\s*(.+)$/m);
        const description = descMatch ? descMatch[1].trim() : `${skillName} skill`;
        
        // Create command format
        const commandContent = `---
description: ${description}
---

**EXECUTE NOW:**

${body}
`;

        await writeFile(join(COMMANDS_DIR, `${skillName}.md`), commandContent);
        console.log(`✓ ${skillName}`);
        count++;
      }
    }
  }

  console.log(`\n✨ Compiled ${count} skills to ${COMMANDS_DIR}`);
}

compile().catch(console.error);
