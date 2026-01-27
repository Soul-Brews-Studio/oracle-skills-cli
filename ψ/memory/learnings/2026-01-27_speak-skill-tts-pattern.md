# TTS Skill Pattern: edge-tts + macOS say Fallback

**Date**: 2026-01-27
**Context**: Creating /speak skill for oracle-skills-cli
**Confidence**: High

## Key Learning

When building text-to-speech functionality, use a cascading fallback pattern:

1. **Primary**: edge-tts (Microsoft Edge neural voices via Python)
   - High-quality, natural-sounding voices
   - Supports many languages including Thai
   - Requires `pip install edge-tts`

2. **Fallback**: macOS `say` command
   - Built-in, always available on Mac
   - Works offline
   - Limited voice quality but reliable

## The Pattern

```typescript
// Check if edge-tts is available
async function checkEdgeTts(): Promise<boolean> {
  const proc = Bun.spawn(["which", "edge-tts"], { stdout: "pipe" });
  await proc.exited;
  return proc.exitCode === 0;
}

// Main flow
const hasEdgeTts = await checkEdgeTts();

if (!options.forceMac && hasEdgeTts) {
  const success = await speakWithEdgeTts(text, voice);
  if (success) return;
  console.log("Falling back to macOS say...");
}

await speakWithMac(text, macVoice);
```

## Key Voices

| Language | edge-tts | macOS |
|----------|----------|-------|
| English (male) | en-US-GuyNeural | Daniel |
| English (female) | en-US-JennyNeural | Samantha |
| Thai (male) | th-TH-NiwatNeural | Kanya |
| Thai (female) | th-TH-PremwadeeNeural | Kanya |

## Why This Matters

- Neural voices make demos more professional
- Fallback ensures reliability on any Mac
- Thai voice support enables localized automation
- Voice narration adds accessibility

## Usage

```bash
bun speak.ts "Hello world"          # English
bun speak.ts --thai "สวัสดีครับ"      # Thai
bun speak.ts --female "Hi there"    # Female voice
bun speak.ts --mac "Always macOS"   # Force fallback
```

## Tags

`tts`, `edge-tts`, `macos-say`, `speak`, `accessibility`, `thai`
