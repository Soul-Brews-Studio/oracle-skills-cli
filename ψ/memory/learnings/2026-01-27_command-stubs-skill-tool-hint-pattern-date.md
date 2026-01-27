---
title: ## Command Stubs: Skill Tool Hint Pattern
tags: [skill-tool, command-stubs, opencode, compile, installer]
created: 2026-01-27
source: Session 2026-01-27: Skill tool hint
---

# ## Command Stubs: Skill Tool Hint Pattern

## Command Stubs: Skill Tool Hint Pattern

**Date**: 2026-01-27
**Context**: OpenCode reading skill files instead of using Skill tool

### The Problem
Agents with Skill tool (like Claude Code) were reading skill files manually instead of using the Skill tool directly. This caused unnecessary file read permission prompts.

### The Solution
Add a hint to generated command stubs:

```markdown
**If you have a Skill tool available**: Use it directly with `skill: "{name}"` instead of reading the file manually.

**Otherwise**: Read the skill file...
```

### Files Updated
1. `scripts/compile.ts` - for Claude Code commands
2. `src/cli/installer.ts` - for OpenCode commands

### Why This Matters
- Faster execution (no file read)
- Fewer permission prompts
- Better UX for agents with Skill tool
- Fallback still works for agents without it

---
*Added via Oracle Learn*
