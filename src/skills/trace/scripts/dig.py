#!/usr/bin/env python3
"""Session goldminer — scan Claude Code .jsonl files for session timeline."""
import json, os, glob, sys
from datetime import datetime, timedelta

project_dirs = [d for d in os.environ.get('PROJECT_DIRS', '').split(':') if d]
count = int(sys.argv[1]) if len(sys.argv) > 1 else 10
bkk = timedelta(hours=7)

# Get .jsonl files across all project dirs, deduplicate by basename, take N most recent
seen = {}
for d in project_dirs:
    for f in glob.glob(os.path.join(d, '*.jsonl')):
        base = os.path.basename(f)
        if base not in seen or os.path.getmtime(f) > os.path.getmtime(seen[base]):
            seen[base] = f
all_files = list(seen.values())
files = sorted(all_files, key=lambda f: os.path.getmtime(f), reverse=True)[:count]

# Load sessions-index from all dirs
index_map = {}
for d in project_dirs:
    try:
        with open(os.path.join(d, 'sessions-index.json')) as f:
            for e in json.load(f).get('entries', []):
                index_map[e['sessionId']] = e
    except: pass

sessions = []
for fp in files:
    sid = os.path.basename(fp).replace('.jsonl', '')
    first_ts = last_ts = None
    branch = summary_text = None
    is_sidechain = False
    real_human = []
    assistant_count = 0

    with open(fp) as fh:
        for line in fh:
            try: obj = json.loads(line)
            except: continue
            ts = obj.get('timestamp')
            if ts:
                if not first_ts or ts < first_ts: first_ts = ts
                if not last_ts or ts > last_ts: last_ts = ts
            t = obj.get('type', '')
            if t == 'summary':
                summary_text = obj.get('summary', '')
                branch = obj.get('gitBranch', '')
                is_sidechain = obj.get('isSidechain', False)
            elif t == 'assistant':
                assistant_count += 1
            elif t == 'user':
                msg = obj.get('message', {})
                content = msg.get('content', [])
                text = ''
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get('type') == 'text':
                            text = c.get('text', '').strip()
                            break
                elif isinstance(content, str):
                    text = content.strip()
                if text and len(text) > 5 and not text.startswith('[Request interrupted'):
                    real_human.append(text[:80])

    if not first_ts: continue

    # Convert timestamps to GMT+7
    def to_gmt7(iso):
        try:
            dt = datetime.fromisoformat(iso.replace('Z', '+00:00'))
            return (dt + bkk).strftime('%Y-%m-%d %H:%M')
        except: return iso

    dur_min = 0
    if first_ts and last_ts:
        try:
            t1 = datetime.fromisoformat(first_ts.replace('Z', '+00:00'))
            t2 = datetime.fromisoformat(last_ts.replace('Z', '+00:00'))
            dur_min = int((t2 - t1).total_seconds() / 60)
        except: pass

    # Prefer index summary over first prompt
    idx = index_map.get(sid, {})
    final_summary = idx.get('summary') or summary_text or (real_human[0] if real_human else 'No summary')
    final_branch = branch or idx.get('gitBranch') or 'unknown'

    sessions.append({
        'sessionId': sid[:12],
        'startGMT7': to_gmt7(first_ts),
        'endGMT7': to_gmt7(last_ts),
        'durationMin': dur_min,
        'realHumanMessages': len(real_human),
        'assistantMessages': assistant_count,
        'firstPrompt': real_human[0] if real_human else None,
        'gitBranch': final_branch,
        'summary': final_summary[:80],
        'isSidechain': is_sidechain,
    })

sessions.sort(key=lambda s: s['startGMT7'], reverse=True)
print(json.dumps(sessions, indent=2))
