#!/usr/bin/env bun
/**
 * Send chat message to Gemini via MQTT WebSocket
 * Usage: ./send-chat.ts "Your message here"
 */

import mqtt from "mqtt";

const MQTT_URL = "mqtt://localhost:1883";
const TOPIC_CMD = "claude/browser/command";
const TOPIC_RES = "claude/browser/response";
const TOPIC_STATE = "claude/browser/state";

const text = process.argv[2];
if (!text) {
  console.error("Usage: send-chat.ts <message>");
  process.exit(1);
}

const client = mqtt.connect(MQTT_URL, {
  clientId: "gemini-chat-" + Date.now(),
});

const cmdId = "chat_" + Date.now();

client.on("connect", () => {
  console.log("✓ Connected to MQTT WebSocket");

  // Subscribe to response
  client.subscribe([TOPIC_RES, TOPIC_STATE]);

  // Send chat command
  const cmd = {
    action: "chat",
    text: text,
    id: cmdId,
  };

  console.log("→ Sending:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));
  client.publish(TOPIC_CMD, JSON.stringify(cmd));
});

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString());

    if (topic === TOPIC_RES && data.id === cmdId) {
      if (data.success !== false) {
        console.log("✓ Message sent to Gemini");
        client.end();
        process.exit(0);
      } else {
        console.log("✗ Error:", data.error || "Unknown error");
        client.end();
        process.exit(1);
      }
    }

    if (topic === TOPIC_STATE && data.loading === false) {
      // Gemini finished responding
      console.log("✓ Gemini ready (responseCount:", data.responseCount + ")");
    }
  } catch (e) {
    // ignore parse errors
  }
});

client.on("error", (err) => {
  console.error("✗ MQTT Error:", err.message);
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log("✗ Timeout waiting for response");
  client.end();
  process.exit(1);
}, 10000);
