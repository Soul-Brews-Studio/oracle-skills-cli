---
name: watch
description: Learn from YouTube videos via Gemini transcription. Use when user says "watch", "transcribe youtube", "learn from video", or shares a YouTube URL to study.
---

# /watch - YouTube → Gemini → Oracle Knowledge

Learn from YouTube videos by sending to Gemini for transcription, then indexing to Oracle.

## Usage

```bash
/watch https://youtube.com/watch?v=xxx              # Auto-resolve title via yt-dlp
/watch "Custom Title" https://youtu.be/xxx          # Override title
/watch --slug custom-slug https://youtube.com/...   # Custom slug
```

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/get-metadata.ts <url>` | Get title, duration, channel (JSON) |
| `scripts/get-cc.ts <url> [lang]` | Get captions in SRT format |
| `scripts/save-learning.ts <title> <url> <id> <transcript> [cc]` | Save to ψ/memory/learnings/ |

## Workflow

### Step 1: Get Metadata & Captions

```bash
SKILL_DIR=".claude/skills/watch"

# Get video metadata (JSON)
METADATA=$($SKILL_DIR/scripts/get-metadata.ts "$URL")
TITLE=$(echo "$METADATA" | jq -r '.title')
VIDEO_ID=$(echo "$METADATA" | jq -r '.id')
DURATION=$(echo "$METADATA" | jq -r '.duration_string')

echo "📹 Title: $TITLE"
echo "⏱️ Duration: $DURATION"
echo "🆔 Video ID: $VIDEO_ID"

# Get captions (may be empty)
CC_TEXT=$($SKILL_DIR/scripts/get-cc.ts "$URL" en)
if [ "$CC_TEXT" = "NO_CAPTIONS_AVAILABLE" ]; then
  HAS_CC=false
  echo "⚠️ No captions available"
else
  HAS_CC=true
  echo "✅ Found YouTube captions"
fi
```

### Step 2: Open Gemini via MQTT (Smooth Flow)

Use claude-browser-proxy MQTT commands for reliable automation.

```bash
# Create new Gemini tab
mosquitto_pub -h localhost -p 1883 -t "claude/browser/command" -r \
  -m "{\"id\":\"newtab-$(date +%s)\",\"action\":\"create_tab\",\"ts\":$(date +%s)}"

echo "Creating new Gemini tab..."
sleep 4  # Wait for tab to load
```

### Step 3: Send Transcription Request with Metadata

Build prompt with JSON metadata block, then send via MQTT `chat` action.

```bash
# Build prompt with JSON metadata
PROMPT="Please transcribe this YouTube video with timestamps.

\`\`\`json
{\"title\":\"$TITLE\",\"channel\":\"$CHANNEL\",\"duration\":\"$DURATION\",\"url\":\"$URL\"}
\`\`\`

Format:
[00:00] Text here

[01:00] Next section

Use double newlines between timestamps!"

# Send to Gemini via MQTT
mosquitto_pub -h localhost -p 1883 -t "claude/browser/command" -r \
  -m "{\"id\":\"chat-$(date +%s)\",\"action\":\"chat\",\"text\":\"$PROMPT\",\"ts\":$(date +%s)}"

echo "Prompt sent to Gemini!"
```

**With captions (cross-check mode):**

```bash
PROMPT="I have YouTube auto-captions. Please verify and fix errors.

\`\`\`json
{\"title\":\"$TITLE\",\"channel\":\"$CHANNEL\",\"duration\":\"$DURATION\",\"url\":\"$URL\"}
\`\`\`

Auto-captions:
---
$CC_TEXT
---

Tasks:
1. Fix caption errors (names, technical terms)
2. Add section headers and timestamps
3. Provide 3 key takeaways"
```

### Step 4: Wait for Response

```bash
# Wait for Gemini to process (longer for long videos)
sleep 15  # Adjust based on video length

# Get response via MQTT
mosquitto_sub -h localhost -p 1883 -t "claude/browser/response" -C 1 -W 30
```

**Or use `get_text` action:**

```bash
mosquitto_pub -h localhost -p 1883 -t "claude/browser/command" -r \
  -m "{\"id\":\"gettext-$(date +%s)\",\"action\":\"get_text\",\"ts\":$(date +%s)}"
```

### MQTT Quick Reference

| Action | Purpose |
|--------|---------|
| `create_tab` | New Gemini tab |
| `chat` | Send prompt to active tab |
| `get_text` | Extract page text |
| `transcribe` | Combo: new tab + hardcoded prompt |

**Important**: Always use `-r` (retain) flag so responses persist!

### Step 5: Save to Knowledge

Use the save script (handles slug, filename, slugs.yaml):

```bash
$SKILL_DIR/scripts/save-learning.ts "$TITLE" "$URL" "$VIDEO_ID" "$GEMINI_RESPONSE" "$CC_TEXT"
```

### Step 6: Index to Oracle

```
oracle_learn({
  pattern: "YouTube transcript: [TITLE] - [key takeaways summary]",
  concepts: ["youtube", "transcript", "video", "[topic-tags from content]"],
  source: "/watch skill"
})
```

## Output Summary

```markdown
## 🎬 Video Learned: [TITLE]

**Source**: [YOUTUBE_URL]
**Gemini**: [GEMINI_CONVERSATION_URL]

### Key Takeaways
[From Gemini response]

### Saved To
- Learning: ψ/memory/learnings/[DATE]_[SLUG].md
- Oracle: Indexed ✓

### Quick Access
`/trace [SLUG]` or `oracle_search("[TITLE]")`
```

## IMPORTANT: Save Gemini Conversation Link

**Always save the Gemini conversation URL** in the learning file frontmatter:

```yaml
---
title: [Video Title]
source: YouTube - [Creator] (youtube_url)
gemini_conversation: https://gemini.google.com/app/[conversation_id]
---
```

**Why**:
- Conversations persist and are revisitable
- Can continue asking follow-up questions later
- Provides audit trail of transcription source
- URL visible in browser after sending request

## Notes

- Gemini has YouTube understanding built-in (can process video directly)
- Long videos may take 30-60 seconds to process
- If Gemini can't access video, it will say so — fallback to manual notes
- Works with: youtube.com, youtu.be, youtube.com/shorts/

## Error Handling

| Error | Action |
|-------|--------|
| Gemini blocked | User must be logged into Google |
| Video unavailable | Save URL + notes manually |
| Rate limited | Wait and retry |
| Browser tab closed | Recreate tab, retry |
