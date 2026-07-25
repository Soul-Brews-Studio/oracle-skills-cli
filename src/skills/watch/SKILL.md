---
name: watch
description: 'Extract YouTube video transcripts via yt-dlp and pipe to /learn. Use when user says "watch", "youtube", "video", "transcript", or shares a YouTube URL.'
argument-hint: "<youtube-url> [--raw | --learn | --summary]"

hidden: true
metadata:
  internal: true
---

# /watch — YouTube → Knowledge Pipeline

> Eyes that see. Ears that listen. Knowledge that stays.

Extract transcripts from YouTube videos using yt-dlp, then optionally pipe through /learn for deep analysis.

## Usage

```
/watch <url>                    # Extract CC + summarize
/watch <url> --raw              # Extract CC only, save raw SRT
/watch <url> --learn            # Extract CC → /learn --deep pipeline
/watch <url> --summary          # Extract CC → concise summary only
```

---

## Step 0: Validate & Detect

```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)" && ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$ORACLE_ROOT" ] && [ -f "$ORACLE_ROOT/CLAUDE.md" ] && { [ -d "$ORACLE_ROOT/ψ" ] || [ -L "$ORACLE_ROOT/ψ" ]; }; then
  PSI="$ORACLE_ROOT/ψ"
else
  ORACLE_ROOT="$(pwd)"
  PSI="$ORACLE_ROOT/ψ"
fi
```

### Check yt-dlp

```bash
if command -v yt-dlp &>/dev/null; then
  YTDLP="yt-dlp"
elif [ -x /tmp/yt-dlp ]; then
  YTDLP="/tmp/yt-dlp"
else
  echo "⚠️ yt-dlp not found. Install: pip install yt-dlp OR curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /tmp/yt-dlp && chmod +x /tmp/yt-dlp"
  exit 1
fi
```

### Validate URL

Extract video ID from URL. Accept:
- `https://www.youtube.com/watch?v=XXXXX`
- `https://youtu.be/XXXXX`
- `https://youtube.com/watch?v=XXXXX`

```bash
VIDEO_URL="$1"
VIDEO_ID=$(echo "$VIDEO_URL" | grep -oP '(?:v=|youtu\.be/)[\w-]{11}' | head -1 | sed 's/v=//')
if [ -z "$VIDEO_ID" ]; then
  echo "❌ Invalid YouTube URL: $VIDEO_URL"
  exit 1
fi
echo "🎬 Video ID: $VIDEO_ID"
```

---

## Step 1: Extract Video Metadata

```bash
$YTDLP --print title --print duration_string --print channel --skip-download "$VIDEO_URL" 2>/dev/null
```

Save as variables: `TITLE`, `DURATION`, `CHANNEL`.

---

## Step 2: Extract Transcript (CC)

Try auto-generated English CC first, fall back to manual subs:

```bash
TMPDIR=$(mktemp -d)
$YTDLP --write-auto-sub --sub-lang en --sub-format srt --skip-download -o "$TMPDIR/%(id)s" "$VIDEO_URL" 2>/dev/null

# Check if SRT was downloaded
SRT_FILE="$TMPDIR/${VIDEO_ID}.en.srt"
if [ ! -f "$SRT_FILE" ]; then
  # Try manual subs
  $YTDLP --write-sub --sub-lang en --sub-format srt --skip-download -o "$TMPDIR/%(id)s" "$VIDEO_URL" 2>/dev/null
  SRT_FILE=$(ls "$TMPDIR"/*.srt 2>/dev/null | head -1)
fi

if [ ! -f "$SRT_FILE" ]; then
  echo "❌ No English subtitles found for this video."
  echo "💡 Try: $YTDLP --list-subs '$VIDEO_URL' to see available languages."
  exit 1
fi

SUB_COUNT=$(grep -c '^[0-9]\+$' "$SRT_FILE")
echo "📝 Extracted $SUB_COUNT subtitle blocks"
```

---

## Step 3: Clean Transcript

Strip SRT formatting (timestamps, numbers, blank lines) into plain text:

```bash
# Remove SRT formatting → clean text
sed '/^[0-9]*$/d; /^$/d; /-->/d' "$SRT_FILE" | sed 's/<[^>]*>//g' | sort -u > "$TMPDIR/clean.txt"
```

Read the clean transcript.

---

## Step 4: Save & Process (mode-dependent)

### Output Directory

```bash
# Slugify title
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g; s/--*/-/g; s/^-//; s/-$//' | cut -c1-50)
DATE=$(date +%Y-%m-%d)
OUT_DIR="$PSI/learn/$SLUG/$DATE"
mkdir -p "$OUT_DIR"
```

### Mode: `--raw`

Save raw SRT + clean text only:

```bash
cp "$SRT_FILE" "$OUT_DIR/raw-cc.srt"
cp "$TMPDIR/clean.txt" "$OUT_DIR/transcript.txt"
```

Output:
```
✅ Raw transcript saved
  📁 $OUT_DIR/raw-cc.srt (SRT)
  📁 $OUT_DIR/transcript.txt (clean)
  🎬 $TITLE ($DURATION) by $CHANNEL
```

### Mode: `--summary` (default)

Read the clean transcript and produce a structured analysis:

```markdown
# [TITLE]

**Source**: [YouTube URL]
**Duration**: [DURATION] | **Channel**: [CHANNEL]
**Extracted**: [DATE] via yt-dlp CC + Oracle analysis

---

## Thesis
[1-2 sentence core argument]

## Timestamped Summary
[Key points with timestamps from SRT]

## Key Quotes
[5-10 most important quotes]

## Relevance
[How this connects to our work — skills, fleet, philosophy]
```

Save to `$OUT_DIR/analysis.md` + raw files.

### Mode: `--learn`

Save raw files, then invoke the full /learn pipeline:

```
💡 Transcript extracted. Piping to /learn --deep...
```

Create a temporary markdown file with the full transcript content, then use it as input for deep analysis. The /learn pipeline will produce the full 5-document deep study.

---

## Step 5: Cleanup

```bash
rm -rf "$TMPDIR"
```

---

## Rules

1. **Never download video** — subtitles only (`--skip-download` always)
2. **Oracle root** — detect before writing to ψ/
3. **English first** — try `en` auto-subs, then manual, then fail with language hint
4. **Clean text** — strip SRT formatting before analysis
5. **Credit source** — always include YouTube URL, channel, and extraction date
6. **No redistribution** — transcript stays in local ψ/ vault, never committed to public repos

---

ARGUMENTS: $ARGUMENTS
