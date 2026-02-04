# oracle-skills

[![CI](https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions/workflows/ci.yml/badge.svg)](https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/tag/Soul-Brews-Studio/oracle-skills-cli?label=version)](https://github.com/Soul-Brews-Studio/oracle-skills-cli/releases)

Install Oracle skills to Claude Code, OpenCode, Cursor, and 11+ AI coding agents.

> **Note**: This repo supersedes the following archived repositories:
> - ~~[oracle-philosophy](https://github.com/Soul-Brews-Studio/oracle-philosophy)~~ → Now `/philosophy` skill
> - ~~[oracle-starter-kit](https://github.com/laris-co/oracle-starter-kit)~~ → Now `curl | bash` installer
>
> Use this repo as the **single entry point** for Oracle installation.

## Quick Install (Claude Code)

**Step 0:** Install Claude Code (if not installed)

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Step 1:** Tell Claude to run, then restart and `/awaken`:

```bash
# Install oracle-skills
curl -fsSL https://raw.githubusercontent.com/Soul-Brews-Studio/oracle-skills-cli/main/install.sh | bash

# Setup permissions (run in your Oracle repo after restart)
mkdir -p .claude && cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(gh:*)", "Bash(ghq:*)", "Bash(git:*)",
      "Bash(bun:*)", "Bash(bunx:*)", "Bash(mkdir:*)", "Bash(ln:*)",
      "Bash(rg:*)", "Bash(date:*)", "Bash(ls:*)", "Bash(tree:*)",
      "Bash(curl:*)", "Bash(du:*)", "Bash(wc:*)",
      "Bash(*ψ/*)", "Bash(*psi/*)",
      "Skill(learn)", "Skill(trace)", "Skill(awaken)",
      "Skill(rrr)", "Skill(recap)", "Skill(project)"
    ]
  }
}
EOF
```

Then restart Claude Code and run:

```
/awaken
```

---

## Install — FOR AI LLM AGENTS

### One Command

```bash
curl -fsSL https://raw.githubusercontent.com/Soul-Brews-Studio/oracle-skills-cli/main/install.sh | bash
```

<details>
<summary>📜 View install.sh (safe & transparent)</summary>

```bash
#!/bin/bash
# Oracle Skills Installer - checks and installs: bun, ghq, oracle-skills

# 1. Check & install bun
which bun || curl -fsSL https://bun.sh/install | bash

# 2. Check & install ghq
which ghq || brew install ghq  # or: go install github.com/x-motemen/ghq@latest

# 3. Install oracle-skills
~/.bun/bin/bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36 install -g -y

# Permissions are set up during /awaken in your Oracle repo
echo "✨ Done! Run: claude . then /awaken"
```

</details>

---

### Manual Steps

```
# Requirements: bash/zsh (macOS/Linux) or Git Bash (Windows)

# 1. Check & install bun
which bun || curl -fsSL https://bun.sh/install | bash

# 2. Check & install ghq (for /learn and /trace)
which ghq || brew install ghq  # macOS
# Linux/Windows: go install github.com/x-motemen/ghq@latest

# 3. Install oracle-skills
~/.bun/bin/bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36 \
  install -g -y

# 4. Setup permissions in your Oracle repo (run BEFORE claude .)
# cd /path/to/your-oracle-repo
mkdir -p .claude && cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(gh:*)", "Bash(ghq:*)", "Bash(git:*)",
      "Bash(bun:*)", "Bash(bunx:*)", "Bash(mkdir:*)", "Bash(ln:*)",
      "Bash(rg:*)", "Bash(date:*)", "Bash(ls:*)", "Bash(tree:*)",
      "Bash(curl:*)", "Bash(du:*)", "Bash(wc:*)",
      "Bash(bash)", "Bash(source ~/.bashrc)",
      "Bash(export PATH=\"$HOME/.bun/bin:$PATH\")",
      "Bash(*ψ/*)", "Bash(*psi/*)",
      "Skill(learn)", "Skill(trace)", "Skill(awaken)",
      "Skill(rrr)", "Skill(recap)", "Skill(project)"
    ]
  }
}
EOF

# 5. Create alias (add to ~/.bashrc or ~/.zshrc)
alias oracle-skills='~/.bun/bin/bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36'

# 6. Usage (with alias)
oracle-skills install -g -y
oracle-skills list -g
oracle-skills uninstall -g -y

# Or full command
~/.bun/bin/bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36 install -g -y
~/.bun/bin/bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36 list -g
~/.bun/bin/bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli#v1.5.36 uninstall -g -y

# Flags
# -g  Global (user) directory
# -y  Skip prompts
# -a  Target agent(s)
# -s  Specific skill(s)
```

Then run `claude "/awaken"` to create a new Oracle ([example](https://github.com/Soul-Brews-Studio/phukhao-oracle)).

## Skills

Oracle skills extend your agent's capabilities with specialized workflows:

| # | Skill | Type | Description |
|---|-------|------|-------------|
| 1 | **trace** | skill + subagent | Find projects across git history, repos |
| - |  |  |  |
| 2 | **deep-research** | skill + code | Deep Research via Gemini |
| 3 | **gemini** | skill + code | Control Gemini via MQTT WebSocket |
| 4 | **physical** | skill + code | Physical location awareness from FindMy |
| 5 | **project** | skill + code | Clone and track external repos |
| 6 | **recap** | skill + code | Fresh-start orientation—adaptive synthesis |
| 7 | **schedule** | skill + code | Query schedule.md using DuckDB markdown |
| 8 | **skill-creator** | skill + code | Create new skills with Oracle philosophy |
| 9 | **speak** | skill + code | Text-to-speech using edge-tts or macOS say |
| 10 | **watch** | skill + code | Learn from YouTube videos |
| - |  |  |  |
| 11 | **awaken** | skill | Guided Oracle birth |
| 12 | **birth** | skill | Prepare birth props for a new Oracle repo |
| 13 | **feel** | skill | Log emotions with optional structure |
| 14 | **forward** | skill | Create handoff + enter plan mode for next |
| 15 | **fyi** | skill | Log information for future reference |
| 16 | **learn** | skill | Explore a codebase |
| 17 | **merged** | skill | Post-Merge Cleanup |
| 18 | **oracle-family-scan** | skill | oracle-family-scan skill |
| 19 | **oracle-soul-sync-calibrate-update** | skill | Sync Oracle instruments with the family |
| 20 | **philosophy** | skill | Display Oracle philosophy principles |
| 21 | **ralph-loop-soulbrews** | skill | Self-referential AI loops |
| 22 | **retrospective** | skill | Create session retrospective with AI diary |
| 23 | **rrr** | skill | Create session retrospective with AI diary |
| 24 | **standup** | skill | Daily standup check |
| 25 | **where-we-are** | skill | Session awareness - what we're doing now |
| 26 | **who-we-are** | skill | Know ourselves |
| 27 | **worktree** | skill | Git worktree for parallel work |

*Generated: 2026-02-04 06:21:41 UTC*

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

- [oracle-v2](https://github.com/Soul-Brews-Studio/oracle-v2) - MCP Memory Layer (Oracle brain)
- [Soul Brews Plugin Marketplace](https://github.com/Soul-Brews-Studio/plugin-marketplace) - Source of Oracle skills
- [Agent Skills Specification](https://agentskills.io) - Cross-agent skill format
- [add-skill](https://github.com/vercel-labs/add-skill) - Universal skill installer by Vercel

## Superseded Repositories

The following repositories have been **archived** and superseded by this CLI:

| Old Repo | Status | Replacement |
|----------|--------|-------------|
| [oracle-philosophy](https://github.com/Soul-Brews-Studio/oracle-philosophy) | 🗄️ Archived | `/philosophy` skill |
| [oracle-starter-kit](https://github.com/laris-co/oracle-starter-kit) | 🗄️ Archived | `curl \| bash` installer |

## License

MIT
