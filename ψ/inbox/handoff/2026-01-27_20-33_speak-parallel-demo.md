# Handoff: /speak Skill + Parallel Demo + v1.5.40

**Date**: 2026-01-27 20:33 GMT+7

## What We Did

- Created `/speak` skill with edge-tts (neural voices) + macOS say fallback
- Added Thai voice support (th-TH-NiwatNeural, th-TH-PremwadeeNeural)
- Demonstrated parallel YouTube transcription to 4 Gemini tabs
- Used /speak for Thai voice narration during demo recording
- Saved all 4 transcriptions to Google Docs via 💾 click action
- Released v1.5.40 with all changes

## Key Files

| File | Purpose |
|------|---------|
| `src/skills/speak/SKILL.md` | Skill definition |
| `src/skills/speak/scripts/speak.ts` | TTS script |
| `src/skills/gemini/scripts/list-tabs.ts` | List Gemini tabs |
| `src/skills/gemini/scripts/status.ts` | Status dashboard |

## Commands Learned

```bash
# Speak text
bun speak.ts "Hello"
bun speak.ts --thai "สวัสดี"
bun speak.ts --female "Hi"

# List Gemini tabs
bun list-tabs.ts

# Send to specific tab
mosquitto_pub -t "claude/browser/command" -m '{"action":"chat","tabId":123,"text":"..."}'

# Click save button
mosquitto_pub -t "claude/browser/command" -m '{"action":"click","tabId":123,"selector":".claude-response-actions button:first-child"}'
```

## Pending

- [ ] Update send-chat.ts to use mosquitto_pub (Bun doesn't support mqtt.js WebSocket)
- [ ] Add --output option to speak.ts for saving audio files
- [ ] Document Bun WebSocket limitation

## Known Issues

1. **send-chat.ts broken**: mqtt.js WebSocket not supported in Bun - use mosquitto_pub instead
2. **speak.ts needs full path**: When calling from different directory

## Next Session Ideas

- Add more voices to speak.ts defaults
- Create script to batch-process YouTube playlists
- Add voice speed control to speak.ts

## Quick Reference

```bash
# Release workflow
bun run compile
bun run src/cli/index.ts install -y -g --skill {name}

# Skill creation pattern
src/skills/{name}/SKILL.md → compile → install
```

## Session Stats

- **Duration**: ~27 minutes
- **Version**: v1.5.40
- **New skill**: /speak
- **Scripts added**: 3
