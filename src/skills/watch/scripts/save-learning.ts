#!/usr/bin/env bun
// save-learning.ts - Save YouTube transcript to learning file
// Usage: bun save-learning.ts <title> <url> <video_id> <transcript> [cc_text]
//
// Creates markdown file in ψ/memory/learnings/

import { existsSync, mkdirSync, appendFileSync } from "fs";
import { dirname, join } from "path";

const title = process.argv[2];
if (!title) {
  console.log("Usage: ROOT=/path bun save-learning.ts <title> <url> <video_id> <transcript> [cc]");
  process.exit(1);
}

const ROOT = process.env.ROOT;
if (!ROOT) {
  console.error("Error: ROOT environment variable required");
  process.exit(1);
}

const url = process.argv[3];
const videoId = process.argv[4];
const transcript = process.argv[5];
const ccText = process.argv[6] || "No captions available";

if (!title || !url) {
  console.error("Usage: bun save-learning.ts <title> <url> <video_id> <transcript> [cc_text]");
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);

// Generate slug from title (lowercase, hyphenated, max 50 chars)
const slug = title
  .toLowerCase()
  .replace(/[^a-z0-9]/g, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 50);

// Ensure unique filename
let learningFile = join(ROOT, `ψ/memory/learnings/${date}_${slug}.md`);
let count = 1;
while (existsSync(learningFile)) {
  learningFile = join(ROOT, `ψ/memory/learnings/${date}_${slug}-${count}.md`);
  count++;
}

// Determine if we have CC
const hasCc = ccText !== "No captions available" && ccText !== "NO_CAPTIONS_AVAILABLE";

// Create learning file
const content = `---
title: ${title}
tags: [youtube, transcript, gemini, video]
source: ${url}
video_id: ${videoId}
created: ${date}
has_cc: ${hasCc}
transcribed_by: Gemini
---

# ${title}

## Source
- **YouTube**: ${url}
- **Video ID**: ${videoId}
- **Transcribed via**: Gemini (cross-checked with CC: ${hasCc})
- **Date**: ${date}

## Transcript (Gemini Enhanced)

${transcript}

## Raw YouTube Captions

<details>
<summary>Original CC (click to expand)</summary>

${ccText}

</details>

---
*Added via /watch skill*
`;

// Ensure directory exists
mkdirSync(dirname(learningFile), { recursive: true });
await Bun.write(learningFile, content);

// Register slug
mkdirSync(dirname(SLUGS_FILE), { recursive: true });
if (!existsSync(SLUGS_FILE)) {
  await Bun.write(SLUGS_FILE, "# Slug Registry\n");
}
appendFileSync(SLUGS_FILE, `${slug}: ${learningFile}\n`);

console.log(`✅ Saved: ${learningFile}`);
console.log(`📎 Slug: ${slug}`);
