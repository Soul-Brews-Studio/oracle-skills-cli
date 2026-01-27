# Code as Reference Pattern

**Date**: 2026-01-27
**Context**: /watch skill transcribe.ts development
**Confidence**: High
**Source**: Anthropic skill-creator pattern

## Key Learning

When building skills or automation workflows, **the script IS the documentation**. Instead of writing detailed step-by-step instructions in SKILL.md that can get stale, create a script that embodies the workflow. The script serves as both implementation AND reference.

## The Pattern

```
Traditional (docs-first):
  SKILL.md → describes steps → human follows manually

Code as Reference (script-first):
  script.ts → does the steps → human runs one command
  SKILL.md → references script → always in sync
```

## Example: transcribe.ts

```typescript
// This script IS the documentation of the transcribe flow

// Step 1: Get metadata
const metadata = await $`bun get-metadata.ts ${url}`.json()

// Step 2: Create new tab via MQTT
await $`mosquitto_pub ... -m '{"action":"create_tab"}'`
await Bun.sleep(4000)

// Step 3: Send prompt with JSON metadata
await $`mosquitto_pub ... -m '{"action":"chat","text":"..."}'`
```

## Why This Matters

1. **Documentation never gets stale** - the script is always current
2. **Lower cognitive load** - users run one command instead of following steps
3. **Testable** - you can verify the workflow works
4. **Composable** - scripts can call other scripts
5. **Debuggable** - add logging, error handling, retries

## Anthropic's Pattern

From `skills/skill-creator/`:
```
skill-creator/
├── SKILL.md           # References scripts
├── scripts/
│   ├── init_skill.py
│   ├── package_skill.py
│   └── quick_validate.py
└── references/        # Additional docs
```

The SKILL.md says "run this script" instead of "follow these 20 steps."

## Applied: /watch Skill

```
watch/
├── SKILL.md           # References transcribe.ts
└── scripts/
    ├── get-metadata.ts    # Single purpose
    ├── get-cc.ts          # Single purpose
    ├── transcribe.ts      # Combo (calls others)
    └── save-learning.ts   # Single purpose
```

Usage becomes:
```bash
bun transcribe.ts "https://youtube.com/..."
# Done. Script handles everything.
```

## Tags

`skills`, `documentation`, `automation`, `anthropic`, `patterns`, `mqtt`
