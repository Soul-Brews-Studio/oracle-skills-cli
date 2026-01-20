# Oracle Skills Compiler

## What It Does

```
INPUT                      OUTPUT
skills/{name}/SKILL.md  →  commands/{name}.md (stub)
```

## Input

**File**: `skills/{name}/SKILL.md`

```markdown
---
description: {description}
---

{content}
```

## Output

**File**: `commands/{name}.md`

```markdown
---
description: {version} | {description}
---

Load skill `{name}` version {version} from path below and execute with arguments.

Skill: {skillPath}/{name}/SKILL.md

ARGUMENTS: {args}
```

## Placeholders

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{name}` | Directory name | `trace` |
| `{description}` | Frontmatter | `Find projects across git history.` |
| `{version}` | package.json | `v1.4.0` |
| `{skillPath}` | Install location (scope + agent) | `.claude/skills` or `~/.claude/skills` |
| `{args}` | User input at runtime | `--deep about oracle` |

## Skill Paths by Agent & Scope

| Agent | Local (project) | Global (user) |
|-------|-----------------|---------------|
| Claude Code | `.claude/skills` | `~/.claude/skills` |
| OpenCode | `.opencode/command` | `~/.config/opencode/command` |
| Cursor | `.cursor/skills` | `~/.cursor/skills` |
| Windsurf | `.windsurf/skills` | `~/.codeium/windsurf/skills` |
| Codex | `.codex/skills` | `~/.codex/skills` |
| Amp | `.agents/skills` | `~/.config/agents/skills` |

## Example

**Global install to Claude Code**:
```markdown
---
description: v1.4.0 | Find projects across git history.
---

Load skill `trace` version v1.4.0 from path below and execute with arguments.

Skill: ~/.claude/skills/trace/SKILL.md

ARGUMENTS: {args}
```

**Local install to OpenCode**:
```markdown
---
description: v1.4.0 | Find projects across git history.
---

Load skill `trace` version v1.4.0 from path below and execute with arguments.

Skill: .opencode/command/trace/SKILL.md

ARGUMENTS: {args}
```

## Run

```bash
bun run scripts/compile.ts --agent claude-code --scope global
bun run scripts/compile.ts --agent opencode --scope local
```
