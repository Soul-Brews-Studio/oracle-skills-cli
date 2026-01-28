import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157509;

client.on('connect', async () => {
  console.log('Listening for ALL messages...\n');

  client.subscribe('claude/browser/#');

  const chatId = 'chatdebug_' + Date.now();

  // Send chat command
  console.log('Sending chat to tab', tabId);
  client.publish('claude/browser/command', JSON.stringify({
    id: chatId,
    action: 'chat',
    tabId,
    text: 'Hello from debug!'
  }));

  // Listen for our specific response
  client.on('message', (topic, msg) => {
    try {
      const data = JSON.parse(msg.toString());
      const shortTopic = topic.split('/').pop();

      // Show our response
      if (data.id === chatId) {
        console.log('\n=== OUR RESPONSE ===');
        console.log(JSON.stringify(data, null, 2));
      } else if (shortTopic === 'response') {
        // Show other responses too
        console.log('[response]', data.action, data.error || data.success);
      }
    } catch {}
  });

  setTimeout(() => {
    console.log('\nDone. If no response, check browser console for extension errors.');
    client.end();
  }, 8000);
});
