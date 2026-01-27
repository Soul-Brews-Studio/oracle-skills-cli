# Gemini Proxy Debug Console - Full Documentation

**Date**: 2026-01-27 15:02
**Source**: http://localhost:8899/debug (served from claude-browser-proxy)
**Confidence**: High (verified working)

## Key Discovery

The Debug Console uses **MQTT over WebSocket** (port 9001), which works for sending commands. TCP (port 1883) does NOT work for commands.

## Architecture

```
debug.html → mqtt.js → ws://localhost:9001 → Mosquitto → Extension → Gemini
```

## MQTT Configuration

```javascript
const MQTT_URL = 'ws://localhost:9001';
const TOPICS = {
  command: 'claude/browser/command',
  response: 'claude/browser/response',
  page: 'claude/browser/page',
  status: 'claude/browser/status',
  state: 'claude/browser/state'
};
```

## Available Actions

| Action | Parameters | Description |
|--------|------------|-------------|
| `chat` | `text` | Send message to Gemini |
| `select_model` | `model: fast\|pro\|thinking` | Switch Gemini model |
| `click` | `selector` | Click CSS selector |
| `clickText` | `text` | Click element by visible text |
| `get_url` | - | Get current page URL & title |
| `get_text` | - | Get page text content |
| `get_state` | - | Get loading/responseCount/tool |
| `get_html` | - | Get page HTML (truncated) |

## Command Format

```javascript
{
  "action": "chat",
  "text": "Hello Gemini",
  "id": "debug_1"  // Auto-generated
}
```

## State Response Format

```json
{
  "loading": false,
  "responseCount": 1,
  "timestamp": 1769500815490,
  "tool": "youtube"  // or null, "search", "code"
}
```

## Debug Console Features

1. **Quick Actions** - Model switcher buttons (Fast/Pro/Think)
2. **Get Buttons** - URL, Text, State, HTML
3. **Chat Input** - Send messages directly
4. **Click Input** - CSS selector or text
5. **Custom JSON** - Raw command editor
6. **Live Logs** - Commands sent / Responses received

## How to Start

```bash
cd ~/Code/github.com/laris-co/claude-browser-proxy
bunx serve -p 8899
# Open http://localhost:8899/debug
```

## Why This Works (TCP Doesn't)

The extension uses `mqtt.js` library with WebSocket transport:
```javascript
client = mqtt.connect('ws://localhost:9001', { ... });
```

When using `mosquitto_pub` (TCP), the message arrives but may have encoding issues or the extension's WebSocket-only MQTT client doesn't receive TCP messages directly.

## Integration Pattern for Claude Code

Instead of trying to use `mosquitto_pub`, Claude Code should:
1. Open debug.html via browser automation
2. Use refs to interact with the UI
3. Type in chat input, click Send Chat
4. Monitor responses panel

Or better: Enhance extension to accept commands via other channels.

## Tags

`mqtt`, `websocket`, `debug-console`, `gemini-proxy`, `chrome-extension`
