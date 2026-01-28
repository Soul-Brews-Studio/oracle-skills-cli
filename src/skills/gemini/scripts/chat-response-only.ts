import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157509;

client.on('connect', async () => {
  // Subscribe ONLY to response topic (not command)
  client.subscribe('claude/browser/response');

  const chatId = 'chat_response_' + Date.now();
  console.log('Chat ID:', chatId);
  console.log('Sending chat to tab', tabId, '...\n');

  client.publish('claude/browser/command', JSON.stringify({
    id: chatId,
    action: 'chat',
    tabId,
    text: 'Say: Tab precision works!'
  }));

  // Show ALL responses
  client.on('message', (topic, msg) => {
    const data = JSON.parse(msg.toString());
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.id === chatId) {
      console.log('\n^^^ THIS IS OUR CHAT RESPONSE ^^^');
      if (data.error) console.log('ERROR:', data.error);
      if (data.success) console.log('SUCCESS:', data.sent);
    }
  });

  setTimeout(() => {
    console.log('\nTimeout - extension may not be responding to chat');
    client.end();
  }, 10000);
});
