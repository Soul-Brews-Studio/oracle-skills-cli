# Handoff: Gemini MQTT Fix + Deep Research

**Date**: 2026-01-28 07:45
**Context**: oracle-skills-cli

## What We Did

- Fixed all gemini scripts (20 files) to use native MQTT TCP (`mqtt://localhost:1883`) instead of WebSocket (`ws://localhost:9001`)
- Added `bunfig.toml` to restrict test root (fixes moltbot test leakage)
- Updated SKILL.md documentation for dual transport setup
- Tested deep-research skill - works smoothly with Bun now
- Added screenshot automation (`screencapture`)
- Recorded smooth practice for deep-research automation flow

## Commits This Session

```
4b8f501 learn: deep-research automation smooth flow
bb4981e fix(test): add bunfig.toml to restrict test root
c49329e fix(gemini): use native MQTT TCP instead of WebSocket for Bun compatibility
```

## Key Learning

**Mosquitto Dual Transport:**
- TCP port 1883 → CLI/Bun scripts
- WebSocket port 9001 → Browser extension
- Messages bridge automatically

## Pending

- [ ] Push commits to remote
- [ ] Feature: Read Research Plan from Gemini (deferred)

## Next Session

- [ ] Consider adding Verdant IPA yeast deep research
- [ ] Review deep research results on brewing yeast comparison
- [ ] Continue any brewing-related research

## Key Files

- `src/skills/gemini/scripts/*.ts` - All fixed to use mqtt://
- `bunfig.toml` - Test root restriction
- `ψ/memory/learnings/2026-01-28_deep-research-automation-flow-smooth-practice.md`
- `ψ/memory/learnings/2026-01-28_mosquitto-dual-transport-tcp-websocket-mo.md`
