# AI-First Documentation Design

**Date**: 2026-01-23
**Context**: oracle-skills-cli README redesign
**Confidence**: High

## Key Learning

Documentation is no longer just for humans reading on GitHub or docs sites. With AI coding agents becoming the primary interface for many developers, documentation should be designed for copy-paste into LLM prompts.

The traditional README pattern - separate Install, Usage, Examples sections with explanatory prose - creates friction for AI agents. They need to parse, extract, and reassemble. A single, self-contained code block that can be copied and executed directly is more effective.

This shifts the documentation philosophy from "explain to humans" to "instruct agents". Both audiences can still benefit, but the primary consumer changes the optimal format.

## The Pattern

**Before (human-first):**
```markdown
## Install
First install bun...
Then run...

## Usage
Create an alias...
Then you can use...
```

**After (AI-first):**
```markdown
## Install — FOR AI LLM AGENTS

Copy to your AI agent or run manually:

```
# 1. Check bun
which bun || curl -fsSL https://bun.sh/install | bash

# 2. Install
bunx --bun oracle-skills@github:... install -g -y

# 3. Alias
alias oracle-skills='bunx --bun oracle-skills@github:...'

# 4. Usage
oracle-skills install -g -y
oracle-skills list -g
```
```

## Why This Matters

1. **Reduced friction**: AI agents can execute the block directly without parsing
2. **Self-contained**: All dependencies, checks, and steps in one place
3. **Shell-compatible**: Works in bash/zsh/Git Bash without modification
4. **Copy-paste friendly**: No horizontal scrolling, clear structure

As AI agents become the primary way developers interact with tools, documentation that's optimized for agent consumption will have an adoption advantage.

## Tags

`documentation`, `ai-agents`, `developer-experience`, `readme`, `oracle-philosophy`
