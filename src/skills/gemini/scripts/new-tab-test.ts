import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `test_${Date.now()}`;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

    const handler = (topic: string, msg: Buffer) => {
      if (topic !== TOPIC_RES) return;
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

  console.log('\n=== NEW TAB TEST ===\n');

  // Create new tab
  console.log('Creating new Gemini tab...');
  const result = await send('create_tab');

  console.log('\nRESULT:');
  console.log('  Tab ID:', result.tabId);
  console.log('  URL:', result.url);
  console.log('  Success:', result.success);

  // Wait and inject badge
  console.log('\nWaiting 3s for load...');
  await new Promise(r => setTimeout(r, 3000));

  console.log('Injecting badge to verify...');
  const badge = await send('inject_badge', { tabId: result.tabId, text: 'NEW TAB!' });
  console.log('  Badge injected:', badge.success);

  console.log('\n=== DONE ===');
  console.log('Tab ID:', result.tabId);

  client.end();
}

main().catch(console.error);
