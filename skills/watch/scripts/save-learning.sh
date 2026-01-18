#!/bin/bash
# save-learning.sh - Save YouTube transcript to learning file
# Usage: save-learning.sh <title> <url> <video_id> <transcript> [cc_text]
#
# Creates markdown file in ψ/memory/learnings/

set -e

ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
SLUGS_FILE="$ROOT/ψ/memory/slugs.yaml"

TITLE="$1"
URL="$2"
VIDEO_ID="$3"
TRANSCRIPT="$4"
CC_TEXT="${5:-No captions available}"

if [ -z "$TITLE" ] || [ -z "$URL" ]; then
  echo "Usage: save-learning.sh <title> <url> <video_id> <transcript> [cc_text]" >&2
  exit 1
fi

DATE=$(date '+%Y-%m-%d')

# Generate slug from title (lowercase, hyphenated, max 50 chars)
SLUG=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-\|-$//g' | cut -c1-50)

# Ensure unique filename
LEARNING_FILE="$ROOT/ψ/memory/learnings/${DATE}_${SLUG}.md"
COUNT=1
while [ -f "$LEARNING_FILE" ]; do
  LEARNING_FILE="$ROOT/ψ/memory/learnings/${DATE}_${SLUG}-${COUNT}.md"
  COUNT=$((COUNT + 1))
done

# Determine if we have CC
HAS_CC="false"
if [ "$CC_TEXT" != "No captions available" ] && [ "$CC_TEXT" != "NO_CAPTIONS_AVAILABLE" ]; then
  HAS_CC="true"
fi

# Create learning file
cat > "$LEARNING_FILE" << EOF
---
title: $TITLE
tags: [youtube, transcript, gemini, video]
source: $URL
video_id: $VIDEO_ID
created: $DATE
has_cc: $HAS_CC
transcribed_by: Gemini
---

# $TITLE

## Source
- **YouTube**: $URL
- **Video ID**: $VIDEO_ID
- **Transcribed via**: Gemini (cross-checked with CC: $HAS_CC)
- **Date**: $DATE

## Transcript (Gemini Enhanced)

$TRANSCRIPT

## Raw YouTube Captions

<details>
<summary>Original CC (click to expand)</summary>

$CC_TEXT

</details>

---
*Added via /watch skill*
EOF

# Register slug
mkdir -p "$(dirname "$SLUGS_FILE")"
if [ ! -f "$SLUGS_FILE" ]; then
  echo "# Slug Registry" > "$SLUGS_FILE"
fi

# Add entry
echo "${SLUG}: $LEARNING_FILE" >> "$SLUGS_FILE"

echo "✅ Saved: $LEARNING_FILE"
echo "📎 Slug: $SLUG"
