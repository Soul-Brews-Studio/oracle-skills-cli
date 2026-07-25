#!/usr/bin/env python3
"""dig-session.py — mine a Claude Code session .jsonl for retro/handoff writers.

Used by the /forward, /forward-bg, /rrr, /rrr-bg skills. Prints a JSON object to
stdout with real timestamps (GMT+7) so those skills never guess times.

Usage:
    python3 dig-session.py <path-to-session.jsonl>

Output (JSON):
{
  "session": "<first 8 chars of the file stem>",
  "file": "<path>",
  "first": "YYYY-MM-DD HH:MM",   # first timestamp seen
  "last":  "YYYY-MM-DD HH:MM",   # last timestamp seen
  "message_count": <int>,
  "tool_uses": <int>,
  "skills": ["awaken", "oracle-plan", ...],   # distinct /commands invoked
  "user_turns": [ {"time": "YYYY-MM-DD HH:MM", "text": "<first 100 chars>"}, ... ]
}

Only genuine human-typed user turns are listed (tool_result blocks, meta/command
stdout, and hook noise are excluded). Robust to malformed lines.
"""
import json
import os
import re
import sys
from datetime import datetime, timezone, timedelta

TZ = timezone(timedelta(hours=7))  # GMT+7 (Bangkok), matches the skills


def fmt(ts: str):
    try:
        return datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(TZ).strftime("%Y-%m-%d %H:%M")
    except Exception:
        return None


def human_text(content):
    """Return the human-typed text of a user message, or None if it's a tool result."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        for c in content:
            if isinstance(c, dict) and c.get("type") == "text":
                return c.get("text", "")
        # array with no text block (e.g. only tool_result) → not a human turn
        return None
    return None


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "usage: dig-session.py <session.jsonl>"}))
        return
    path = sys.argv[1]
    if not path or not os.path.exists(path):
        print(json.dumps({"error": f"file not found: {path}"}))
        return

    first = last = None
    msg_count = 0
    tool_uses = 0
    skills = []
    seen_skills = set()
    user_turns = []

    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                e = json.loads(line)
            except Exception:
                continue
            ts = e.get("timestamp")
            if ts:
                t = fmt(ts)
                if t:
                    first = first or t
                    last = t
            etype = e.get("type")
            if etype in ("user", "assistant"):
                msg_count += 1
            # count tool_use blocks in assistant messages
            msg = e.get("message", {})
            content = msg.get("content") if isinstance(msg, dict) else None
            if isinstance(content, list):
                for c in content:
                    if isinstance(c, dict) and c.get("type") == "tool_use":
                        tool_uses += 1
            if etype != "user":
                continue
            text = human_text(content)
            if not isinstance(text, str) or not text.strip():
                continue
            # capture /command invocations for the skills list
            for m in re.findall(r"<command-name>\s*/?([\w-]+)", text):
                if m not in seen_skills:
                    seen_skills.add(m)
                    skills.append(m)
            # skip meta / command-stdout / hook noise from the human-turn list
            head = text[:200]
            if ("<command-name>" in head or "<local-command" in head or "caveat" in head.lower()
                    or head.startswith("Base directory for this skill")
                    or head.lstrip().startswith("<")):
                continue
            when = fmt(ts) if ts else None
            snippet = " ".join(text.split())[:100]
            if snippet:
                user_turns.append({"time": when, "text": snippet})

    stem = os.path.basename(path)
    if stem.endswith(".jsonl"):
        stem = stem[:-6]
    print(json.dumps({
        "session": stem[:8],
        "file": path,
        "first": first,
        "last": last,
        "message_count": msg_count,
        "tool_uses": tool_uses,
        "skills": skills,
        "user_turns": user_turns,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
