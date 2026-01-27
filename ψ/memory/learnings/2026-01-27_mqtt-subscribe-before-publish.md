# MQTT: Subscribe Before Publish

**Date**: 2026-01-27
**Context**: /watch skill tabId capture
**Confidence**: High

## Key Learning

When expecting a response to an MQTT command, **subscribe to the response topic BEFORE publishing the command**. MQTT messages are transient - if you're not listening when the message arrives, you miss it.

## The Problem

```typescript
// BROKEN: Publish then subscribe
await $`mosquitto_pub -t cmd -m '{"action":"create_tab"}'`
const response = await $`mosquitto_sub -t response -C 1`  // Too late!
// Response already published and gone
```

## The Solution

```typescript
// WORKING: Subscribe first, then publish
const subProc = Bun.spawn(["mosquitto_sub", "-t", "response", "-C", "1"])
await Bun.sleep(200)  // Ensure subscriber is ready
await $`mosquitto_pub -t cmd -m '{"action":"create_tab"}'`
const response = await subProc.stdout  // Got it!
```

## Why This Matters

- MQTT responses are **not retained** by default
- Publisher doesn't wait for subscribers
- Network latency means subscribe must start BEFORE publish
- 200ms delay ensures subscriber is ready

## Also Learned: No Retain

Don't use `-r` retain flag for responses:
- Cached responses pollute future reads
- You get stale data instead of fresh responses
- Commands: no retain
- Responses: no retain
- Status only: retain OK (for "online/offline")

## Pattern Summary

```
1. Start subscriber (background process)
2. Wait 100-200ms
3. Publish command
4. Read from subscriber stdout
5. Parse response
```

## Tags

`mqtt`, `timing`, `async`, `debugging`, `race-condition`
