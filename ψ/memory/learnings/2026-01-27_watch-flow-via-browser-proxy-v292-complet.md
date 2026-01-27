---
title: ## /watch Flow via Browser Proxy (v2.9.2)
tags: [watch-skill, browser-proxy, youtube, transcribe, inject-response-actions, gemini, mqtt, flow]
created: 2026-01-27
source: Session 2026-01-27 - inject_response_actions success
---

# ## /watch Flow via Browser Proxy (v2.9.2)

## /watch Flow via Browser Proxy (v2.9.2)

Complete flow for YouTube transcription:

```javascript
// 1. Create new Gemini tab
{ action: 'create_tab' } → returns tabId

// 2. Inject status badge  
{ action: 'inject_badge', tabId, text: 'Transcribing...' }

// 3. Send transcription request
{ action: 'chat', tabId, text: `Please transcribe this YouTube video with timestamps.\n\nVideo: ${URL}` }

// 4. Wait for Gemini to process video (15-30 seconds)

// 5. Inject custom buttons after response complete
{ action: 'inject_response_actions', tabId, actions: [
  { id: 'save', label: '💾', title: 'Save to Oracle' },
  { id: 'learn', label: '📚', title: 'Add as learning' }
]}
```

**Key**: Wait for response to complete before injecting buttons - check for 6+ buttons in model-response (not 1).

---
*Added via Oracle Learn*
