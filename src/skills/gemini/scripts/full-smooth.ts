import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `${action}_${Date.now()}`;
    const timeout = setTimeout(() => resolve({ timeout: true, action }), 8000);

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

  console.log('\n🚀 FULL SMOOTH FLOW\n');

  // 1. Create tab
  console.log('1️⃣  Creating new Gemini tab...');
  const tab = await send('create_tab');
  console.log(`   ✅ Tab ID: ${tab.tabId}`);

  // 2. Wait
  console.log('2️⃣  Waiting 4s for load...');
  await new Promise(r => setTimeout(r, 4000));

  // 3. Badge
  console.log('3️⃣  Injecting badge...');
  await send('inject_badge', { tabId: tab.tabId, text: 'SMOOTH!' });
  console.log('   ✅ Badge injected');

  // 4. Chat
  console.log('4️⃣  Sending chat...');
  const chatResult = await send('chat', {
    tabId: tab.tabId,
    text: 'Say "TAB PRECISION SMOOTH!" if you received this message.'
  });
  console.log('   ✅ Chat sent (response may timeout, check tab)');

  // 5. Done
  console.log('\n🎉 COMPLETE!');
  console.log(`   Tab ID: ${tab.tabId}`);
  console.log('   Check the new tab for Gemini response!\n');

  client.end();
}

main().catch(console.error);
