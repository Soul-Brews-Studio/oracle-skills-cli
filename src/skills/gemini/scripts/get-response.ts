#!/usr/bin/env node
/**
 * Get Gemini response text via MQTT WebSocket
 * Usage: ./get-response.ts
 */

import mqtt from "mqtt";

const MQTT_URL = "mqtt://localhost:1883";
const TOPIC_CMD = "claude/browser/command";
const TOPIC_RES = "claude/browser/response";

const client = mqtt.connect(MQTT_URL, {
  clientId: "gemini-get-" + Date.now(),
});

const cmdId = "get_" + Date.now();

client.on("connect", () => {
  client.subscribe(TOPIC_RES);

  const cmd = {
    action: "get_text",
    id: cmdId,
  };

  client.publish(TOPIC_CMD, JSON.stringify(cmd));
});

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    if (topic === TOPIC_RES && data.id === cmdId) {
      if (data.text) {
        console.log(data.text);
      } else if (data.error) {
        console.error("Error:", data.error);
        process.exit(1);
      }
      client.end();
      process.exit(0);
    }
  } catch (e) {
    // ignore
  }
});

client.on("error", (err) => {
  console.error("MQTT Error:", err.message);
  process.exit(1);
});

setTimeout(() => {
  console.error("Timeout");
  client.end();
  process.exit(1);
}, 10000);
