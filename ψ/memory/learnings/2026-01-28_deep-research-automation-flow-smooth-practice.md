---
title: ## Deep Research Automation Flow (Smooth Practice)
tags: [deep-research, gemini, mqtt, automation, workflow, smooth-practice]
created: 2026-01-28
source: Deep Research session - 2026-01-28
---

# ## Deep Research Automation Flow (Smooth Practice)

## Deep Research Automation Flow (Smooth Practice)

### The Flow
```
/deep-research "topic"
    ↓
1. Create new Gemini tab (mosquitto_pub → create_tab)
    ↓
2. Select Deep Research mode (select_mode)
    ↓
3. Send research prompt (chat)
    ↓
4. Click "Start Research" (clickText)
    ↓
5. Gemini researches autonomously
```

### Key Commands

```bash
# Full automation
bun ~/.claude/skills/deep-research/scripts/deep-research.ts "your topic"

# Manual click if needed
mosquitto_pub -h localhost -p 1883 -t "claude/browser/command" \
  -m '{"action":"clickText","text":"Start Research","id":"click_123"}'

# Take screenshot to verify
screencapture -x /tmp/screenshot.png
```

### Transport Setup
- CLI scripts: `mqtt://localhost:1883` (TCP)
- Browser extension: `ws://localhost:9001` (WebSocket)
- Mosquitto bridges both automatically

### Requirements
- Mosquitto broker with dual listeners (1883 + 9001)
- Claude Browser Proxy extension v2.8.8+
- Bun runtime

---
*Added via Oracle Learn*
