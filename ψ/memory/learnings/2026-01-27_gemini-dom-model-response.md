# Gemini DOM: Use model-response Container

**Date**: 2026-01-27
**Context**: claude-browser-proxy inject_response_actions implementation
**Confidence**: High

## Key Learning

When injecting custom elements into Gemini's response UI, don't try to match specific icon names or Material Design conventions. Instead, anchor on Gemini's custom `model-response` element which wraps each AI response including its action buttons.

The action buttons (thumbs up/down, share, copy, edit, three-dot menu) are all contained within `model-response`. Finding all buttons and targeting the last one reliably locates the three-dot menu position without needing to know the exact icon implementation.

## The Pattern

```javascript
// Find responses
const responses = document.querySelectorAll('MESSAGE-CONTENT');

responses.forEach((response, index) => {
  // Walk up to model-response container
  let modelResponse = response.closest('model-response');
  if (!modelResponse) {
    let el = response;
    for (let i = 0; i < 10 && el; i++) {
      el = el.parentElement;
      if (el?.tagName === 'MODEL-RESPONSE') {
        modelResponse = el;
        break;
      }
    }
  }

  // Find ALL buttons, last one is three-dot menu
  const allButtons = modelResponse.querySelectorAll('button');
  const lastBtn = allButtons[allButtons.length - 1];

  // Insert after last button
  lastBtn.parentNode.insertBefore(customContainer, lastBtn.nextSibling);
});
```

## Why This Matters

Gemini's internal implementation may change icon names, class names, or aria-labels. But the structural hierarchy (`model-response` containing `MESSAGE-CONTENT` and action buttons) is fundamental to how the UI is organized and unlikely to change without a major redesign.

## Tags

`gemini`, `dom`, `browser-extension`, `inject`, `model-response`
