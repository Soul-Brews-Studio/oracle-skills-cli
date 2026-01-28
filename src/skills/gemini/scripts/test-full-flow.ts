import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const TOPIC_CMD = 'claude-browser-proxy/command';
const TOPIC_RES = 'claude-browser-proxy/response';

function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `test_${Date.now()}`;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

    const handler = (topic: string, msg: Buffer) => {
      const data = JSON.parse(msg.toString());
      if (data.id === id) {
        clearTimeout(timeout);
        client.off('message', handler);
        resolve(data);
      }
    };
    client.on('message', handler);
    client.publish(TOPIC_CMD, JSON.stringify({ id, action, ...params }));
  });
}

async function main() {
  await new Promise(r => client.on('connect', r));
  client.subscribe(TOPIC_RES);

  console.log('\n=== FULL FLOW TEST ===\n');

  // 1. Create new tab
  console.log('1. Creating new tab...');
  const createResult = await send('create_tab');
  const tabId = createResult.tabId;
  console.log(`   → TAB ID: ${tabId}`);

  // 2. Wait for page load
  console.log('2. Waiting 4s for page load...');
  await new Promise(r => setTimeout(r, 4000));

  // 3. Inject badge to verify targeting
  console.log('3. Injecting badge to verify...');
  const badgeResult = await send('inject_badge', { tabId, text: 'TARGET' });
  console.log(`   → Badge: ${badgeResult.success ? 'OK' : 'FAIL'}`);

  // 4. Send chat to THAT specific tab
  console.log('4. Sending chat to tabId ' + tabId + '...');
  const chatResult = await send('chat', { tabId, text: 'Say exactly: "Tab precision works!"' });
  console.log(`   → Chat sent: ${chatResult.success ? 'OK' : 'FAIL'}`);
  console.log(`   → Used tabId: ${chatResult.tabId}`);

  console.log('\n=== DONE - Check the new tab! ===\n');
  client.end();
}

main().catch(console.error);
