# The Smooth Flow: Building AI-to-AI Pipelines with MQTT

**Draft Date**: 2026-01-27
**Status**: Draft
**Tags**: mqtt, automation, gemini, claude, ai-pipelines, chrome-extension

---

## TL;DR

We built a system where Claude Code can command a Chrome extension via MQTT to automate Gemini interactions. One command creates a new tab, sends a YouTube transcription request with metadata, and lets Gemini do the work. No clicking, no copy-paste, just smooth flow.

---

## The Problem

You're watching a YouTube video and want to transcribe it. The old way:

1. Open Gemini
2. Copy the YouTube URL
3. Type a prompt asking for transcription
4. Wait for response
5. Copy the result somewhere

Five steps. Manual. Boring.

## The Smooth Flow Solution

```bash
bun transcribe.ts "https://youtube.com/watch?v=xxx"
```

One command. Done.

Behind the scenes:
1. Script fetches video metadata (title, channel, duration)
2. MQTT message creates new Gemini tab
3. Another MQTT message sends the prompt with JSON metadata
4. Gemini transcribes the video
5. You go make coffee

---

## The Architecture

```
┌─────────────────┐     MQTT      ┌──────────────────┐
│  Claude Code    │──────────────▶│ Chrome Extension │
│  (transcribe.ts)│               │ (Gemini Proxy)   │
└─────────────────┘               └────────┬─────────┘
                                           │
                                           ▼
                                  ┌──────────────────┐
                                  │     Gemini       │
                                  │ (processes video)│
                                  └──────────────────┘
```

### Why MQTT?

- **Decoupled**: Claude Code doesn't need to know about browser internals
- **Retained messages**: Messages persist, can be read later
- **Lightweight**: WebSocket-based, works everywhere
- **Debuggable**: Subscribe to topics to see what's happening

### The Chrome Extension

`claude-browser-proxy` is a Chrome extension that:
- Connects to local MQTT broker (Mosquitto)
- Listens for commands on `claude/browser/command`
- Executes actions: `create_tab`, `chat`, `get_text`, etc.
- Publishes results to `claude/browser/response`

Key actions:

| Action | What it does |
|--------|--------------|
| `create_tab` | Opens new Gemini tab |
| `chat` | Types and sends a message |
| `get_text` | Extracts page content |
| `transcribe` | Combo: new tab + send prompt |

---

## The Script: Code as Documentation

Following Anthropic's skill-creator pattern, the script IS the documentation:

```typescript
#!/usr/bin/env bun
// transcribe.ts - The full smooth flow

// Step 1: Get metadata
console.log("📹 Getting metadata...")
const metadata = await $`bun get-metadata.ts ${url}`.json()
// { title, channel, duration_string, id }

// Step 2: Create new Gemini tab
console.log("🌐 Creating new Gemini tab...")
await $`mosquitto_pub -h localhost -p 1883 \
  -t "claude/browser/command" -r \
  -m '{"action":"create_tab","ts":${Date.now()}}'`

await Bun.sleep(4000) // Wait for tab to load

// Step 3: Send prompt with JSON metadata
console.log("💬 Sending transcription prompt...")
const prompt = `Please transcribe this YouTube video...

\`\`\`json
${JSON.stringify(metadata)}
\`\`\`
`

await $`mosquitto_pub -h localhost -p 1883 \
  -t "claude/browser/command" -r \
  -m '{"action":"chat","text":"${prompt}","ts":${Date.now()}}'`

console.log("✅ Done! Check your browser.")
```

### Why JSON Metadata?

We tried markdown first:

```
**Video Info:**
- Title: Some Video
- Channel: Some Channel
- Duration: 21:12
```

But JSON is cleaner for AI parsing:

```json
{"title":"Some Video","channel":"Some Channel","duration":"21:12"}
```

Gemini (and Claude) can parse JSON trivially. Less formatting, more signal.

---

## Key Learnings

### 1. Always Use Retain Flag

```bash
mosquitto_pub -r -m '...'  # -r = retain
```

Without `-r`, the message disappears immediately. With `-r`, it persists until overwritten. Essential for reading responses later.

### 2. Add Timestamps

```json
{"action":"chat","text":"...","ts":1706351234567}
```

Timestamps help with:
- Debugging (which message came when)
- Ordering (if messages arrive out of order)
- Deduplication (ignore old messages)

### 3. Single-Action Orchestration

Combine multiple steps into one atomic action:

```
BAD:  create_tab → user waits → chat → user waits → get_text
GOOD: transcribe.ts → one command does everything
```

Users don't care about the steps. They care about the result.

### 4. Code as Reference

From Anthropic's skill-creator pattern:

> The script IS the documentation.

Instead of writing 50 lines of instructions in SKILL.md, write a 50-line script. The script:
- Never gets stale
- Is testable
- Is runnable
- Is the single source of truth

---

## The Bigger Picture: AI-to-AI Pipelines

This is just the beginning. The pattern extends to:

```
Claude Code
    │
    ├──▶ Gemini (transcription, video analysis)
    ├──▶ ChatGPT (alternative perspectives)
    ├──▶ Local LLMs (private/fast tasks)
    └──▶ Specialized APIs (translation, TTS, etc.)
```

Each AI has strengths:
- **Gemini**: Native YouTube understanding
- **Claude**: Code generation, reasoning
- **Local LLMs**: Privacy, speed, cost

The smooth flow connects them all through MQTT.

---

## Try It Yourself

### Prerequisites

```bash
# Install Mosquitto
brew install mosquitto
brew services start mosquitto

# Clone the extension
git clone https://github.com/laris-co/claude-browser-proxy
# Load as unpacked extension in Chrome
```

### Run the Flow

```bash
# Get the script
git clone https://github.com/Soul-Brews-Studio/oracle-skills-cli
cd oracle-skills-cli

# Transcribe a video
bun src/skills/watch/scripts/transcribe.ts \
  "https://youtube.com/watch?v=MUDvwqJWWIw"
```

Watch as:
1. New Gemini tab opens
2. Prompt appears with video metadata
3. Gemini starts transcribing

Magic? No. Just MQTT.

---

## What's Next

- **Response polling**: Auto-detect when Gemini is done
- **Save to Oracle**: Index transcripts for future search
- **Model selection**: Choose Fast/Thinking/Pro modes
- **Error handling**: Retry on failures
- **Multi-video**: Batch transcription

The smooth flow is just version 1. The pattern scales.

---

## Conclusion

The best automation feels invisible. One command, smooth flow, done.

MQTT bridges the gap between Claude Code and browser-based AI. The chrome extension is the translator. The script is the documentation.

Build your own smooth flows. Connect your AIs. Make the machines do the work.

---

*Written with Claude Opus 4.5, tested with Gemini Pro, orchestrated via MQTT.*

**Links:**
- [claude-browser-proxy](https://github.com/laris-co/claude-browser-proxy)
- [oracle-skills-cli](https://github.com/Soul-Brews-Studio/oracle-skills-cli)
- [Anthropic Skills](https://github.com/anthropics/skills)
