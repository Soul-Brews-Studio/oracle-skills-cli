# oracle-skills

Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents with a single command.

## Quick Start

```bash
# From npm (after publish)
bunx oracle-skills

# From GitHub (always latest)
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli
```

> **Note**: Requires [Bun](https://bun.sh). Install with `curl -fsSL https://bun.sh/install | bash`

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
# Short alias (requires npm publish)
bunx oracle-skills

# From GitHub directly (always works)
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli

# Install globally (user-level)
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli -g

# Non-interactive mode
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli -g -y
```

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
