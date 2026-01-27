# Claude Browser Proxy v2.8.0 - Tab Management

**Date**: 2026-01-27 15:20
**PR**: https://github.com/laris-co/claude-browser-proxy/pull/1
**Confidence**: High (tested and working)

## New Features

### 1. `create_tab` - Create new Gemini tab

```json
{"action": "create_tab"}
→ {"tabId": 12345, "url": "https://gemini.google.com/app", "success": true}
```

### 2. `list_tabs` - List all Gemini tabs

```json
{"action": "list_tabs"}
→ {"tabs": [{"id": 123, "title": "...", "url": "..."}], "count": 2}
```

### 3. `focus_tab` - Focus specific tab

```json
{"action": "focus_tab", "tabId": 12345}
→ {"success": true}
```

### 4. `tabId` parameter - Target specific tab

All commands now accept optional `tabId`:

```json
{"action": "chat", "text": "Hello", "tabId": 12345}
{"action": "get_text", "tabId": 12345}
```

## Smooth MQTT Flow (Complete!)

```bash
# 1. Create tab
node -e "... create_tab ..."
# → tabId: 12345

# 2. Wait for load
sleep 3

# 3. Send chat to specific tab
node send-chat.ts --tab 12345 "Transcribe: https://youtube.com/..."

# 4. Get response from specific tab
node get-response.ts --tab 12345
```

## Key Implementation Details

### Tab Resolution Order

```javascript
// 1. Use specific tab if tabId provided
if (command.tabId) {
  tab = await chrome.tabs.get(command.tabId);
}
// 2. Try Gemini tab in current window
// 3. Try Gemini tab in any window
// 4. Fall back to active tab
```

### Response includes tabId

All responses now include `tabId` so caller knows which tab was used:

```json
{
  "id": "cmd_123",
  "action": "chat",
  "success": true,
  "tabId": 12345,
  "timestamp": 1234567890
}
```

## Version Sync

Remember to update BOTH:
- `background.js`: `const VERSION = '2.8.0'` (badge)
- `manifest.json`: `"version": "2.8.0"` (sidebar, Chrome)

## Tags

`chrome-extension`, `mqtt`, `tab-management`, `gemini-proxy`, `contribution`
