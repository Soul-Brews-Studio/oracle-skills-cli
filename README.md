# oracle-skills

Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents with a single command.

## Quick Start

```bash
npx oracle-skills
```

## What are Oracle Skills?

Oracle skills are reusable instruction sets for AI coding agents, built by [Soul Brews Studio](https://github.com/Soul-Brews-Studio). They extend your agent's capabilities with specialized workflows:

| Skill | Description |
|-------|-------------|
| **trace** | Find projects across git history, repos, docs |
| **recap** | Fresh start context summary |
| **rrr** | Session retrospective with AI diary |
| **learn** | Explore codebases with parallel agents |
| **project** | Project lifecycle management |
| **forward** | Session handoff |
| **context-finder** | Fast codebase search |
| **feel** | Log emotions |
| **fyi** | Log information for reference |
| **standup** | Daily standup check |
| **schedule** | Calendar queries |
| **watch** | Learn from YouTube videos |
| **skill-creator** | Create new skills |
| **where-we-are** | Session awareness |

## Usage

### Basic Installation

```bash
# Auto-detect installed agents and install
npx oracle-skills

# Install globally (user-level)
npx oracle-skills -g

# Non-interactive mode
npx oracle-skills -g -y
```

### List Available Skills

```bash
npx oracle-skills --list
```

### Install Specific Skills

```bash
npx oracle-skills --skill trace --skill rrr
```

### Target Specific Agents

```bash
npx oracle-skills -a claude-code -a opencode
```

### List Supported Agents

```bash
npx oracle-skills agents
```

## Supported Agents

| Agent | Project Path | Global Path |
|-------|--------------|-------------|
| OpenCode | `.opencode/skill/` | `~/.config/opencode/skill/` |
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

## Options

| Option | Description |
|--------|-------------|
| `-g, --global` | Install to user directory instead of project |
| `-a, --agent <agents...>` | Target specific agents |
| `-s, --skill <skills...>` | Install specific skills by name |
| `-l, --list` | List available skills without installing |
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
