#!/usr/bin/env bun
/**
 * Skill Creator Script
 * Generates new skill folders with Oracle philosophy
 */
import { $ } from "bun"
import { mkdir, writeFile, exists } from "fs/promises"
import { join } from "path"

const args = process.argv.slice(2)
const skillName = args[0]
const isQuick = args.includes("--quick")

if (!skillName) {
  console.error("Usage: bun create.ts <skill-name> [--quick]")
  process.exit(1)
}

// Paths
const skillsDir = join(import.meta.dir, "../..")
const skillDir = join(skillsDir, skillName)
const scriptsDir = join(skillDir, "scripts")

// Check if exists
if (await exists(skillDir)) {
  console.error(`Skill "${skillName}" already exists at ${skillDir}`)
  process.exit(1)
}

// Create directories
await mkdir(scriptsDir, { recursive: true })

// Generate SKILL.md
const skillMd = `---
name: ${skillName}
description: [DESCRIPTION]. Use when user says "${skillName}", "[TRIGGER2]", or "[TRIGGER3]".
---

# /${skillName} - [TITLE]

[What this skill does in one sentence.]

## Usage

\`\`\`
/${skillName} [args]
\`\`\`

## Step 0: Timestamp

\`\`\`bash
date "+🕐 %H:%M (%A %d %B %Y)"
\`\`\`

## Step 1: Execute

\`\`\`bash
bun scripts/main.ts "$ARGUMENTS"
\`\`\`

## Step 2: Process Output

Display results to user.

---

## Oracle Integration

On success:
\`\`\`
oracle_learn({ pattern: "[What was accomplished]" })
\`\`\`

On trace/search:
\`\`\`
oracle_trace({ query: "[What was searched]" })
\`\`\`

---

ARGUMENTS: $ARGUMENTS
`

// Generate main.ts
const mainTs = `#!/usr/bin/env bun
/**
 * ${skillName} - Main Script
 *
 * Oracle Philosophy:
 * 1. Nothing is Deleted - Log meaningful actions
 * 2. Patterns Over Intentions - Focus on outputs
 * 3. External Brain - Assist, don't decide
 */
import { $ } from "bun"

const args = process.argv.slice(2)
const input = args.join(" ") || ""

// ============================================
// YOUR LOGIC HERE
// ============================================

// Example: Run a command
// const result = await $\`your-command \${input}\`.text()

// Example: Search files
// const files = await $\`grep -ril "\${input}" . 2>/dev/null\`.text()

// Example: Git operations
// const commits = await $\`git log --oneline | head -10\`.text()

// Placeholder output
const result = {
  skill: "${skillName}",
  input,
  status: "ready to implement",
  timestamp: new Date().toISOString()
}

// ============================================
// OUTPUT
// ============================================

console.log(JSON.stringify(result, null, 2))
`

// Write files
await writeFile(join(skillDir, "SKILL.md"), skillMd)
await writeFile(join(scriptsDir, "main.ts"), mainTs)

// Make script executable
await $`chmod +x ${join(scriptsDir, "main.ts")}`

console.log(JSON.stringify({
  success: true,
  skill: skillName,
  created: [
    `${skillName}/SKILL.md`,
    `${skillName}/scripts/main.ts`
  ],
  next_steps: [
    `Edit ${skillName}/SKILL.md - Update description and triggers`,
    `Edit ${skillName}/scripts/main.ts - Add your logic`,
    `Test: bun ${skillName}/scripts/main.ts "test"`,
    `Register: Add to marketplace.json skills array`
  ]
}, null, 2))
