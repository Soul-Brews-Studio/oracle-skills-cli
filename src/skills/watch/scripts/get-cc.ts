#!/usr/bin/env bun
// get-cc.ts - Get YouTube captions/subtitles
// Usage: bun get-cc.ts <youtube-url> [lang]
//
// Downloads auto-captions in SRT format, outputs to stdout
// Default language: en

import { $ } from "bun";
import { mkdtempSync, existsSync, readdirSync, rmSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const url = process.argv[2];
const lang = process.argv[3] || "en";

if (!url) {
  console.error("Usage: bun get-cc.ts <youtube-url> [lang]");
  process.exit(1);
}

// Create temp dir
const tempDir = mkdtempSync(join(tmpdir(), "cc-"));

try {
  // Extract video ID
  const videoId = (await $`yt-dlp --get-id ${url}`.text()).trim();

  // Download auto-captions
  await $`yt-dlp --write-auto-sub --sub-lang ${lang} --sub-format srt --skip-download -o ${tempDir}/%(id)s ${url}`.quiet();

  // Find and output the caption file
  const ccFile = join(tempDir, `${videoId}.${lang}.srt`);
  
  if (existsSync(ccFile)) {
    console.log(await Bun.file(ccFile).text());
  } else {
    // Try without language suffix - find any .srt
    const files = readdirSync(tempDir).filter(f => f.endsWith('.srt'));
    if (files.length) {
      console.log(await Bun.file(join(tempDir, files[0])).text());
    } else {
      console.log("NO_CAPTIONS_AVAILABLE");
    }
  }
} finally {
  // Cleanup
  rmSync(tempDir, { recursive: true, force: true });
}
