# Cleanup Flag Pattern for Oracle Skills

**Date**: 2026-01-27
**Context**: oracle-skills-cli update mechanism
**Confidence**: High

## Key Learning

When updating oracle-skills, old skills from previous versions may remain in the skills directory because the installer only overwrites existing files with matching names. If a skill is renamed or removed between versions (e.g., `/soul-sync` → `/oracle-soul-sync-calibrate-update`), the old version persists.

The solution is a `--cleanup` flag in the update skill that explicitly uninstalls before reinstalling:

```bash
oracle-skills uninstall -g -y && oracle-skills install -g -y
```

This gives users explicit control over when to perform a clean install vs an in-place update.

## The Pattern

```markdown
## Usage
/skill-name           # Normal operation
/skill-name --cleanup # Clean + reinstall
```

**In implementation:**
- Normal sync: Just run install (overwrites)
- Cleanup sync: Uninstall first, then install (removes stale files)

## Why This Matters

- **User control**: Users decide when to do aggressive cleanup
- **Safety**: Doesn't automatically delete potentially-customized skills
- **Transparency**: User sees exactly what happens
- **Reversible**: Can reinstall if something goes wrong

The user explicitly requested this approach over auto-cleanup in the installer, demonstrating the Oracle principle of keeping the human in control.

## Tags

`patterns`, `cli`, `cleanup`, `update`, `oracle-skills`
