import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { execSync } from 'child_process';

const README_PATH = join(process.cwd(), 'README.md');

async function updateReadmeTable() {
  // Generate new table
  const table = execSync('bun run scripts/generate-table.ts', { encoding: 'utf-8' }).trim();

  // Generate timestamp (UTC)
  const now = new Date();
  const timestamp = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

  // Read current README
  const readme = await readFile(README_PATH, 'utf-8');

  // Find and replace table (between "specialized workflows:" and "## Supported Agents")
  const tableStart = readme.indexOf('specialized workflows:');
  const tableEnd = readme.indexOf('\n## Supported Agents');

  if (tableStart === -1 || tableEnd === -1) {
    console.log('Could not find table markers in README');
    process.exit(1);
  }

  const before = readme.substring(0, tableStart + 'specialized workflows:'.length);
  const after = readme.substring(tableEnd);

  const newReadme = `${before}\n\n${table}\n\n*Generated: ${timestamp}*\n${after}`;
  
  // Check if changed
  if (newReadme === readme) {
    console.log('README table is up to date');
    process.exit(0);
  }
  
  // Write updated README
  await writeFile(README_PATH, newReadme);
  console.log('README table updated');
  
  // Stage the change
  execSync('git add README.md');
  console.log('README.md staged');
}

updateReadmeTable().catch(console.error);
