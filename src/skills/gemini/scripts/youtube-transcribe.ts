#!/usr/bin/env bun
/**
 * YouTube Transcribe Script
 *
 * Workflow:
 * 1. Create new Gemini tab
 * 2. Wait for load
 * 3. Inject badge
 * 4. Send transcribe request
 *
 * Uses mosquitto CLI (no npm deps required)
 */

const MQTT_HOST = "localhost";
const MQTT_PORT = "1883";
const MQTT_TOPIC_CMD = "claude/browser/command";
const MQTT_TOPIC_RSP = "claude/browser/response";

const youtubeUrl = Bun.argv[2] || 'https://www.youtube.com/watch?v=XpHMle5Vq80';

// Helper to publish MQTT command
async function mqttPub(payload: object): Promise<void> {
  const msg = JSON.stringify(payload);
  const proc = Bun.spawn([
    "mosquitto_pub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_CMD, "-m", msg
  ]);
  await proc.exited;
}

// Helper to subscribe and wait for response with matching ID
async function mqttSubWait(expectedId: string, timeoutSec: number = 10): Promise<any> {
  const proc = Bun.spawn([
    "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_RSP, "-C", "5", "-W", String(timeoutSec)
  ], { stdout: "pipe" });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  // Parse each line and find matching ID
  for (const line of output.trim().split('\n')) {
    if (!line) continue;
    try {
      const data = JSON.parse(line);
      if (data.id === expectedId) return data;
    } catch {}
  }
  return { timeout: true };
}

const ts = () => Date.now();

async function main() {
  console.log('\n🎬 YOUTUBE TRANSCRIBE FLOW\n');

  // 1. Create tab
  console.log('1️⃣  Creating new Gemini tab...');
  const createId = `create_tab_${ts()}`;
  await mqttPub({
    id: createId,
    action: "create_tab",
    url: "https://gemini.google.com/app",
    ts: ts()
  });
  const tabResult = await mqttSubWait(createId, 8);
  const tabId = tabResult.tabId;
  console.log(`   ✅ Tab ID: ${tabId || 'unknown'}`);

  // 2. Wait for load
  console.log('2️⃣  Waiting 4s for load...');
  await Bun.sleep(4000);

  // 3. Badge
  console.log('3️⃣  Injecting badge...');
  await mqttPub({
    id: `badge_${ts()}`,
    action: "inject_badge",
    tabId: tabId,
    text: "TRANSCRIBE",
    ts: ts()
  });
  await Bun.sleep(500);

  // 4. Send transcribe request
  console.log('4️⃣  Sending transcribe request...');
  const prompt = `Please watch and transcribe this YouTube video. Provide:
1. A summary of the main points
2. Key timestamps if possible
3. Any important quotes or highlights

Video: ${youtubeUrl}`;

  await mqttPub({
    id: `chat_${ts()}`,
    action: "chat",
    tabId: tabId,
    text: prompt,
    ts: ts()
  });
  console.log('   ✅ Request sent!');

  console.log('\n🎉 DONE!');
  console.log(`   Tab ID: ${tabId}`);
  console.log(`   Video: ${youtubeUrl}`);
  console.log('   Check Gemini for transcription!\n');
}

main().catch(console.error);
