# MQTT "Unknown action: undefined" Bug

**Date**: 2026-01-27 14:53
**Context**: Ralph Loop iteration 6 - testing MQTT extension
**Confidence**: High (reproduced multiple times)

## The Bug

When sending MQTT commands via TCP (port 1883), the extension logs:
```
❌ Unknown action: undefined
```

But the JSON is valid:
```json
{"action":"chat","text":"Hello","id":"test123"}
```

## Root Cause Analysis

1. **TCP vs WebSocket Transport**:
   - `mosquitto_pub` → TCP port 1883 → Mosquitto broker
   - Chrome extension → WebSocket port 9001 → Mosquitto broker
   - Both connect to same broker, but message encoding may differ

2. **Possible causes**:
   - Message encoding issue between TCP and WebSocket
   - JSON string vs Buffer handling
   - mosquitto_pub adds extra characters?

## Extension Code (background.js)

```javascript
client.on('message', (topic, message) => {
  try {
    const command = JSON.parse(message.toString());
    handleCommand(topic, command);
  } catch (e) {
    handleCommand(topic, message.toString());  // Falls back to string
  }
});
```

If `JSON.parse` fails silently or `command.action` is somehow undefined, the switch statement falls through to default "Unknown action".

## Hypothesis

The message might be arriving as a Buffer or with unexpected encoding. The `message.toString()` might not be producing clean JSON.

## Workaround

Use browser automation (claude-in-chrome) instead of MQTT commands. Browser automation works reliably.

## Next Steps

1. Debug: Add logging to see raw message bytes in extension
2. Test: Send command via WebSocket client directly to port 9001
3. Compare: What does `debug.html` send vs `mosquitto_pub`?

## Tags

`mqtt`, `bug`, `websocket`, `tcp`, `encoding`, `gemini-proxy`
