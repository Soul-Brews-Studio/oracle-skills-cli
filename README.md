# oracle-skills

[![CI](https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/Soul-Brews-Studio/oracle-skills-cli?label=version)](https://github.com/Soul-Brews-Studio/oracle-skills-cli/releases)

Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents with a single command.

## Quick Start

```bash
# Latest from GitHub (recommended)
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli install -g -y

# Specific version
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.14 install -g -y
```

> **Note**: Requires [Bun](https://bun.sh). Install with `curl -fsSL https://bun.sh/install | bash`

## What are Oracle Skills?

Oracle skills are reusable instruction sets for AI coding agents, built by [Soul Brews Studio](https://github.com/Soul-Brews-Studio). They extend your agent's capabilities with specialized workflows:

### Subagent Skills
Uses parallel agents for complex tasks.

| Skill | Description |
|-------|-------------|
| **context-finder** | Fast codebase search |
| **learn** | Explore codebases with parallel agents |
| **rrr** | Session retrospective with AI diary |
| **trace** | Find projects across git history, repos, docs |

### Prompt Skills
Simple instruction-based skills.

| Skill | Description |
|-------|-------------|
| **feel** | Log emotions |
| **forward** | Session handoff |
| **fyi** | Log information for reference |
| **standup** | Daily standup check |
| **where-we-are** | Session awareness |

### Prompt + Scripts Skills
Skills with executable helper scripts.

| Skill | Scripts | Description |
|-------|---------|-------------|
| **project** | 11 | Project lifecycle management |
| **recap** | 2 | Fresh start context summary |
| **schedule** | 2 | Calendar queries |
| **skill-creator** | 1 | Create new skills |
| **watch** | 3 | Learn from YouTube videos |

## Usage

### Basic Installation

```bash
# Interactive (prompts for confirmation)
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#main

# Install globally (user-level)
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#main -g
```

### Agent Mode (Non-Interactive)

For CI/CD, scripts, or AI agent automation:

```bash
# Install all skills globally, no prompts
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#main install -y -g

# Install specific skills to specific agent
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#main install -y -g -a claude-code -s rrr -s trace

# Uninstall all, no prompts
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#main uninstall -y -g
```

| Flag | Purpose |
|------|---------|
| `-y` | Skip all confirmation prompts |
| `-g` | Install to global (user) directories |
| `-a` | Target specific agent(s) |
| `-s` | Install specific skill(s) |

### List Available Skills

```bash
bunx oracle-skills --list
```

### Install Specific Skills

```bash
bunx oracle-skills --skill trace --skill rrr
```

### Target Specific Agents

```bash
bunx oracle-skills -a claude-code -a opencode
```

### List Supported Agents

```bash
bunx oracle-skills agents
```

### Show Installed Skills

```bash
# Local (project) skills
bunx oracle-skills list

# Global (user) skills
bunx oracle-skills list -g

# For specific agent
bunx oracle-skills list -a claude-code -g
```

### Uninstall Skills

```bash
# Remove all skills from detected agents
bunx oracle-skills uninstall -g -y

# Remove specific skill from specific agent
bunx oracle-skills uninstall -a claude-code -s rrr -g
```

## Supported Agents

| Agent | Project Path | Global Path |
|-------|--------------|-------------|
| OpenCode | `.opencode/skills/` | `~/.config/opencode/skills/` |
| Claude Code | `.claude/skills/` | `~/.claude/skills/` |
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

## Commands

| Command | Description |
|---------|-------------|
| `install` | Install Oracle skills (default) |
| `uninstall` | Remove installed skills |
| `list` | Show installed skills |
| `agents` | List supported agents |

## Options (for install/uninstall)

| Option | Description |
|--------|-------------|
| `-g, --global` | Use user directory instead of project |
| `-a, --agent <agents...>` | Target specific agents |
| `-s, --skill <skills...>` | Specific skills by name |
| `-l, --list` | List available skills (install only) |
| `-y, --yes` | Skip confirmation prompts |
| `-V, --version` | Show version |
| `-h, --help` | Show help |

## Philosophy

> "Multiple physicals, one soul"

Oracle skills follow the Oracle Philosophy - AI as external brain, not commander. These skills help AI assistants understand context, maintain session awareness, and build knowledge over time.

## Related

- [Soul Brews Plugin Marketplace](https://github.com/Soul-Brews-Studio/plugin-marketplace) - Source of Oracle skills
- [Agent Skills Specification](https://agentskills.io) - Cross-agent skill format
- [add-skill](https://github.com/vercel-labs/add-skill) - Universal skill installer by Vercel

## License

MIT
