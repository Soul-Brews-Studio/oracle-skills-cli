import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const TOPIC_CMD = 'claude/browser/command';
const TOPIC_RES = 'claude/browser/response';

const youtubeUrl = process.argv[2] || 'https://www.youtube.com/watch?v=XpHMle5Vq80';

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve) => {
    const id = `${action}_${Date.now()}`;
    const timeout = setTimeout(() => resolve({ timeout: true }), 8000);

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

  console.log('\n🎬 YOUTUBE TRANSCRIBE FLOW\n');

  // 1. Create tab
  console.log('1️⃣  Creating new Gemini tab...');
  const tab = await send('create_tab');
  console.log(`   ✅ Tab ID: ${tab.tabId}`);

  // 2. Wait
  console.log('2️⃣  Waiting 4s for load...');
  await new Promise(r => setTimeout(r, 4000));

  // 3. Badge
  console.log('3️⃣  Injecting badge...');
  await send('inject_badge', { tabId: tab.tabId, text: 'TRANSCRIBE' });

  // 4. Send transcribe request
  console.log('4️⃣  Sending transcribe request...');
  const prompt = `Please watch and transcribe this YouTube video. Provide:
1. A summary of the main points
2. Key timestamps if possible
3. Any important quotes or highlights

Video: ${youtubeUrl}`;

  await send('chat', { tabId: tab.tabId, text: prompt });
  console.log('   ✅ Request sent!');

  console.log('\n🎉 DONE!');
  console.log(`   Tab ID: ${tab.tabId}`);
  console.log(`   Video: ${youtubeUrl}`);
  console.log('   Check Gemini for transcription!\n');

  client.end();
}

main().catch(console.error);
