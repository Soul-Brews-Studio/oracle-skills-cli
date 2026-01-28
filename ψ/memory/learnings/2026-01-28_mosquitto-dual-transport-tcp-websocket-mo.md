---
title: ## Mosquitto: Dual Transport (TCP + WebSocket)
tags: [mosquitto, mqtt, websocket, transport, infrastructure]
created: 2026-01-28
source: Deep Research testing - 2026-01-28
---

# ## Mosquitto: Dual Transport (TCP + WebSocket)

## Mosquitto: Dual Transport (TCP + WebSocket)

Mosquitto supports multiple listeners simultaneously:

```
listener 1883 localhost   # TCP - for CLI tools, scripts
listener 9001             # WebSocket - for browsers
```

**Choose transport by context:**
- `mqtt://localhost:1883` → CLI, Node, Bun
- `ws://localhost:9001` → Browser extensions

Messages bridge automatically between transports. Same topics, same broker, different entry points.

---
*Added via Oracle Learn*
