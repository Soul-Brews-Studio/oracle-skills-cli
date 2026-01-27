#!/usr/bin/env bun
/**
 * YouTube → Gemini Transcription (Smooth Flow)
 *
 * 1. Get video metadata
 * 2. Create new Gemini tab via MQTT (capture tabId)
 * 3. Send prompt with JSON metadata (using tabId)
 *
 * Usage:
 *   bun transcribe.ts <youtube-url>
 *   bun transcribe.ts https://www.youtube.com/watch?v=xxx
 */
import { $ } from "bun"

const MQTT_HOST = process.env.MQTT_HOST || "localhost"
const MQTT_PORT = process.env.MQTT_PORT || "1883"
const MQTT_TOPIC_CMD = "claude/browser/command"
const MQTT_TOPIC_RSP = "claude/browser/response"

const url = process.argv[2]
if (!url) {
  console.error("Usage: bun transcribe.ts <youtube-url>")
  process.exit(1)
}

// Helper: Subscribe and get response with timeout
async function getResponse(timeoutMs: number = 5000): Promise<any> {
  try {
    const result = await $`timeout ${timeoutMs / 1000} mosquitto_sub -h ${MQTT_HOST} -p ${MQTT_PORT} -t ${MQTT_TOPIC_RSP} -C 1`.text()
    return JSON.parse(result.trim())
  } catch (e) {
    return null
  }
}

// Step 1: Get metadata
console.log("📹 Getting metadata...")
const metadataScript = new URL("./get-metadata.ts", import.meta.url).pathname
const metadataResult = await $`bun ${metadataScript} ${url}`.text()

let metadata: { title: string; channel: string; duration_string: string; id: string }
try {
  metadata = JSON.parse(metadataResult.trim())
} catch (e) {
  console.error("Failed to parse metadata:", metadataResult)
  process.exit(1)
}

console.log(`   Title: ${metadata.title}`)
console.log(`   Channel: ${metadata.channel}`)
console.log(`   Duration: ${metadata.duration_string}`)

// Step 2: Create new Gemini tab and capture tabId
console.log("\n🌐 Creating new Gemini tab...")
const ts = Date.now()
const cmdId = `newtab-${ts}`
const createTabCmd = JSON.stringify({
  id: cmdId,
  action: "create_tab",
  ts
})

// Start subscriber FIRST (in background) - NO RETAIN anywhere
const subProc = Bun.spawn([
  "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
  "-t", MQTT_TOPIC_RSP, "-C", "1", "-W", "10"
], { stdout: "pipe" })

// Small delay to ensure subscriber is ready
await Bun.sleep(200)

// Now publish the command (NOT retained, so extension gets fresh command)
await $`mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT} -t ${MQTT_TOPIC_CMD} -m ${createTabCmd}`
console.log("   Command sent, waiting for response...")

// Read the response
let tabId: number | null = null
try {
  const responseText = await new Response(subProc.stdout).text()
  if (responseText.trim()) {
    const response = JSON.parse(responseText.trim())
    if (response?.tabId) {
      tabId = response.tabId
      console.log(`   ✓ Tab created: ${tabId}`)
    } else if (response?.action === "create_tab") {
      // Response doesn't have tabId at top level, check result
      tabId = response.result?.tabId || response.tabId
      if (tabId) console.log(`   ✓ Tab created: ${tabId}`)
    }
  }
} catch (e) {
  console.log("   ⚠️ Could not parse response, continuing...")
}

if (!tabId) {
  console.log("   ⚠️ No tabId received, continuing without it...")
}

// Wait for page to fully load
console.log("   Waiting for page to load...")
await Bun.sleep(3000)

// Step 3: Build and send prompt with JSON metadata
console.log("\n💬 Sending transcription prompt...")
const jsonMeta = JSON.stringify({
  title: metadata.title,
  channel: metadata.channel,
  duration: metadata.duration_string,
  url: url
})

const prompt = `Please transcribe this YouTube video with timestamps.

\`\`\`json
${jsonMeta}
\`\`\`

Format:
[00:00] Text here

[01:00] Next section

Use double newlines between timestamps!`

const ts2 = Date.now()
const chatCmd = JSON.stringify({
  id: `chat-${ts2}`,
  action: "chat",
  text: prompt,
  tabId: tabId,  // Reference the specific tab!
  ts: ts2
})

await $`mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT} -t ${MQTT_TOPIC_CMD} -m ${chatCmd}`

console.log("\n✅ Done! Check your browser for the new Gemini tab.")
console.log(`   Video: ${metadata.title}`)
console.log(`   Tab ID: ${tabId || "unknown"}`)
console.log(`   Gemini is now transcribing...`)

// Output metadata for piping (includes tabId)
console.log("\n📋 Metadata (for save-learning.ts):")
console.log(JSON.stringify({ ...metadata, tabId }))
