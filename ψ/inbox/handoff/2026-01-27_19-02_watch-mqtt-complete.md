# Handoff: /watch MQTT Smooth Flow Complete

**Date**: 2026-01-27 19:02
**Session Duration**: ~79 minutes
**Repo**: oracle-skills-cli + claude-browser-proxy

---

## What We Built

### Complete /watch Pipeline

```
YouTube URL → Metadata → New Gemini Tab → JSON Prompt → Transcription → Google Docs
```

**Key script**: `transcribe.ts`
- Gets video metadata (title, channel, duration)
- Creates new Gemini tab via MQTT
- Captures tabId from response
- Sends prompt with JSON metadata
- Can save to Google Docs via click action

### Critical Fixes

| Problem | Solution |
|---------|----------|
| tabId always "unknown" | Subscribe BEFORE publish |
| Stale cached responses | Remove ALL retain flags |
| Click not working | Use `.claude-response-actions button:first-child` selector |

---

## 🔮 FUTURE: Beyond Transcribe

**User insight**: Gemini has MORE modes than just chat!

### Gemini Modes to Support

| Mode | Use Case | How to Activate |
|------|----------|-----------------|
| **Chat** | Quick transcription | Current implementation |
| **Deep Research** | Complex topics, multi-source | Click "Deep Research" before prompt |
| **Canvas** | Collaborative editing | Click "Canvas" or use canvas URL |
| **Thinking** | Step-by-step reasoning | Select 💭 model |

### Proposed Enhancement: `--mode` flag

```bash
bun transcribe.ts --mode=research "https://youtube.com/..."
bun transcribe.ts --mode=canvas "https://youtube.com/..."
bun transcribe.ts --mode=thinking "https://youtube.com/..."
```

### Implementation Ideas

1. **Deep Research Mode**:
   ```javascript
   // Click "Deep Research" button before sending prompt
   await click({ selector: '[data-mode="research"]' })
   await chat({ text: prompt, tabId })
   ```

2. **Canvas Mode**:
   ```javascript
   // Navigate to canvas URL instead
   await create_tab({ url: 'https://gemini.google.com/canvas' })
   ```

3. **Model Selection**:
   ```javascript
   // Already have select_model action
   await select_model({ model: 'thinking' })
   await chat({ text: prompt, tabId })
   ```

---

## Pending Tasks

### Immediate
- [ ] Push claude-browser-proxy to remote
- [ ] Test with more video types
- [ ] Add `--save` flag for auto-export to Docs

### Future (Modes)
- [ ] Research Gemini Deep Research DOM structure
- [ ] Add `--mode=research` to transcribe.ts
- [ ] Add `--mode=canvas` for collaborative mode
- [ ] Document mode selection in SKILL.md

### Extension Improvements
- [ ] Add `deep_research` action
- [ ] Add `canvas_mode` action
- [ ] Better error logging in background.js

---

## Key Files

**oracle-skills-cli:**
```
src/skills/watch/SKILL.md              # Updated workflow
src/skills/watch/scripts/transcribe.ts # Main script
ψ/memory/learnings/mqtt-subscribe-*.md # Key pattern
ψ/inbox/drafts/smooth-flow-*.md        # Blog draft
```

**claude-browser-proxy:**
```
background.js  # MQTT handler, create_tab, chat, click
content.js     # Injected buttons 💾🔊✓, model selectors
manifest.json  # v2.9.29
```

---

## Key Learnings (for next session)

1. **Subscribe before publish** - MQTT responses are transient
2. **No retain flags** - Don't cache anything
3. **tabId is essential** - Always capture and pass it
4. **Click by selector** - `.claude-response-actions button:first-child`
5. **Gemini has modes** - Not just chat, explore Deep Research & Canvas

---

## Session Energy

High productivity. Went from broken tabId to full working pipeline. User feedback was instant and clear. The insight about Gemini modes (Deep Research, Canvas) opens new possibilities.

---

## Quick Resume

```bash
# Test transcribe
bun ~/.claude/skills/watch/scripts/transcribe.ts "https://youtube.com/..."

# Save to docs (after transcription)
mosquitto_pub -h localhost -p 1883 -t "claude/browser/command" \
  -m '{"action":"click","tabId":TAB_ID,"selector":".claude-response-actions button:first-child"}'
```

---

**Next session priority**: Explore Gemini Deep Research mode for complex video analysis!
