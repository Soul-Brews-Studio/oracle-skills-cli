# Oracle Skills Hooks Support Design

**Date**: 2026-01-27
**Context**: Discovered when adding ralph-loop-soulbrews skill
**Confidence**: High

## Key Learning

Oracle-skills and Claude Code plugins are **two different systems**:

| System | Install Location | Hooks Support |
|--------|-----------------|---------------|
| Oracle Skills | `~/.claude/commands/*.md` | No |
| Claude Code Plugins | `~/.claude/plugins/` | Yes |

Skills that need hooks (like Ralph Loop) must be installed as Claude Code plugins, not just commands.

## The Pattern

**Detection:**
```typescript
function hasHooks(skillDir: string): boolean {
  return existsSync(join(skillDir, "hooks", "hooks.json"));
}
```

**Install logic:**
```typescript
if (hasHooks(skillDir)) {
  // Install as Claude Code plugin
  copyDir(skillDir, "~/.claude/plugins/{skill-name}/")
} else {
  // Current behavior: just copy commands
  copyFiles(skillDir + "/commands/*.md", "~/.claude/commands/")
}
```

## Why This Matters

1. **Ralph Loop needs hooks**: SessionStart + Stop hooks for self-referential loops
2. **Clean separation**: Skills without hooks stay simple (just .md files)
3. **Future-proof**: Other hook-based skills can use same pattern

## Implementation Notes

- Check for `hooks/hooks.json` (not just `hooks/` directory)
- Copy entire skill directory to plugins/ (preserves structure)
- Update uninstall to remove from both locations

## Tags

`oracle-skills`, `hooks`, `claude-code`, `plugins`, `architecture`
