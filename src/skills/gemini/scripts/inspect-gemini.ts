import mqtt from 'mqtt';

const client = mqtt.connect('mqtt://localhost:1883');
const tabId = 2127157530; // Latest smooth tab

async function send(action: string, params: any = {}): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `${action}_${Date.now()}`;
    const timeout = setTimeout(() => reject(new Error('Timeout')), 10000);

    client.subscribe('claude/browser/response');
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
    client.publish('claude/browser/command', JSON.stringify({ id, action, tabId, ...params }));
  });
}

async function main() {
  await new Promise(r => client.on('connect', r));

  console.log('Getting HTML from tab', tabId, '...\n');

  const result = await send('get_html');
  const html = result.html || '';

  // Search for input-related elements
  console.log('=== SEARCHING FOR INPUT ELEMENTS ===\n');

  // Look for contenteditable
  const contentEditableMatch = html.match(/contenteditable="true"[^>]*>/gi);
  console.log('contenteditable="true" found:', contentEditableMatch?.length || 0);

  // Look for aria-label with prompt
  const ariaMatch = html.match(/aria-label="[^"]*prompt[^"]*"/gi);
  console.log('aria-label with "prompt":', ariaMatch || 'none');

  // Look for rich-textarea
  const richTextarea = html.match(/<rich-textarea[^>]*>/gi);
  console.log('rich-textarea tags:', richTextarea?.length || 0);

  // Look for textarea
  const textarea = html.match(/<textarea[^>]*>/gi);
  console.log('textarea tags:', textarea?.length || 0);

  // Look for ql-editor (Quill)
  const quill = html.match(/class="[^"]*ql-editor[^"]*"/gi);
  console.log('ql-editor class:', quill?.length || 0);

  // Look for input
  const inputs = html.match(/<input[^>]*>/gi);
  console.log('input tags:', inputs?.length || 0);

  // Show snippet around "Ask Gemini"
  const askGemini = html.indexOf('Ask Gemini');
  if (askGemini > -1) {
    console.log('\n=== SNIPPET NEAR "Ask Gemini" ===');
    console.log(html.substring(askGemini - 200, askGemini + 300));
  }

  client.end();
}

main().catch(console.error);
