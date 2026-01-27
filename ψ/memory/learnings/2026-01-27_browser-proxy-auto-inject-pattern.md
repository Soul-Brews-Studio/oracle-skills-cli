# Browser Extension Auto-Inject Pattern

**Date**: 2026-01-27
**Context**: claude-browser-proxy v2.9.8
**Confidence**: High

## Key Learning

For persistent DOM injection in browser extensions, use content scripts with MutationObserver rather than background script commands. This pattern survives page refreshes and automatically handles new content.

## The Pattern

```javascript
// content.js - runs on page load

// 1. Request tab ID from background
chrome.runtime.sendMessage({ action: 'getTabId' }, (response) => {
  if (response?.tabId) showTabBadge(response.tabId);
});

// 2. Define injection function
function injectButtons(element) {
  if (element.querySelector('.my-injected')) return;
  const buttons = element.querySelectorAll('button');
  if (buttons.length < 3) return;
  const lastBtn = buttons[buttons.length - 1];
  // Create and insert custom content
  const container = document.createElement('div');
  container.className = 'my-injected';
  // ... add buttons ...
  lastBtn.after(container);
}

// 3. Initial injection
document.querySelectorAll('target-element').forEach(injectButtons);

// 4. Watch for new content
const observer = new MutationObserver(() => {
  document.querySelectorAll('target-element').forEach(injectButtons);
});
observer.observe(document.body, { childList: true, subtree: true });
```

## Why This Matters

- **Persistence**: Survives page refresh (content script auto-runs)
- **Real-time**: MutationObserver catches new content immediately
- **No polling**: More efficient than setInterval checks
- **Clean separation**: Content script handles DOM, background handles messaging

## Tags

`browser-extension`, `content-script`, `mutation-observer`, `auto-inject`, `gemini-proxy`
