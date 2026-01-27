---
name: ralph-loop
description: Start Ralph loop in current session
argument-hint: "PROMPT [--max-iterations N] [--completion-promise TEXT]"
allowed-tools: ["Bash", "Write"]
---

# Ralph Loop

> Source: anthropics/claude-plugins-official + Soul Brews session isolation

Start a self-referential development loop.

## Execute

Execute the setup script to initialize the Ralph loop:

```bash
"${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh" $ARGUMENTS
```

## State File Location

State files are stored with session ID for isolation:

```bash
# Session-isolated state file
RALPH_STATE_FILE="${CLAUDE_PLUGIN_ROOT}/state/${CLAUDE_SESSION_ID}.md"
if [ -f "$RALPH_STATE_FILE" ]; then
  PROMISE=$(grep '^completion_promise:' "$RALPH_STATE_FILE" | sed 's/completion_promise: *//' | sed 's/^"\(.*\)"$/\1/')
  if [ -n "$PROMISE" ] && [ "$PROMISE" != "null" ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  To complete: output <promise>$PROMISE</promise>"
    echo "═══════════════════════════════════════════════════════════"
  fi
fi
```

## Instructions

Work on the task. When you try to exit, the Ralph loop feeds the SAME PROMPT back. You'll see previous work in files and git history.

**CRITICAL**: If completion promise is set, ONLY output `<promise>TEXT</promise>` when TRUE. Do not lie to escape.

**Session Isolation**: Each Claude Code session has its own state file, so multiple sessions won't interfere with each other.
