# MQTT Topic Mismatch - The Silent Killer

**Date**: 2026-01-27 15:43
**Context**: claude-browser-proxy MQTT integration
**Confidence**: High (verified fix)

## Key Learning

When MQTT commands timeout silently, **always verify topic names from the source code**. A single character difference in topic strings means your messages go to `/dev/null`.

## The Bug

```javascript
// Debug console / old scripts:
const TOPIC_CMD = 'claude-browser-proxy/command';

// Extension (background.js):
const TOPICS = {
  command: 'claude/browser/command',  // ← DIFFERENT!
  response: 'claude/browser/response',
  ...
};
```

Scripts were publishing to `claude-browser-proxy/command` while extension was subscribed to `claude/browser/command`. Commands never arrived.

## How to Detect

1. **Commands timeout with no error** - this is the symptom
2. **Connection works** - MQTT connects, subscribes succeed
3. **No messages in either direction** - producer and consumer aren't talking
4. **Source code reveals truth** - grep for `TOPICS` or `subscribe` in extension code

## The Fix

```javascript
// Correct topics (from background.js)
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';
const TOPIC_STATE = 'claude/browser/state';
const TOPIC_STATUS = 'claude/browser/status';
```

## Why This Matters

MQTT doesn't validate topics. If you subscribe to `foo/bar` and publish to `foo/baz`, there's no error - messages just disappear. Unlike HTTP where a wrong URL returns 404, MQTT silently drops mismatched messages.

## Prevention Checklist

1. **Single source of truth**: Define topics in one place, import everywhere
2. **Log topic names**: Log actual topic on both publish and receive
3. **Use topic wildcard for debugging**: Subscribe to `claude/#` to see all messages
4. **Integration test**: Verify round-trip before building features

## Tags

`mqtt`, `debugging`, `silent-failure`, `claude-browser-proxy`, `topic-mismatch`
