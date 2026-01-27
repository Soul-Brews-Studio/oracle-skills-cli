---
title: ## Skill Creation: The Correct Pattern
tags: [skill-creation, installer, oracle-skills-cli, auto-reload, G-SKLL]
created: 2026-01-27
source: Session 2026-01-27: speak skill creation
---

# ## Skill Creation: The Correct Pattern

## Skill Creation: The Correct Pattern

**Date**: 2026-01-27
**Context**: Creating /speak skill with edge-tts + macOS say

### The Wrong Way (Manual Copy)
```bash
cp -r src/skills/speak ~/.claude/skills/  # WRONG!
```
Result: Skill shows as "(user)" format without version prefix.

### The Correct Way (Installer)
```bash
# 1. Create skill in src/skills/{name}/
#    - SKILL.md (with frontmatter: name, description)
#    - scripts/{name}.ts (optional)

# 2. Compile to generate command stubs
bun run compile

# 3. Install with proper installer
bun run src/cli/index.ts install -y -g --skill {name}
```
Result: Skill shows as `v1.5.39 G-SKLL | description...` and auto-reloads!

### What the Installer Does
1. Copies skill to `~/.claude/skills/`
2. Injects `installer: oracle-skills-cli v{version}` into frontmatter
3. Prepends `v{version} G-SKLL |` to description
4. Updates `.oracle-skills.json` manifest
5. **Auto-reloads** in Claude Code (no restart needed!)

### Why This Matters
- Proper versioning for tracking
- Auto-reload saves time (no restart)
- Consistent formatting across all skills
- Manifest tracking for updates

Successfully used for: /deep-research, /speak

---
*Added via Oracle Learn*
