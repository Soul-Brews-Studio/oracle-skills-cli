#!/usr/bin/env python3
"""
Locate the transcript of the CURRENTLY RUNNING session and emit its user-message
timeline. Engine-aware: Claude Code and Codex CLI store sessions differently.

Why this exists
---------------
The previous miner assumed one engine. It resolved ~/.claude/projects/<encoded>/
and took the newest .jsonl. On a Codex body that directory still exists whenever
the same oracle was ever driven by Claude, so the miner selected a *different
engine's previous session*, printed plausible rows, and exited 0. The retro then
carried another body's timestamps with nothing to signal it. Missing data is
visible; misattributed data is not.

Contract
--------
- The engine is decided by live environment variables, never by which transcript
  directory happens to exist on disk.
- The transcript must be provably the running session. If that cannot be proven,
  this exits non-zero with a message. It never falls back to "newest".

Exit codes
----------
  0  rows emitted
  2  cannot prove the current session (wrong/absent env, no unique match)
  3  session located but it contains no user messages

Usage
-----
  session-timeline.py [ORACLE_ROOT] [--locate-only] [--tz +7]
"""
import glob
import json
import os
import sys
from datetime import datetime, timedelta, timezone

# Windows Thai locale: stdout defaults to cp874 and mangles Thai snippets.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

args = [a for a in sys.argv[1:] if not a.startswith("--")]
flags = {a for a in sys.argv[1:] if a.startswith("--")}
tz_hours = 7
for f in list(flags):
    if f.startswith("--tz"):
        tz_hours = int(f.split("=", 1)[1]) if "=" in f else 7
TZ = timezone(timedelta(hours=tz_hours))
ROOT = os.path.realpath(args[0] if args else os.getcwd())


def die(msg, code=2):
    print(f"SESSION_LOCATE_FAILED: {msg}", file=sys.stderr)
    sys.exit(code)


def locate_claude():
    """Claude Code names the transcript after the session id, so no search."""
    sid = os.environ.get("CLAUDE_CODE_SESSION_ID", "").strip()
    if not sid:
        die("running under Claude Code but CLAUDE_CODE_SESSION_ID is unset")
    encoded = "-" + ROOT.lstrip("/").replace("/", "-").replace(".", "-")
    path = os.path.join(os.environ["HOME"], ".claude", "projects", encoded, f"{sid}.jsonl")
    if not os.path.exists(path):
        die(f"session {sid[:8]} has no transcript at {path}")
    return {"engine": "claude-code", "session_id": sid, "file": path, "cwd": ROOT}


def locate_codex():
    """
    Codex writes one rollout per session under ~/.codex/sessions/YYYY/MM/DD/.
    Several rollouts can share a session_id (a subagent/guardian record carries
    the same session_id but a different payload.id), so match on payload.id.
    """
    sid = os.environ.get("CODEX_SESSION_ID", "").strip()
    if not sid:
        die("running under Codex but CODEX_SESSION_ID is unset")
    thread = os.environ.get("CODEX_THREAD_ID", "").strip()
    if thread and thread != sid:
        die(f"CODEX_THREAD_ID ({thread[:8]}) != CODEX_SESSION_ID ({sid[:8]})")

    hits = []
    for path in glob.glob(os.path.join(os.environ["HOME"], ".codex", "sessions", "*", "*", "*", "rollout-*.jsonl")):
        try:
            # Rollouts reach tens of MB; session_meta is always the first line.
            with open(path, encoding="utf-8") as fh:
                meta = json.loads(fh.readline())
        except Exception:
            continue
        if meta.get("type") != "session_meta":
            continue
        p = meta.get("payload") or {}
        if p.get("id") != sid:
            continue
        if os.path.realpath(p.get("cwd") or "") != ROOT:
            continue
        # Reject the guardian/subagent record when the fields are present.
        if p.get("source") not in (None, "cli"):
            continue
        if p.get("thread_source") not in (None, "user"):
            continue
        hits.append(path)

    if not hits:
        die(f"no rollout with payload.id == {sid[:8]} under cwd {ROOT}")
    if len(hits) > 1:
        die(f"{len(hits)} rollouts match session {sid[:8]}; refusing to guess")
    return {"engine": "codex", "session_id": sid, "file": hits[0], "cwd": ROOT}


# Engine comes from the live process, not from what exists on disk.
if os.environ.get("CODEX_SESSION_ID"):
    found = locate_codex()
elif os.environ.get("CLAUDE_CODE_SESSION_ID") or os.environ.get("CLAUDECODE"):
    found = locate_claude()
else:
    die("no engine session id in the environment (CLAUDE_CODE_SESSION_ID / CODEX_SESSION_ID)")

if "--locate-only" in flags:
    print(json.dumps(found, ensure_ascii=False))
    sys.exit(0)

print(f"SESSION_FILE: {found['file']}", file=sys.stderr)
print(f"ENGINE: {found['engine']}  SESSION: {found['session_id'][:8]}", file=sys.stderr)

# Text a harness injects as a user turn although no human typed it. Both engines
# do this; the markers differ, so the union is checked for both. The upstream
# miner tested "<command-name>" as a substring of the opening 200 characters
# rather than as a prefix — a slash command arrives as
# "<command-message>recap</command-message><command-name>/recap</command-name>",
# so a prefix test alone lets it through. Keep the substring test.
NOISE_ANYWHERE = (
    "<command-name>", "<command-message>", "<local-command-caveat>",
    "<skill>", "<skills_instructions>", "<user_instructions>",
    "<environment_context>", "<INSTRUCTIONS>", "<system-reminder>",
)
NOISE_PREFIX = (
    "# AGENTS.md instructions", "Base directory for this skill:",
)


def is_noise(text):
    head = text[:200]
    if any(marker in head for marker in NOISE_ANYWHERE):
        return True
    return text.lstrip().startswith(NOISE_PREFIX)


def rows_claude(path):
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                m = json.loads(line)
            except Exception:
                continue
            if m.get("type") != "user" or "message" not in m:
                continue
            c = m["message"].get("content", "")
            if isinstance(c, list):
                c = next((x.get("text", "") for x in c if isinstance(x, dict) and x.get("type") == "text"), "")
            yield m.get("timestamp"), c


def rows_codex(path):
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                m = json.loads(line)
            except Exception:
                continue
            p = m.get("payload") or {}
            if m.get("type") != "response_item" or p.get("type") != "message" or p.get("role") != "user":
                continue
            c = p.get("content", "")
            if isinstance(c, list):
                c = " ".join(x.get("text", "") for x in c if isinstance(x, dict))
            yield m.get("timestamp"), c


emitted = 0
for ts, content in (rows_codex if found["engine"] == "codex" else rows_claude)(found["file"]):
    if not ts or not isinstance(content, str) or not content.strip():
        continue
    if is_noise(content):
        continue
    dt = datetime.fromisoformat(ts.replace("Z", "+00:00")).astimezone(TZ)
    print(f"{dt.strftime('%Y-%m-%d %H:%M')} | {content[:80].replace(chr(10), ' ')}")
    emitted += 1

print(f"ROWS: {emitted}", file=sys.stderr)
if emitted == 0:
    sys.exit(3)
