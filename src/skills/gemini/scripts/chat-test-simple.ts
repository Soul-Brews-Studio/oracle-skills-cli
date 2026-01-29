import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  client.subscribe('claude/browser/#');

  console.log('Sending chat: "Say PRECISION if you can hear me"');

  client.publish('claude/browser/command', JSON.stringify({
    id: 'test_' + Date.now(),
    action: 'chat',
    tabId: 2127157539,
    text: 'Say PRECISION if you can hear me'
  }));

  // Don't wait for response, just let it go
  setTimeout(() => {
    console.log('Command sent! Check Gemini tab for response.');
    client.end();
  }, 2000);
});

client.on('message', (topic, msg) => {
  const data = JSON.parse(msg.toString());
  console.log('[' + topic.split('/').pop() + ']', JSON.stringify(data).slice(0, 100));
});
