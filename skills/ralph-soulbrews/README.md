# Ralph Loop - Soul Brews Edition

Self-referential AI development loops with **session isolation**.

## Source Attribution

```
Base:     anthropics/claude-plugins-official/plugins/ralph-loop
Extended: Soul-Brews-Studio/ralph-local (PR #15853)
Combined: Soul-Brews-Studio/oracle-skills-cli/skills/ralph-soulbrews
```

## What's Different from Upstream?

| Feature | Anthropic | Soul Brews |
|---------|-----------|------------|
| State file | `.claude/ralph-loop.local.md` | `state/${SESSION_ID}.md` |
| Session isolation | None | Full |
| Multi-terminal safe | No | Yes |
| SessionStart hook | No | Yes |
| Updates via | Manual | `/soul-sync` (Oracle Skills) |

## Quick Start

```bash
/ralph-loop "Build a REST API" --completion-promise "DONE" --max-iterations 50
```

## Commands

| Command | Description |
|---------|-------------|
| `/ralph-loop` | Start self-referential loop |
| `/cancel-ralph` | Cancel active loop |
| `/help` | Show documentation |

## How It Works

1. `/ralph-loop` creates state file with session ID
2. You work on the task
3. When you try to exit, Stop hook intercepts
4. Same prompt fed back (you see previous work in files)
5. Loop until `<promise>DONE</promise>` or max iterations

## Session Isolation

Each Claude Code session has its own state file:

```
state/
├── abc123-session-1.md
├── def456-session-2.md
└── ...
```

No more interference between terminals!

## Philosophy

> "Ralph is a Bash loop" — Geoffrey Huntley

- Iteration > Perfection
- Failures are data
- Persistence wins

## Learn More

- Original technique: https://ghuntley.com/ralph/
- Upstream: https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop
- Session isolation PR: https://github.com/anthropics/claude-code/pull/15853
