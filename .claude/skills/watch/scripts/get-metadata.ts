#!/usr/bin/env bun
// get-metadata.ts - Get YouTube video metadata via yt-dlp
// Usage: bun get-metadata.ts <youtube-url>
//
// Outputs JSON with: title, description, duration, channel, upload_date

import { $ } from "bun";

const url = process.argv[2];

if (!url) {
  console.error("Usage: bun get-metadata.ts <youtube-url>");
  process.exit(1);
}

// Get metadata as JSON (no download)
const raw = await $`yt-dlp --dump-json --no-download ${url}`.json();

const metadata = {
  title: raw.title,
  description: raw.description?.split("\n").slice(0, 5).join("\n"),
  duration: raw.duration,
  duration_string: raw.duration_string,
  channel: raw.channel,
  upload_date: raw.upload_date,
  view_count: raw.view_count,
  id: raw.id,
};

console.log(JSON.stringify(metadata));
