# Oracle Skills Compiler

## What It Does

```
INPUT                      OUTPUT
skills/{name}/SKILL.md  →  commands/{name}.md
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

> This is an example content from skill `{name}` (may be removed in future versions).

{content}

Load skill `{name}` version {version} and execute with the arguments below.

ARGUMENTS: {args}
```

## Placeholders

| Placeholder | Source | Example |
|-------------|--------|---------|
| `{name}` | Directory name | `trace` |
| `{description}` | Frontmatter | `Find projects across git history.` |
| `{version}` | package.json | `v1.4.0` |
| `{content}` | Skill body | `# /trace - Unified Discovery System...` |
| `{args}` | User input at runtime | `--deep about oracle` |

## Example

**Input**: `skills/trace/SKILL.md`
```markdown
---
description: Find projects across git history.
---

# /trace - Unified Discovery System

Usage: /trace [query] --deep
```

**Output**: `commands/trace.md`
```markdown
---
description: v1.4.0 | Find projects across git history.
---

> This is an example content from skill `trace` (may be removed in future versions).

# /trace - Unified Discovery System

Usage: /trace [query] --deep

Load skill `trace` version v1.4.0 and execute with the arguments below.

ARGUMENTS: {args}
```

## Run

```bash
bun run scripts/compile.ts
```
