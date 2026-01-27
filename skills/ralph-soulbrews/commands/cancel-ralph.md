---
name: cancel-ralph
description: Cancel active Ralph Loop
allowed-tools: ["Bash", "Read"]
---

# Cancel Ralph

> Source: anthropics/claude-plugins-official + Soul Brews session isolation

To cancel the Ralph loop:

1. Check if state file exists for this session:

```bash
RALPH_STATE_FILE="${CLAUDE_PLUGIN_ROOT}/state/${CLAUDE_SESSION_ID}.md"
test -f "$RALPH_STATE_FILE" && echo "EXISTS" || echo "NOT_FOUND"
```

2. **If NOT_FOUND**: Say "No active Ralph loop found for this session."

3. **If EXISTS**:
   - Read the state file to get current iteration from the `iteration:` field
   - Remove the file:
   ```bash
   rm "${CLAUDE_PLUGIN_ROOT}/state/${CLAUDE_SESSION_ID}.md"
   ```
   - Report: "Cancelled Ralph loop (was at iteration N)" where N is the iteration value
