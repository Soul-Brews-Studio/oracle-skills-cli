import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `${action}_${Date.now()}`;
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

  console.log('\n🌟 SMOOTH FLOW: New Tab → Tab ID → Badge\n');

  // 1. Create tab
  console.log('1️⃣  Creating new Gemini tab...');
  const result = await send('create_tab');
  console.log(`   ✅ Tab created: ${result.tabId}`);

  // 2. Wait for load
  console.log('2️⃣  Waiting 3 seconds for page load...');
  await new Promise(r => setTimeout(r, 3000));

  // 3. Inject badge
  console.log('3️⃣  Injecting badge to verify targeting...');
  const badge = await send('inject_badge', { tabId: result.tabId, text: 'SMOOTH!' });
  console.log(`   ✅ Badge injected: ${badge.success}`);

  console.log('\n🎉 FLOW COMPLETE!\n');
  console.log(`   Tab ID: ${result.tabId}`);
  console.log('   Check the browser - badge should say "TAB X: SMOOTH!"');

  client.end();
}

main().catch(console.error);
