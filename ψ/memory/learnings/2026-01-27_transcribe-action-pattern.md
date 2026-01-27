# Single-Action Orchestration Pattern

**Date**: 2026-01-27
**Context**: claude-browser-proxy transcribe action
**Confidence**: High

## Key Learning

When building automation tools, combine multiple sequential steps into a single action rather than requiring users to chain commands manually. The `transcribe` action demonstrates this pattern: one command creates a new Gemini tab, waits for it to load, and sends the transcription prompt.

## The Pattern

```javascript
case 'transcribe': {
  // 1. Create resource
  const tab = await chrome.tabs.create({ url: 'https://gemini.google.com/app' });

  // 2. Wait for ready state
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 3. Perform action
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (prompt) => { /* insert and send */ },
    args: [prompt]
  });

  // 4. Return combined result
  return { success: true, tabId: tab.id, video: videoUrl };
}
```

## Why This Matters

- **Simpler API**: One command vs three sequential commands
- **Handles timing**: Built-in wait for page load
- **Atomic operation**: Either succeeds completely or fails
- **Better DX**: Users don't need to understand the steps

## Also Learned

**Block scope in switch cases**: Always use `{}` when declaring variables in switch cases to avoid const/let redeclaration errors across cases.

```javascript
// Bad - const conflict
case 'a': const x = 1; break;
case 'b': const x = 2; break;  // Error!

// Good - block scope
case 'a': { const x = 1; break; }
case 'b': { const x = 2; break; }  // OK
```

## Tags

`browser-extension`, `orchestration`, `mqtt`, `automation`, `gemini-proxy`
