#!/usr/bin/env bun
/**
 * List all Gemini tabs via MQTT
 *
 * Usage: bun list-tabs.ts
 */

const MQTT_HOST = "localhost";
const MQTT_PORT = "1883";
const MQTT_TOPIC_CMD = "claude/browser/command";
const MQTT_TOPIC_RSP = "claude/browser/response";

interface Tab {
  id: number;
  title: string;
  url: string;
  active: boolean;
  windowId: number;
}

interface TabsResponse {
  tabs: Tab[];
  count: number;
  id: string;
}

async function listTabs(): Promise<Tab[]> {
  const ts = Date.now();
  const id = `list_tabs_${ts}`;

  // Subscribe first to catch response
  const subProc = Bun.spawn([
    "mosquitto_sub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_RSP, "-C", "1", "-W", "5"
  ], { stdout: "pipe" });

  // Wait for subscription to be ready
  await Bun.sleep(200);

  // Publish command
  const cmd = JSON.stringify({ id, action: "list_tabs", ts });
  const pubProc = Bun.spawn([
    "mosquitto_pub", "-h", MQTT_HOST, "-p", MQTT_PORT,
    "-t", MQTT_TOPIC_CMD, "-m", cmd
  ]);
  await pubProc.exited;

  // Get response
  const output = await new Response(subProc.stdout).text();
  await subProc.exited;

  if (!output.trim()) {
    console.error("❌ No response from extension");
    return [];
  }

  try {
    const response: TabsResponse = JSON.parse(output.trim());
    return response.tabs || [];
  } catch (e) {
    console.error("❌ Failed to parse response:", output);
    return [];
  }
}

// Main
const tabs = await listTabs();

if (tabs.length === 0) {
  console.log("No Gemini tabs found");
  process.exit(1);
}

console.log(`\n🔮 Gemini Tabs (${tabs.length}):\n`);
console.log("┌─────────────┬────────────────────────────────────────────────┐");
console.log("│ Tab ID      │ Title / URL                                    │");
console.log("├─────────────┼────────────────────────────────────────────────┤");

for (const tab of tabs) {
  const id = String(tab.id).padEnd(11);
  const title = tab.title.substring(0, 46).padEnd(46);
  const active = tab.active ? " ⭐" : "";
  console.log(`│ ${id} │ ${title}${active} │`);
}

console.log("└─────────────┴────────────────────────────────────────────────┘");

// Output as JSON if --json flag
if (Bun.argv.includes("--json")) {
  console.log("\n" + JSON.stringify(tabs, null, 2));
}
