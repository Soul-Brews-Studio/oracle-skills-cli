# Full Smooth Flow: MQTT → Chrome → Gemini

**Date**: 2026-01-27 15:54
**Context**: claude-browser-proxy extension + MQTT control
**Confidence**: High (fully verified with screenshots)

## The Achievement

Complete programmatic control of Google Gemini via MQTT:

```
Node.js Script
     ↓ MQTT WebSocket (ws://localhost:9001)
Mosquitto Broker
     ↓ MQTT
Chrome Extension (claude-browser-proxy v2.8.8)
     ↓ chrome.scripting.executeScript
Gemini Tab (specific tabId)
     ↓
Gemini responds!
```

## The Working Code

```typescript
// full-smooth.ts
import mqtt from 'mqtt';

const client = mqtt.connect('ws://localhost:9001');

async function send(action, params = {}) {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}`;
    client.subscribe('claude/browser/response');
    client.on('message', (topic, msg) => {
      const data = JSON.parse(msg.toString());
      if (data.id === id) resolve(data);
    });
    client.publish('claude/browser/command', JSON.stringify({ id, action, ...params }));
  });
}

// THE SMOOTH FLOW
const tab = await send('create_tab');           // → {tabId: 2127157543}
await send('inject_badge', { tabId: tab.tabId, text: 'SMOOTH!' });
await send('chat', { tabId: tab.tabId, text: 'Hello from Claude!' });
// → Gemini responds!
```

## Key Discoveries

### 1. Topic Names Matter
```
WRONG: claude-browser-proxy/command
RIGHT: claude/browser/command
```

### 2. Tab Precision Works
```javascript
chrome.scripting.executeScript({
  target: { tabId: command.tabId },  // ← Precise targeting!
  func: () => { /* code */ }
});
```

### 3. Multiple Selectors for Reliability
```javascript
const selectors = [
  'rich-textarea .ql-editor',
  'rich-textarea [contenteditable="true"]',
  '.ql-editor[contenteditable="true"]',
  'div[aria-label="Enter a prompt here"]',
  '[data-placeholder*="prompt"]',
  '[contenteditable="true"]'
];
```

### 4. innerHTML > execCommand
```javascript
// Old (deprecated, unreliable)
document.execCommand('insertText', false, text);

// New (works!)
input.innerHTML = '<p>' + text + '</p>';
input.dispatchEvent(new InputEvent('input', { bubbles: true }));
```

## The Pain Points (Solved!)

| Problem | Solution |
|---------|----------|
| MQTT commands timeout | Wrong topic names! Check source code. |
| Chat not typing | Selector outdated for new Gemini UI |
| execCommand deprecated | Use innerHTML + InputEvent |
| Can't target specific tab | Use tabId parameter with executeScript |

## Why This Matters

**Before**: Manual copy-paste to Gemini
**After**: Programmatic AI-to-AI communication

This enables:
- Ralph Loop (self-referential AI improvement)
- Automated Gemini queries from scripts
- Multi-model orchestration
- Screenshot self-verification loops

## Tags

`mqtt`, `chrome-extension`, `gemini`, `tab-precision`, `smooth-flow`, `breakthrough`
