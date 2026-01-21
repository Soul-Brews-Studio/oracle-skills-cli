#!/usr/bin/env bun
/**
 * Skill Script Template
 *
 * Uses Bun Shell for clean, Python-like syntax.
 * Also works with: npx tsx scripts/main.ts
 */
import { $ } from "bun"

// Get arguments
const args = process.argv.slice(2)
const query = args[0] || ""

// ============================================
// YOUR LOGIC HERE
// ============================================

// Example: Git search
const commits = await $`git log --oneline --grep=${query} 2>/dev/null | head -10`.text()

// Example: File search
const files = await $`grep -ril ${query} . 2>/dev/null | head -10`.text()

// Example: Read file (if exists)
// const content = await $`cat config.json 2>/dev/null`.text()

// Example: Check command exists
// const hasTool = (await $`command -v tool`.quiet()).exitCode === 0

// ============================================
// OUTPUT
// ============================================

// Option 1: JSON (for structured data)
console.log(JSON.stringify({
  query,
  commits: commits.split("\n").filter(Boolean),
  files: files.split("\n").filter(Boolean),
}, null, 2))

// Option 2: Plain text (for simple output)
// console.log(`Found ${commits.split("\n").length} commits`)

// Option 3: Markdown (for formatted display)
// console.log(`## Results for: ${query}\n\n${commits}`)
