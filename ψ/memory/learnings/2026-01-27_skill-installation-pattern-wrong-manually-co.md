---
title: **Skill Installation Pattern**
tags: [skills, oracle-skills-cli, installation, claude-code, lesson-learned]
created: 2026-01-27
source: Oracle Learn
---

# **Skill Installation Pattern**

**Skill Installation Pattern**

WRONG: Manually copying skills to ~/.claude/skills/
- Shows as "(user)" without version prefix
- Missing installer metadata
- May not auto-reload

RIGHT: Use oracle-skills-cli installer
```bash
bun run src/cli/index.ts install -y -g --skill skill-name
```

The installer:
1. Adds `installer: oracle-skills-cli v{version}` to frontmatter
2. Prepends `v{version} G-SKLL |` to description
3. Updates `.oracle-skills.json` manifest
4. Auto-reloads in Claude Code (no restart!)

Key insight: compile.ts generates command stubs for distribution, but installer.ts handles proper local installation with metadata injection.

---
*Added via Oracle Learn*
