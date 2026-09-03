import type { Command } from 'commander';
import { discoverSkills } from '../installer.js';
import { profiles, resolveProfile } from '../../profiles.js';

export function registerProfiles(program: Command) {
  program
    .command('profiles [name]')
    .description('List available profiles')
    .action(async (name?: string) => {
      const allSkills = await discoverSkills();
      const allNames = allSkills.map((s) => s.name);
      // Secret, zombie, and explicit-only skills are excluded from every profile — pass them to
      // resolveProfile so this display matches what `install` actually resolves.
      // Omitting them made `lab` print all 68 discovered skills (incl. archived
      // zombies) instead of the ~36 it really installs.
      const secretNames = allSkills.filter((s) => s.secret).map((s) => s.name);
      const zombieNames = allSkills.filter((s) => s.zombie).map((s) => s.name);
      const explicitOnlyNames = allSkills.filter((s) => s.explicitOnly).map((s) => s.name);
      const cleanAll = allNames.filter(
        (s) => !secretNames.includes(s) && !zombieNames.includes(s) && !explicitOnlyNames.includes(s),
      );

      if (name) {
        if (!profiles[name]) {
          console.log(`\n  Unknown profile: ${name}`);
          console.log(`  Available: ${Object.keys(profiles).join(', ')}\n`);
          return;
        }
        const skills = resolveProfile(name, allNames, secretNames, zombieNames, explicitOnlyNames) || cleanAll;
        console.log(`\n  Profile: ${name} (${skills.length} skills)`);
        console.log(`  Skills: ${skills.join(', ')}\n`);
        return;
      }

      console.log('\n  Available profiles:\n');
      for (const [pName] of Object.entries(profiles)) {
        const skills = resolveProfile(pName, allNames, secretNames, zombieNames, explicitOnlyNames);
        const count = skills ? skills.length : cleanAll.length;
        console.log(`    ${pName.padEnd(12)} ${count} skills`);
      }
      console.log(`\n  Usage: arra-oracle-skills install -g -y -p <profile>\n`);
    });
}
