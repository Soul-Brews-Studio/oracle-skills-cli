import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `${action}_${Date.now()}`;
    const timeout = setTimeout(() => reject(new Error('Timeout ' + action)), 5000);

    const handler = (topic: string, msg: Buffer) => {
      if (topic !== 'claude/browser/response') return;
      const data = JSON.parse(msg.toString());
      if (data.id === id) {
        clearTimeout(timeout);
        client.off('message', handler);
        resolve(data);
      }
    };
    client.on('message', handler);
    client.publish('claude/browser/command', JSON.stringify({ id, action, ...params }));
  });
}

async function main() {
  await new Promise(r => client.on('connect', r));
  client.subscribe('claude/browser/response');
  client.subscribe('claude/browser/status');

  console.log('=== EXTENSION CHECK ===\n');

  // Check status (retained message)
  console.log('Checking status...');
  await new Promise(r => setTimeout(r, 500));

  // Try list_tabs
  try {
    console.log('Trying list_tabs...');
    const tabs = await send('list_tabs');
    console.log('✓ list_tabs works! Found', tabs.count, 'tabs');
    tabs.tabs?.forEach((t: any) => console.log('  -', t.id, t.title?.slice(0, 30)));
  } catch (e: any) {
    console.log('✗ list_tabs:', e.message);
  }

  // Try create_tab
  try {
    console.log('\nTrying create_tab...');
    const tab = await send('create_tab');
    console.log('✓ create_tab works! tabId:', tab.tabId);

    // Try inject_badge on new tab
    await new Promise(r => setTimeout(r, 2000));
    console.log('\nTrying inject_badge...');
    const badge = await send('inject_badge', { tabId: tab.tabId, text: 'TEST' });
    console.log('✓ inject_badge works!');

    // Try chat on new tab
    console.log('\nTrying chat...');
    const chat = await send('chat', { tabId: tab.tabId, text: 'Hello!' });
    console.log('✓ chat result:', JSON.stringify(chat));
  } catch (e: any) {
    console.log('✗', e.message);
  }

  client.end();
}

main().catch(console.error);
