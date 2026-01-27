# Deep Research Journey: From Button Click to Skill Creation

**Date:** 2026-01-27
**Session:** Claude Browser Proxy + Oracle Skills CLI

---

## The Goal

Enable Gemini's Deep Research mode from Claude Code via MQTT automation. What started as "add a button" became a deep dive into DOM manipulation, skill architecture, and installation patterns.

## Part 1: The 🔬 Button

### Initial Approach (Failed)

Added a Deep Research button next to the model selectors (⚡💭🧠):

```javascript
const modes = [
  { id: 'research', label: '🔬', title: 'Deep Research', text: 'Deep Research' }
];
```

**Problem:** Clicking the button opened the Tools dropdown, but couldn't click the "Deep Research" menu item.

### Attempts That Failed

1. **Direct text matching** - Found the text but click didn't register
2. **Walking up DOM tree** - Found parent elements but still no click
3. **mousedown/mouseup events** - Dispatched events but menu item didn't respond
4. **Clicking parent containers** - Same result

### The Solution: Coordinate-Based Clicking (v2.9.39)

```javascript
// Find the text element
const textEl = /* element with "Deep Research" text */;

// Get its screen position
const rect = textEl.getBoundingClientRect();
const x = rect.left + rect.width / 2;
const y = rect.top + rect.height / 2;

// Find what's actually at those coordinates
const clickTarget = document.elementFromPoint(x, y);

// Fire full mouse event sequence WITH coordinates
const eventInit = { bubbles: true, cancelable: true, clientX: x, clientY: y };
clickTarget.dispatchEvent(new MouseEvent('mousedown', eventInit));
clickTarget.dispatchEvent(new MouseEvent('mouseup', eventInit));
clickTarget.dispatchEvent(new MouseEvent('click', eventInit));
```

**Why it worked:** Modern web frameworks (like Angular Material used by Gemini) often have invisible overlay elements or complex event delegation. Using `elementFromPoint()` finds the *actual* clickable element at those coordinates, not just the text node.

## Part 2: The Full Automation Flow

With the button working, we created a complete Deep Research workflow:

```
1. create_tab     → New Gemini tab
2. select_mode    → Click Tools → Deep Research
3. chat           → Send research prompt
4. clickText      → "Start research" button
```

### The Script

```typescript
// deep-research.ts
const ts = () => Date.now();

// Step 1: New tab
await mqttPub({ action: "create_tab", url: "https://gemini.google.com/app", ts: ts() });
await Bun.sleep(4000);

// Step 2: Select Deep Research
await mqttPub({ action: "select_mode", mode: "Deep Research", ts: ts() });
await Bun.sleep(2000);

// Step 3: Send prompt
await mqttPub({ action: "chat", text: topic, ts: ts() });
await Bun.sleep(3000);

// Step 4: Start research
await mqttPub({ action: "clickText", text: "Start research", ts: ts() });
```

## Part 3: Creating the Skill

### First Attempt (Wrong)

Created `/deep-research` skill and manually copied to `~/.claude/skills/`:

```bash
cp -r src/skills/deep-research ~/.claude/skills/  # WRONG!
```

**Result:** Skill showed as `(user)` without version prefix:
```
/deep-research    Deep Research via Gemini...
```

### The Right Way

Use the oracle-skills-cli installer:

```bash
bun run src/cli/index.ts install -y -g --skill deep-research
```

**Result:** Proper format with auto-reload:
```
/deep-research    v1.5.39 G-SKLL | Deep Research via Gemini...
```

### What the Installer Does

1. Copies skill to `~/.claude/skills/`
2. Injects `installer: oracle-skills-cli v{version}` into frontmatter
3. Prepends `v{version} G-SKLL |` to description
4. Updates `.oracle-skills.json` manifest
5. **Auto-reloads** in Claude Code (no restart needed!)

## Part 4: Architecture Decision

### Skill Hierarchy

```
/gemini                    # Main hub for all Gemini control
├── chat "message"
├── new "message"
├── transcribe <url>
├── research "topic"       # Deep Research
├── model fast|thinking|pro
└── canvas

/deep-research "topic"     # Alias → /gemini research
/watch <youtube-url>       # Alias → /gemini transcribe
```

Skills can be:
- **Standalone** (full functionality)
- **Aliases** (point to another skill's subcommand)

Frontmatter supports `alias:` field:
```yaml
---
name: deep-research
description: Deep Research via Gemini...
alias: /gemini research
---
```

## Key Learnings

### 1. DOM Clicking in Modern Frameworks

Don't trust the visible element - use `elementFromPoint()` to find what's actually clickable at those coordinates.

### 2. Skill Installation

| Method | Result |
|--------|--------|
| Manual `cp` | "(user)" format, no auto-reload |
| Installer | "v1.5.39 G-SKLL" format, auto-reload |

### 3. MQTT Timing

Subscribe BEFORE publish to capture responses. Remove retain flags to avoid stale message pollution.

### 4. Skill Frontmatter

Every SKILL.md needs:
```yaml
---
name: skill-name
description: Short description for skill list
---
```

Without frontmatter, skill won't compile properly.

## Version History

| Version | Change |
|---------|--------|
| 2.9.34 | Added stale message protection |
| 2.9.35 | First select_mode attempt |
| 2.9.36-38 | DOM walking attempts |
| 2.9.39 | Coordinate-based clicking (working!) |

## Files Modified

**claude-browser-proxy:**
- `content.js` - Added 🔬 button
- `background.js` - Added `select_mode` action with coordinate clicking

**oracle-skills-cli:**
- `src/skills/deep-research/` - New skill
- `src/skills/gemini/SKILL.md` - Added research subcommand
- `src/skills/watch/SKILL.md` - Added alias notation
- `CLAUDE.md` - Documented skill creation pattern

---

*Session completed with working Deep Research automation and proper skill installation pattern documented.*
