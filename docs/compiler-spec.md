# Oracle Skills Installer

## Overview

The installer copies skills to agent-specific directories with version tagging.

## Install Locations by Agent

| Agent | Skills Directory | Commands Directory | Format |
|-------|------------------|-------------------|--------|
| Claude Code | `.claude/skills/{name}/SKILL.md` | - | Directory |
| OpenCode | `.opencode/skills/{name}/SKILL.md` | `.opencode/commands/{name}.md` | Both |
| Cursor | `.cursor/skills/{name}/SKILL.md` | - | Directory |
| Windsurf | `.windsurf/skills/{name}/SKILL.md` | - | Directory |
| Codex | `.codex/skills/{name}/SKILL.md` | - | Directory |
| Amp | `.agents/skills/{name}/SKILL.md` | - | Directory |

## OpenCode Dual Install

OpenCode has two separate concepts:
- **Skills** (`skills/`): Agent skills in `{name}/SKILL.md` format
- **Commands** (`commands/`): Slash commands in flat `{name}.md` format

The installer creates BOTH for OpenCode.

## Version Tagging

Description format: `v{version} {scope}-{type} | {description}`

| Tag | Meaning |
|-----|---------|
| `G-SKLL` | Global skill |
| `L-SKLL` | Local skill |
| `G-CMD` | Global command |
| `L-CMD` | Local command |

**Example:**
```
description: v1.5.10 G-SKLL | Find projects across git history.
```

## Global Paths

| Agent | Global Skills | Global Commands |
|-------|---------------|-----------------|
| Claude Code | `~/.claude/skills` | - |
| OpenCode | `~/.config/opencode/skills` | `~/.config/opencode/commands` |
| Cursor | `~/.cursor/skills` | - |
| Windsurf | `~/.codeium/windsurf/skills` | - |

## Commands Compiler

Pre-compiles stub commands for Claude Code (references skill location):

```
INPUT                      OUTPUT
skills/{name}/SKILL.md  →  commands/{name}.md (stub)
```

**Stub format:**
```markdown
---
description: v1.5.10 | {description}
---

AI: load skill `{name}` args: $ARGUMENTS (v1.5.10)
Human: {skillPath}/{name}/SKILL.md
```

## Run

```bash
# Install to specific agent
bun run src/index.ts install --agent opencode --global --yes
bun run src/index.ts install --agent claude-code --yes

# Uninstall
bun run src/index.ts uninstall --agent opencode --global --yes

# Compile stubs (for Claude Code)
bun run scripts/compile.ts
```
