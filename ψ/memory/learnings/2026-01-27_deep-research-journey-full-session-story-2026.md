---
title: **Deep Research Journey: Full Session Story (2026-01-27)**
tags: [deep-research, gemini, mqtt, dom-manipulation, coordinate-clicking, skill-installation, oracle-skills-cli, chrome-extension, session-story]
created: 2026-01-27
source: Oracle Learn
---

# **Deep Research Journey: Full Session Story (2026-01-27)**

**Deep Research Journey: Full Session Story (2026-01-27)**

## The Challenge
Enable Gemini's Deep Research mode from Claude Code via MQTT. Simple button click became complex DOM manipulation puzzle.

## What Failed
1. Direct `.click()` on text element
2. Walking up DOM tree to find parent
3. mousedown/mouseup events
4. Clicking parent containers

## What Worked: Coordinate-Based Clicking (v2.9.39)
```javascript
const rect = textEl.getBoundingClientRect();
const x = rect.left + rect.width / 2;
const y = rect.top + rect.height / 2;
const clickTarget = document.elementFromPoint(x, y);
clickTarget.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: x, clientY: y }));
```

**Why:** Modern frameworks (Angular Material) have invisible overlays. `elementFromPoint()` finds the *actual* clickable element.

## Skill Installation Lesson
WRONG: `cp -r skill ~/.claude/skills/` → shows as "(user)"
RIGHT: `bun run src/cli/index.ts install -y -g --skill name` → shows as "v1.5.39 G-SKLL |"

The installer adds metadata and triggers auto-reload. Manual copy bypasses this.

## Architecture
```
/gemini (hub) → chat, research, model, canvas, transcribe
/deep-research → alias to /gemini research
/watch → alias to /gemini transcribe
```

## Files
- claude-browser-proxy: content.js (🔬 button), background.js (select_mode action)
- oracle-skills-cli: deep-research skill, gemini updates, CLAUDE.md docs

Blog: docs/blog/2026-01-27_deep-research-journey.md

---
*Added via Oracle Learn*
