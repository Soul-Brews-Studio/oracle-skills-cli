import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157509;

client.on('connect', async () => {
  // First, let's check what selectors exist
  const checkId = 'check_' + Date.now();
  client.subscribe('claude/browser/response');

  console.log('Checking input on tab', tabId);

  client.publish('claude/browser/command', JSON.stringify({
    id: checkId,
    action: 'exec_script',
    tabId,
    code: `
      // Try different selectors
      const s1 = document.querySelector('div[aria-label="Enter a prompt here"]');
      const s2 = document.querySelector('rich-textarea [contenteditable="true"]');
      const s3 = document.querySelector('.ql-editor');
      const s4 = document.querySelector('rich-textarea');
      const s5 = document.querySelector('[contenteditable="true"]');
      const all = document.querySelectorAll('[contenteditable="true"]');

      JSON.stringify({
        'aria-label prompt': s1 ? 'FOUND: ' + s1.tagName : 'NOT FOUND',
        'rich-textarea contenteditable': s2 ? 'FOUND: ' + s2.tagName : 'NOT FOUND',
        'ql-editor': s3 ? 'FOUND: ' + s3.tagName : 'NOT FOUND',
        'rich-textarea': s4 ? 'FOUND: ' + s4.tagName : 'NOT FOUND',
        'any contenteditable': s5 ? 'FOUND: ' + s5.tagName : 'NOT FOUND',
        'all contenteditable count': all.length
      }, null, 2);
    `
  }));

  client.on('message', (topic, msg) => {
    if (topic !== 'claude/browser/response') return;
    const data = JSON.parse(msg.toString());
    if (data.id === checkId) {
      console.log('\n=== INPUT SELECTORS ===');
      try {
        console.log(JSON.parse(data.result));
      } catch {
        console.log(data);
      }
      client.end();
    }
  });

  setTimeout(() => {
    console.log('Timeout');
    client.end();
  }, 5000);
});
