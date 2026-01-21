# Bun Shell Patterns

Quick reference for skill scripts.

## Basic Commands

```typescript
import { $ } from "bun"

// Run and get text
const output = await $`git status`.text()

// With variables (auto-escaped!)
const query = "search term"
const result = await $`grep -r ${query} .`.text()

// Multi-line command
const commits = await $`
  git log --oneline
  --since="1 week ago"
`.text()
```

## Output Formats

```typescript
// As text
const text = await $`cat file.txt`.text()

// As JSON
const pkg = await $`cat package.json`.json()

// As lines array
const lines = (await $`ls`.text()).split("\n")

// As Buffer
const buffer = await $`cat image.png`.arrayBuffer()
```

## Error Handling

```typescript
// Throws on error (default)
try {
  await $`git checkout nonexistent`
} catch (e) {
  console.error("Failed")
}

// Quiet mode (no throw)
const result = await $`git checkout nonexistent`.quiet()
if (result.exitCode !== 0) {
  console.error(result.stderr.toString())
}

// Check exit code
const { exitCode } = await $`git diff --quiet`
const hasChanges = exitCode !== 0
```

## Piping

```typescript
// Pipe commands
const count = await $`git log --oneline | wc -l`.text()

// Suppress stderr
const files = await $`find . -name "*.ts" 2>/dev/null`.text()
```

## Environment Variables

```typescript
// Pass env vars
const result = await $`echo $HOME`.env({ HOME: "/custom" }).text()

// Use current env
const path = await $`echo $PATH`.text()
```

## Comparison with Node

| Task | Bun Shell | Node |
|------|-----------|------|
| Run command | `await $\`cmd\`.text()` | `execSync("cmd", {encoding:"utf8"})` |
| With vars | `$\`cmd ${var}\`` | `execSync(\`cmd ${var}\`)` |
| JSON output | `$\`cmd\`.json()` | `JSON.parse(execSync(...))` |
| Error handling | `.quiet()` | `try/catch` |

## Tips

1. Variables in `$\`...\`` are auto-escaped (safe!)
2. Use `.quiet()` to prevent throws on non-zero exit
3. Use `2>/dev/null` to suppress stderr
4. Multi-line commands work naturally
5. Piping with `|` works as expected
