#!/bin/bash
# get-cc.sh - Get YouTube captions/subtitles
# Usage: get-cc.sh <youtube-url> [lang]
#
# Downloads auto-captions in SRT format, outputs to stdout
# Default language: en

set -e

URL="$1"
LANG="${2:-en}"

if [ -z "$URL" ]; then
  echo "Usage: get-cc.sh <youtube-url> [lang]" >&2
  exit 1
fi

# Create temp dir
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract video ID
VIDEO_ID=$(yt-dlp --get-id "$URL" 2>/dev/null)

# Download auto-captions
yt-dlp \
  --write-auto-sub \
  --sub-lang "$LANG" \
  --sub-format srt \
  --skip-download \
  -o "$TEMP_DIR/%(id)s" \
  "$URL" 2>/dev/null

# Find and output the caption file
CC_FILE="$TEMP_DIR/${VIDEO_ID}.${LANG}.srt"
if [ -f "$CC_FILE" ]; then
  cat "$CC_FILE"
else
  # Try without language suffix
  CC_FILE=$(find "$TEMP_DIR" -name "*.srt" | head -1)
  if [ -f "$CC_FILE" ]; then
    cat "$CC_FILE"
  else
    echo "NO_CAPTIONS_AVAILABLE"
    exit 0
  fi
fi
