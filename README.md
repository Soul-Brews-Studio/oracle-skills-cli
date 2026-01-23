# oracle-skills

[![CI](https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/Soul-Brews-Studio/oracle-skills-cli?label=version)](https://github.com/Soul-Brews-Studio/oracle-skills-cli/releases)

Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents.

## Install — FOR AI LLM AGENTS

Copy to your AI agent or run manually:

```
# Requirements: bash/zsh (macOS/Linux) or Git Bash (Windows)

# 1. Check & install bun
which bun || curl -fsSL https://bun.sh/install | bash

# 2. Check & install ghq (for /learn and /trace)
which ghq || brew install ghq  # macOS
# Linux/Windows: go install github.com/x-motemen/ghq@latest

# 3. Install oracle-skills
bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli \
  install -g -y

# 4. Create alias (add to ~/.bashrc or ~/.zshrc)
alias oracle-skills='bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli'

# 5. Usage
oracle-skills install -g -y    # install all skills
oracle-skills list -g          # list installed
oracle-skills uninstall -g -y  # uninstall

# Flags: -g (global) -y (skip prompts) -a (agent) -s (skill)
```

Then run `claude "/awaken"` to create a new Oracle ([example](https://github.com/Soul-Brews-Studio/phukhao-oracle)).

## Skills

Oracle skills extend your agent's capabilities with specialized workflows:

| # | Skill | Type | Description |
|---|-------|------|-------------|
| 1 | **awaken** | subagent | Guided Oracle birth |
| 2 | **learn** | subagent | Explore a codebase |
| 3 | **physical** | subagent | Physical location awareness from FindMy |
| 4 | **rrr** | subagent | Create session retrospective with AI diary |
| 5 | **trace** | subagent | Find projects across git history, repos |
| - |  |  |  |
| 6 | **project** | prompt + scripts (11) | Clone and track external repos |
| 7 | **recap** | prompt + scripts (2) | Fresh-start orientation—adaptive synthesis |
| 8 | **schedule** | prompt + scripts (2) | Query schedule.md using DuckDB markdown |
| 9 | **skill-creator** | prompt + scripts (1) | Create new skills with Oracle philosophy |
| 10 | **watch** | prompt + scripts (3) | Learn from YouTube videos |
| - |  |  |  |
| 11 | **feel** | prompt | Log emotions with optional structure |
| 12 | **forward** | prompt | Create handoff for next session |
| 13 | **fyi** | prompt | Log information for future reference |
| 14 | **oracle-family-scan** | prompt | oracle-family-scan skill |
| 15 | **philosophy** | prompt | Display Oracle philosophy principles |
| 16 | **standup** | prompt | Daily standup check |
| 17 | **where-we-are** | prompt | Session awareness - what we're doing now |
| 18 | **who** | prompt | Know thyself |

## Supported Agents

| Agent | Project Path | Global Path |
|-------|--------------|-------------|
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
| OpenCode | `.opencode/skills/` | `~/.config/opencode/skills/` |
| Codex | `.codex/skills/` | `~/.codex/skills/` |
| Cursor | `.cursor/skills/` | `~/.cursor/skills/` |
| Amp | `.agents/skills/` | `~/.config/agents/skills/` |
| Kilo Code | `.kilocode/skills/` | `~/.kilocode/skills/` |
| Roo Code | `.roo/skills/` | `~/.roo/skills/` |
| Goose | `.goose/skills/` | `~/.config/goose/skills/` |
| Gemini CLI | `.gemini/skills/` | `~/.gemini/skills/` |
| Antigravity | `.agent/skills/` | `~/.gemini/antigravity/skills/` |
| GitHub Copilot | `.github/skills/` | `~/.copilot/skills/` |
| Clawdbot | `skills/` | `~/.clawdbot/skills/` |
| Droid | `.factory/skills/` | `~/.factory/skills/` |
| Windsurf | `.windsurf/skills/` | `~/.codeium/windsurf/skills/` |

## Philosophy

> "The Oracle Keeps the Human Human"

Oracle skills follow the Oracle Philosophy — AI as external brain, not commander. These skills help AI assistants understand context, maintain session awareness, and build knowledge over time.

## Related

- [Soul Brews Plugin Marketplace](https://github.com/Soul-Brews-Studio/plugin-marketplace) - Source of Oracle skills
- [Agent Skills Specification](https://agentskills.io) - Cross-agent skill format
- [add-skill](https://github.com/vercel-labs/add-skill) - Universal skill installer by Vercel

## License

MIT
