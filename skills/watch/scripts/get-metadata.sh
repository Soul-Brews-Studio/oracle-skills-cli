#!/bin/bash
# get-metadata.sh - Get YouTube video metadata via yt-dlp
# Usage: get-metadata.sh <youtube-url>
#
# Outputs JSON with: title, description, duration, channel, upload_date

set -e

URL="$1"
if [ -z "$URL" ]; then
  echo "Usage: get-metadata.sh <youtube-url>" >&2
  exit 1
fi

# Get metadata as JSON (no download)
yt-dlp --dump-json --no-download "$URL" 2>/dev/null | jq -c '{
  title: .title,
  description: (.description | split("\n") | .[0:5] | join("\n")),
  duration: .duration,
  duration_string: .duration_string,
  channel: .channel,
  upload_date: .upload_date,
  view_count: .view_count,
  id: .id
}'
