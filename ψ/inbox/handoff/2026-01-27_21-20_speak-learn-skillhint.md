# Handoff: /speak + /learn moltbot + Skill Tool Hint

**Date**: 2026-01-27 21:20 GMT+7

## What We Did

1. **Created /speak skill** - TTS with edge-tts (neural voices) + macOS say fallback
2. **Parallel YouTube demo** - 4 Gemini tabs transcribing simultaneously
3. **Save to Google Docs** - Click 💾 button via MQTT
4. **/learn moltbot** - Explored codebase with 3 Haiku agents
5. **Skill tool hint** - Updated compile.ts + installer.ts

## Versions Released

| Version | Changes |
|---------|---------|
| v1.5.40 | /speak skill |
| v1.5.41 | Retrospective + handoff |
| v1.5.42 | Skill tool hint |

## Key Files

```
src/skills/speak/           # TTS skill
ψ/learn/moltbot/moltbot/    # Moltbot docs
scripts/compile.ts          # Skill tool hint
src/cli/installer.ts        # Skill tool hint for OpenCode
```

## Commands Learned

```bash
# Speak text
bun speak.ts "Hello"
bun speak.ts --thai "สวัสดี"

# Parallel MQTT to 4 tabs
mosquitto_pub -t "claude/browser/command" -m '{"action":"chat","tabId":123,...}'

# Click save button
mosquitto_pub -t "claude/browser/command" -m '{"action":"click","selector":".claude-response-actions button:first-child"}'
```

## Pending

- [ ] Fix test config to exclude ψ/learn/**/origin symlinks
- [ ] Update send-chat.ts to use mosquitto_pub
- [ ] Add --output option to speak.ts

## Known Issues

1. **Test symlink pollution**: bun test picks up moltbot tests via symlink
2. **send-chat.ts broken**: mqtt.js WebSocket not supported in Bun

## Moltbot Insights

- Multi-channel AI gateway (13+ platforms)
- ~410K lines TypeScript
- Hybrid search (vector + FTS)
- Ed25519 device identity
- Channel plugin system

**Docs**: `ψ/learn/moltbot/moltbot/`

## Quick Reference

```bash
# Release workflow
bun run compile && git add -A && git commit -m "..." && git tag vX.Y.Z && git push --tags

# Install skills
bun run src/cli/index.ts install -y -g
```
