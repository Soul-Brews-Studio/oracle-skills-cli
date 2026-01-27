---
title: **MQTT Subscribe-Before-Publish Pattern for CLI Scripts**
tags: [mqtt, subscribe-before-publish, cli-scripts, bun, mosquitto, gemini-proxy, async-pattern]
created: 2026-01-27
source: Oracle Learn
---

# **MQTT Subscribe-Before-Publish Pattern for CLI Scripts**

**MQTT Subscribe-Before-Publish Pattern for CLI Scripts**

## The Problem
When sending MQTT commands from CLI and trying to capture responses:
```bash
mosquitto_pub ... && mosquitto_sub ...  # WRONG - response already gone!
```

Response arrives BEFORE subscribe starts → missed!

## The Solution
Subscribe FIRST, then publish:
```typescript
// 1. Start subscriber in background
const subProc = Bun.spawn([
  "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
  "-t", MQTT_TOPIC_RSP, "-C", "1", "-W", "5"  // -C 1 = one message, -W 5 = 5s timeout
], { stdout: "pipe" });

// 2. Wait for subscription to be ready
await Bun.sleep(200);

// 3. NOW publish command
const pubProc = Bun.spawn([
  "mosquitto_pub", "-h", MQTT_HOST, "-p", MQTT_PORT,
  "-t", MQTT_TOPIC_CMD, "-m", cmd
]);
await pubProc.exited;

// 4. Read response from subscriber
const output = await new Response(subProc.stdout).text();
```

## Key Flags
- `-C 1` = Exit after receiving 1 message
- `-W 5` = Timeout after 5 seconds
- `stdout: "pipe"` = Capture output in Bun

## Scripts Using This Pattern
- `list-tabs.ts` - List Gemini tabs
- `status.ts` - Extension status dashboard
- `deep-research.ts` - Full automation flow

## Debug Console Comparison
The browser debug console uses WebSocket subscription that stays open.
CLI scripts need this subscribe-first pattern to catch one-shot responses.

---
*Added via Oracle Learn*
