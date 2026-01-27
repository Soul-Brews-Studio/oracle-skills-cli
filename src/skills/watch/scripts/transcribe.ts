#!/usr/bin/env bun
/**
 * YouTube → Gemini Transcription (Smooth Flow)
 *
 * Supports multiple Gemini modes:
 * - chat (default): Quick transcription
 * - research: Deep Research mode for complex analysis
 * - canvas: Collaborative document mode
 *
 * Usage:
 *   bun transcribe.ts <youtube-url>
 *   bun transcribe.ts --mode=research <youtube-url>
 *   bun transcribe.ts --mode=canvas <youtube-url>
 *   bun transcribe.ts --model=thinking <youtube-url>
 */
import { $ } from "bun"

const MQTT_HOST = process.env.MQTT_HOST || "localhost"
const MQTT_PORT = process.env.MQTT_PORT || "1883"
const MQTT_TOPIC_CMD = "claude/browser/command"
const MQTT_TOPIC_RSP = "claude/browser/response"

// Parse arguments
const args = process.argv.slice(2)
let mode = "chat"  // default: chat, research, canvas
let model = ""     // default: none, fast, thinking, pro
let url = ""

for (const arg of args) {
  if (arg.startsWith("--mode=")) {
    mode = arg.replace("--mode=", "")
  } else if (arg.startsWith("--model=")) {
    model = arg.replace("--model=", "")
  } else if (arg.startsWith("http")) {
    url = arg
  }
}

if (!url) {
  console.error("Usage: bun transcribe.ts [--mode=chat|research|canvas] [--model=fast|thinking|pro] <youtube-url>")
  process.exit(1)
}

// Gemini URLs by mode
const GEMINI_URLS: Record<string, string> = {
  chat: "https://gemini.google.com/app",
  research: "https://gemini.google.com/app?mode=research",
  canvas: "https://gemini.google.com/canvas"
}

const geminiUrl = GEMINI_URLS[mode] || GEMINI_URLS.chat

// Mode-specific prompts
const PROMPTS: Record<string, (meta: string, url: string) => string> = {
  chat: (meta, url) => `Please transcribe this YouTube video with timestamps.

\`\`\`json
${meta}
\`\`\`

Format:
[00:00] Text here

[01:00] Next section

Use double newlines between timestamps!`,

  research: (meta, url) => `Deep research this YouTube video. Analyze thoroughly:

\`\`\`json
${meta}
\`\`\`

Please provide:
1. Full transcript with timestamps
2. Key concepts explained
3. Related topics and context
4. Fact-check any claims made
5. Summary and takeaways`,

  canvas: (meta, url) => `Create a comprehensive document from this YouTube video:

\`\`\`json
${meta}
\`\`\`

Structure the document with:
- Title and metadata
- Executive summary
- Full transcript (timestamped)
- Key points and insights
- Action items if applicable`
}

console.log(`🎬 Mode: ${mode.toUpperCase()}`)
if (model) console.log(`🧠 Model: ${model}`)

// Step 1: Get metadata
console.log("\n📹 Getting metadata...")
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

// Step 2: Create new Gemini tab with mode-specific URL
console.log(`\n🌐 Opening Gemini (${mode} mode)...`)
const ts = Date.now()
const createTabCmd = JSON.stringify({
  id: `newtab-${ts}`,
  action: "create_tab",
  url: geminiUrl,
  ts
})

// Subscribe first, then publish
const subProc = Bun.spawn([
  "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
  "-t", MQTT_TOPIC_RSP, "-C", "1", "-W", "10"
], { stdout: "pipe" })

await Bun.sleep(200)
await $`mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT} -t ${MQTT_TOPIC_CMD} -m ${createTabCmd}`
console.log("   Command sent, waiting for response...")

// Read tabId from response
let tabId: number | null = null
try {
  const responseText = await new Response(subProc.stdout).text()
  if (responseText.trim()) {
    const response = JSON.parse(responseText.trim())
    tabId = response?.tabId || response?.result?.tabId
    if (tabId) console.log(`   ✓ Tab created: ${tabId}`)
  }
} catch (e) {
  console.log("   ⚠️ Could not parse response")
}

if (!tabId) {
  console.log("   ⚠️ No tabId received, continuing...")
}

// Wait for page load (research mode needs more time)
const waitTime = mode === "research" ? 5000 : 3000
console.log(`   Waiting ${waitTime/1000}s for page to load...`)
await Bun.sleep(waitTime)

// Step 2.5: Select model if specified
if (model && tabId) {
  console.log(`\n🧠 Selecting ${model} model...`)
  const modelCmd = JSON.stringify({
    id: `model-${Date.now()}`,
    action: "select_model",
    model: model,
    tabId: tabId
  })
  await $`mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT} -t ${MQTT_TOPIC_CMD} -m ${modelCmd}`
  await Bun.sleep(1000)
}

// Step 3: Build and send prompt
console.log("\n💬 Sending prompt...")
const jsonMeta = JSON.stringify({
  title: metadata.title,
  channel: metadata.channel,
  duration: metadata.duration_string,
  url: url
})

const promptFn = PROMPTS[mode] || PROMPTS.chat
const prompt = promptFn(jsonMeta, url)

const chatCmd = JSON.stringify({
  id: `chat-${Date.now()}`,
  action: "chat",
  text: prompt,
  tabId: tabId,
  ts: Date.now()
})

await $`mosquitto_pub -h ${MQTT_HOST} -p ${MQTT_PORT} -t ${MQTT_TOPIC_CMD} -m ${chatCmd}`

// Mode-specific completion message
const modeEmoji: Record<string, string> = {
  chat: "📝",
  research: "🔬",
  canvas: "📄"
}

console.log(`\n✅ Done! ${modeEmoji[mode] || "✅"}`)
console.log(`   Mode: ${mode.toUpperCase()}`)
console.log(`   Video: ${metadata.title}`)
console.log(`   Tab ID: ${tabId || "unknown"}`)
if (model) console.log(`   Model: ${model}`)

// Output metadata for piping
console.log("\n📋 Metadata:")
console.log(JSON.stringify({ ...metadata, tabId, mode, model: model || "default" }))
