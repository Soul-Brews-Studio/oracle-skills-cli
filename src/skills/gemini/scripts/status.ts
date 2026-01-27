#!/usr/bin/env bun
/**
 * Gemini Proxy Status - Like debug console but in terminal
 *
 * Usage: bun status.ts
 */

const MQTT_HOST = "localhost";
const MQTT_PORT = "1883";
const MQTT_TOPIC_CMD = "claude/browser/command";
const MQTT_TOPIC_RSP = "claude/browser/response";
const MQTT_TOPIC_STATUS = "claude/browser/status";

interface Status {
  status: "online" | "offline";
  timestamp: number;
  version: string;
}

interface Tab {
  id: number;
  title: string;
  url: string;
  active: boolean;
  windowId: number;
}

// Get extension status (retained message)
async function getStatus(): Promise<Status | null> {
  const proc = Bun.spawn([
    "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_STATUS, "-C", "1", "-W", "2"
  ], { stdout: "pipe" });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  if (!output.trim()) return null;

  try {
    return JSON.parse(output.trim());
  } catch {
    return null;
  }
}

// Send command and get response
async function sendCommand(action: string, params: Record<string, any> = {}): Promise<any> {
  const ts = Date.now();
  const id = `${action}_${ts}`;

  // Subscribe first
  const subProc = Bun.spawn([
    "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_RSP, "-C", "1", "-W", "5"
  ], { stdout: "pipe" });

  await Bun.sleep(200);

  // Publish
  const cmd = JSON.stringify({ id, action, ts, ...params });
  const pubProc = Bun.spawn([
    "mosquitto_pub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_CMD, "-m", cmd
  ]);
  await pubProc.exited;

  // Get response
  const output = await new Response(subProc.stdout).text();
  await subProc.exited;

  if (!output.trim()) return null;

  try {
    return JSON.parse(output.trim());
  } catch {
    return null;
  }
}

// Format timestamp
function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

// Main
console.log("\n🔮 Gemini Proxy Status\n");
console.log("═".repeat(60));

// 1. Extension Status
const status = await getStatus();
if (status) {
  const statusIcon = status.status === "online" ? "🟢" : "🔴";
  console.log(`\n${statusIcon} Extension: ${status.status.toUpperCase()}`);
  console.log(`   Version: ${status.version}`);
  console.log(`   Last seen: ${formatTime(status.timestamp)}`);
} else {
  console.log("\n🔴 Extension: OFFLINE or not connected");
  process.exit(1);
}

// 2. List Tabs
console.log("\n📑 Tabs:");
const tabsResponse = await sendCommand("list_tabs");

if (tabsResponse?.tabs?.length > 0) {
  for (const tab of tabsResponse.tabs) {
    const active = tab.active ? "⭐" : "  ";
    const shortUrl = tab.url.replace("https://gemini.google.com", "");
    console.log(`   ${active} ${tab.id} │ ${tab.title.substring(0, 30)} │ ${shortUrl}`);
  }
  console.log(`\n   Total: ${tabsResponse.tabs.length} tab(s)`);
} else {
  console.log("   No Gemini tabs found");
}

// 3. MQTT Topics
console.log("\n📡 MQTT Topics:");
console.log(`   Command:  ${MQTT_TOPIC_CMD}`);
console.log(`   Response: ${MQTT_TOPIC_RSP}`);
console.log(`   Status:   ${MQTT_TOPIC_STATUS}`);

// 4. Quick Commands
console.log("\n⚡ Quick Commands:");
console.log("   bun list-tabs.ts          # List all tabs");
console.log("   bun deep-research.ts \"q\"  # Start Deep Research");
console.log("   bun send-chat.ts \"msg\"    # Send chat message");

console.log("\n" + "═".repeat(60));
