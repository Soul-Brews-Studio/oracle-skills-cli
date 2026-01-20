# OpenCode: Skills vs Commands Architecture

**Date**: 2026-01-20  
**Context**: oracle-skills-cli installer refactoring  
**Confidence**: High (verified against docs and working install)

## Key Learning

OpenCode has TWO separate concepts that serve different purposes:

### Skills (`skills/`)
- **Location**: `~/.config/opencode/skills/{name}/SKILL.md`
- **Format**: Directory with SKILL.md file inside
- **Purpose**: Agent skills - full instructions for complex tasks
- **Content**: Complete skill with all steps, code, examples

### Commands (`commands/`)
- **Location**: `~/.config/opencode/commands/{name}.md`
- **Format**: Flat `.md` file (NOT a directory)
- **Purpose**: Slash commands - quick triggers in TUI
- **Content**: Lightweight stub that can point to a skill

## The Pattern

```
commands/rrr.md (stub)
  → "Read skill file: skills/rrr/SKILL.md"
    → skills/rrr/SKILL.md (full content)
```

Commands are triggers. Skills are the actual instructions.

## Why This Matters

1. **Separation of concerns**: Commands are UI, skills are logic
2. **Lightweight commands**: Fast to load, show in autocomplete
3. **Heavy skills**: Can be complex without bloating command list
4. **Flexibility**: One skill can be triggered multiple ways

## Common Mistake

Putting full skill content in `commands/` - this works but defeats the purpose. Commands should be lightweight pointers.

## Tags

`opencode`, `architecture`, `installer`, `skills`, `commands`
