import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

const youtubeUrl = process.argv[2] || 'https://www.youtube.com/watch?v=XpHMle5Vq80';
const model = process.argv[3] || 'fast'; // fast, pro, thinking

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve) => {
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

  console.log('\n⚡ FAST TRANSCRIBE FLOW\n');

  // 1. Create tab
  console.log('1️⃣  Creating new Gemini tab...');
  const tab = await send('create_tab');
  console.log(`   ✅ Tab ID: ${tab.tabId}`);

  // 2. Wait for load
  console.log('2️⃣  Waiting 4s for load...');
  await new Promise(r => setTimeout(r, 4000));

  // 3. Select model
  console.log(`3️⃣  Selecting model: ${model}...`);
  const modelResult = await send('select_model', { tabId: tab.tabId, model });
  console.log(`   ${modelResult.timeout ? '⏱️ Timeout (may still work)' : '✅ Model selected'}`);

  // 4. Wait for model switch
  await new Promise(r => setTimeout(r, 1000));

  // 5. Send transcribe
  console.log('4️⃣  Sending transcribe request...');
  const prompt = `Transcribe this YouTube video. Give me:
1. Summary (2-3 sentences)
2. Key points (bullet list)
3. Notable quotes

Video: ${youtubeUrl}`;

  await send('chat', { tabId: tab.tabId, text: prompt });
  console.log('   ✅ Sent!');

  console.log('\n🎉 DONE!');
  console.log(`   Model: ${model}`);
  console.log(`   Tab: ${tab.tabId}`);
  console.log(`   Video: ${youtubeUrl}\n`);

  client.end();
}

main().catch(console.error);
