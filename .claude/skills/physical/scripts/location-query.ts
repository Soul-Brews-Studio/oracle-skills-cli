import { $ } from 'bun';

const MODE = process.argv[2] || 'all';

async function fetchCsv(filename: string): Promise<string> {
  const response = await $`gh api repos/laris-co/nat-location-data/contents/${filename} --jq '.content' | base64 -d`.text();
  return response;
}

if (MODE === 'current' || MODE === 'all') {
  const current = await fetchCsv('current.csv');
  console.log(current);
}

if (MODE === 'time' || MODE === 'all') {
  console.log('---TIME_AT_LOCATION---');
  const history = await fetchCsv('history.csv');
  
  // Simple CSV parser that respects quotes
  const parseCSVLine = (line: string) => {
    const res = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        // Don't add quote char to content
      } else if (char === ',' && !inQuotes) {
        res.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    res.push(current);
    return res;
  };

  const lines = history.trim().split('\n');
  const records = lines.map(line => {
    const cols = parseCSVLine(line);
    if (cols.length < 13) return null; // Skip malformed
    return {
      device: cols[0],
      updated: new Date(cols[12]) 
    };
  }).filter(r => r && r.device && (r.device.includes('iPhone') || r.device.includes('iPad')));

  if (records.length > 0) {
    // Sort by time
    records.sort((a, b) => a.updated.getTime() - b.updated.getTime());
    
    const firstSeen = records[0].updated;
    const lastSeen = records[records.length - 1].updated;
    const hoursHere = ((lastSeen.getTime() - firstSeen.getTime()) / (1000 * 60 * 60)).toFixed(1);
    
    console.log(`first_seen = ${firstSeen.toISOString().replace('T', ' ').slice(0, 19)}`);
    console.log(`last_seen = ${lastSeen.toISOString().replace('T', ' ').slice(0, 19)}`);
    console.log(`records = ${records.length}`);
    console.log(`hours_here = ${hoursHere}`);
  } else {
    console.log('No records found in history.');
  }
}
