import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157509;

client.on('connect', async () => {
  console.log('Trying to chat to tab', tabId);

  const id = 'chat_' + Date.now();
  client.subscribe('claude/browser/#');

  // Send chat command
  client.publish('claude/browser/command', JSON.stringify({
    id,
    action: 'chat',
    tabId,
    text: 'Hello from Claude! Can you say "Tab precision works perfectly!"'
  }));

  // Listen for response
  client.on('message', (topic, msg) => {
    console.log('[' + topic + ']', msg.toString().slice(0, 300));
    if (topic === 'claude/browser/response') {
      const data = JSON.parse(msg.toString());
      if (data.id === id) {
        console.log('\n=== CHAT RESULT ===');
        console.log(JSON.stringify(data, null, 2));
      }
    }
  });

  // Give it time
  setTimeout(() => {
    console.log('\nDone waiting. Check the tab!');
    client.end();
  }, 5000);
});
