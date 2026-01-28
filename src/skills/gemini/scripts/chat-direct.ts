import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157506;
const message = process.argv[2] || 'Hello from Claude! Tab precision works!';

client.on('connect', () => {
  console.log('Connected. Sending chat to tab', tabId);

  // Subscribe to all responses for debugging
  client.subscribe('claude/browser/#');

  const cmd = {
    id: 'chat_' + Date.now(),
    action: 'chat',
    tabId: tabId,
    text: message
  };

  console.log('Command:', JSON.stringify(cmd, null, 2));
  client.publish('claude/browser/command', JSON.stringify(cmd));

  // Just wait a bit to see any responses
  setTimeout(() => {
    console.log('Chat sent! Check the tab.');
    client.end();
  }, 3000);
});

client.on('message', (topic, msg) => {
  console.log('MSG [' + topic + ']:', msg.toString().slice(0, 200));
});
