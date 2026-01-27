# MQTT Transport Architecture - Gemini Proxy Extension

**Date**: 2026-01-27
**Context**: Ralph Loop testing of /watch skill
**Confidence**: High (verified through testing)

## Key Learning

The Gemini Proxy Chrome extension has TWO connection methods for MQTT, but they serve different purposes:

| Port | Protocol | Purpose | Commands Work? |
|------|----------|---------|----------------|
| 1883 | TCP/MQTT | CLI tools (mosquitto_pub/sub) | ❌ State only |
| 9001 | WebSocket | Browser (debug.html, extension) | ✓ Full control |

**Critical insight**: Commands like `chat`, `type`, `click` only work via WebSocket (port 9001), NOT via TCP (port 1883).

## The Pattern

**What works via TCP (mosquitto_pub):**
```bash
# Status check - works
mosquitto_sub -t "claude/browser/status" -C 1 -W 3

# State polling - works
mosquitto_sub -t "claude/browser/state" -C 1 -W 3
```

**What DOESN'T work via TCP:**
```bash
# Commands - DON'T reach extension
mosquitto_pub -t "claude/browser/command" -m '{"action":"chat","text":"Hello"}'
# No response, no effect
```

**What works via WebSocket (debug.html or browser automation):**
- All commands: chat, type, click, get_response, etc.
- State monitoring
- Full bidirectional control

## Why This Matters

When implementing /watch skill or any MQTT-based automation:

1. **For sending commands**: Use browser automation (claude-in-chrome) or WebSocket client
2. **For monitoring state**: TCP works fine (mosquitto_sub)
3. **Don't mix transports**: Commands via TCP will silently fail

## Recommended Approach

```
Hybrid pattern:
├── Browser automation → Input (type, click, navigate)
├── MQTT TCP → Monitor (state polling, responseCount)
└── get_page_text → Extract Gemini response
```

## Tags

`mqtt`, `gemini-proxy`, `transport`, `websocket`, `tcp`, `chrome-extension`
