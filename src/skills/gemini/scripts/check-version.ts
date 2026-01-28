import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
  client.subscribe('claude/browser/status');
  console.log('Waiting for status...');
});

client.on('message', (topic, msg) => {
  const data = JSON.parse(msg.toString());
  console.log('Extension version:', data.version);
  console.log('Status:', data.status);
  client.end();
});

setTimeout(() => {
  console.log('No status received');
  client.end();
}, 3000);
