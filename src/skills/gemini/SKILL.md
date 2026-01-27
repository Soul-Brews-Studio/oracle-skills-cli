---
name: gemini
description: Control Gemini via MQTT WebSocket. Use when user says "gemini", needs to send messages to Gemini, or control the Gemini browser tab.
---

# /gemini - MQTT WebSocket Control for Gemini

Direct control of Gemini browser tab via MQTT WebSocket connection.

## Usage

```bash
/gemini chat "Your message here"          # Send chat message
/gemini model fast|pro|think              # Switch model
/gemini get text|url|state|html           # Get data from Gemini
/gemini click "selector"                  # Click CSS selector
/gemini click-text "Button Text"          # Click by visible text
/gemini custom '{"action":"...", ...}'    # Send raw JSON command
```

## Requirements

1. **Gemini Proxy Extension** v2.7.1+ installed and connected (green badge)
2. **Mosquitto broker** running with WebSocket on port 9001
3. **Gemini tab open** in the browser

## Architecture

```
Claude Code → MQTT (ws://localhost:9001) → Mosquitto → Extension → Gemini
```

| Component | Port | Protocol |
|-----------|------|----------|
| Mosquitto TCP | 1883 | MQTT/TCP |
| Mosquitto WS | 9001 | MQTT/WebSocket |
| Debug Console | 8899 | HTTP (local dev) |

**IMPORTANT**: Commands only work via WebSocket (9001), NOT TCP (1883)!

## MQTT Topics

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `claude/browser/command` | → Extension | Send commands |
| `claude/browser/response` | ← Extension | Command results |
| `claude/browser/state` | ← Extension | Loading/tool state |
| `claude/browser/status` | ← Extension | Online/offline |

## Commands Reference

### Chat

```json
{
  "action": "chat",
  "text": "Your message to Gemini"
}
```

### Model Selection

```json
{
  "action": "select_model",
  "model": "thinking"  // "fast", "pro", or "thinking"
}
```

### Get Data

```json
{ "action": "get_url" }     // Returns { url, title }
{ "action": "get_text" }    // Returns page text
{ "action": "get_state" }   // Returns { loading, tool, responseCount }
{ "action": "get_html" }    // Returns HTML (truncated)
```

### Click Actions

```json
{
  "action": "click",
  "selector": "button.submit"
}

{
  "action": "click_text",
  "text": "Send"
}
```

## Workflow: Send Chat via Debug Console

Since MQTT commands via TCP don't work reliably, use browser automation on debug.html:

### Step 1: Start Debug Server

```bash
cd ~/Code/github.com/laris-co/claude-browser-proxy
bunx serve -p 8899 &
```

### Step 2: Open Debug Console

```javascript
// Create tab and navigate
tabs_create_mcp()
navigate({ url: "http://localhost:8899/debug.html", tabId: TAB_ID })
wait(2)
```

### Step 3: Send Chat

```javascript
// Find chat input
find({ query: "Type message to send to Gemini input", tabId: TAB_ID })
// → ref_166

// Click, type, send
computer({ action: "left_click", ref: "ref_166", tabId: TAB_ID })
computer({ action: "type", text: "Your message", tabId: TAB_ID })

// Find and click Send Chat button
find({ query: "Send Chat button", tabId: TAB_ID })
// → ref_167
computer({ action: "left_click", ref: "ref_167", tabId: TAB_ID })
```

### Step 4: Monitor Response

Watch the RESPONSES panel or check state:

```bash
mosquitto_sub -t "claude/browser/state" -C 1 -W 5
# {"loading":false,"responseCount":2,"tool":"youtube"}
```

## State Polling

Monitor Gemini state (works via TCP):

```bash
# Check if extension is online
mosquitto_sub -t "claude/browser/status" -C 1 -W 3

# Poll loading state
mosquitto_sub -t "claude/browser/state" -C 1 -W 3
```

State fields:
- `loading`: true while Gemini is generating
- `responseCount`: Number of responses in conversation
- `tool`: Detected tool ("youtube", "search", "code", null)

## Integration with /watch

The `/watch` skill can use `/gemini` for Gemini control:

```bash
# /watch flow
1. Get video metadata (yt-dlp)
2. /gemini model think          # Use thinking model
3. /gemini chat "Transcribe: [URL]"
4. Poll state until loading=false
5. /gemini get text             # Extract response
6. Save to ψ/memory/learnings/
```

## Debug Console URL

For manual testing: http://localhost:8899/debug.html

Features:
- Real-time MQTT traffic view
- Quick action buttons
- Custom JSON commands
- Model switching

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Unknown action: undefined" | Use WebSocket (debug.html), not TCP |
| Extension offline | Check badge, reconnect |
| No Gemini tab | Open gemini.google.com first |
| Commands ignored | Gemini tab must be in same window |

## Extension Source

`github.com/laris-co/claude-browser-proxy`
