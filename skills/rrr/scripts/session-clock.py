#!/usr/bin/env python3
"""Session clock — the Claude Code adapter. One implementation, not the mechanism.

Satisfies the SessionClock contract in ../HOSTS.md for hosts that store
newline-delimited transcripts with ISO `"timestamp":"..."` fields. Codex and other
harnesses should resolve the same contract from whatever they actually expose
(rollout metadata, a session API) rather than running this against a layout it was
not written for. `evidence: none` is always a valid answer.

Reads ONLY the `timestamp` field out of the host's session transcript. Message
bodies are never parsed or returned, so a 3MB transcript costs a few hundred
bytes of context instead of blowing the window. No background agent needed.

Segments on idle gaps so an overnight pause is not reported as a 19-hour
session, and emits activity beats (minutes that actually had events) rather
than evenly spaced guesses.

    session-clock.py [--gap MIN] [--beats N] [--tz OFFSET] [--all]

Exit 0 with `evidence: none` when no transcript is found — /rrr must degrade to
untimed bullets, never to invented times.
"""
import argparse
import datetime as dt
import glob
import json
import os
import sys

TS_KEY = '"timestamp":"'


def find_transcript(cwd: str) -> str | None:
    """Locate the newest transcript for this working directory."""
    encoded = "-" + cwd.lstrip("/").replace("/", "-").replace(".", "-")
    base = os.path.join(os.path.expanduser("~/.claude/projects"), encoded)
    files = sorted(glob.glob(os.path.join(base, "*.jsonl")), key=os.path.getmtime, reverse=True)
    return files[0] if files else None


def read_timestamps(path: str) -> list[str]:
    """Substring-scan for timestamps. Never json.loads a whole line: the bodies
    are the expensive part and we do not want them."""
    out = []
    with open(path, "r", errors="replace") as fh:
        for line in fh:
            i = line.find(TS_KEY)
            if i >= 0:
                out.append(line[i + len(TS_KEY): i + len(TS_KEY) + 24])
    return out


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--gap", type=int, default=60, help="idle minutes that split a segment")
    ap.add_argument("--beats", type=int, default=12, help="max activity beats to print")
    ap.add_argument("--tz", type=float, default=7.0, help="display offset, default GMT+7")
    ap.add_argument("--all", action="store_true", help="report every segment, not just the current one")
    ap.add_argument("--file", help="explicit transcript path")
    args = ap.parse_args()

    path = args.file or find_transcript(os.getcwd())
    if not path or not os.path.exists(path):
        print("evidence: none")
        return 0

    zone = dt.timezone(dt.timedelta(hours=args.tz))
    stamps = []
    for raw in read_timestamps(path):
        try:
            stamps.append(dt.datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(zone))
        except ValueError:
            continue
    if not stamps:
        print("evidence: none")
        return 0
    stamps.sort()

    # split on idle gaps so an overnight pause is not counted as session time
    segments, current = [], [stamps[0]]
    for prev, now in zip(stamps, stamps[1:]):
        if (now - prev).total_seconds() > args.gap * 60:
            segments.append(current)
            current = []
        current.append(now)
    segments.append(current)

    label = f"GMT{args.tz:+g}".replace(".0", "")
    chosen = segments if args.all else segments[-1:]

    print(f"evidence: session-clock ({os.path.basename(path)[:8]})")
    print(f"events: {len(stamps)}  segments: {len(segments)}  gap-threshold: {args.gap}m")
    for seg in chosen:
        start, end = seg[0], seg[-1]
        mins = int((end - start).total_seconds() // 60)
        print(f"\nsegment {start:%Y-%m-%d} {start:%H:%M}–{end:%H:%M} {label}  ({mins} min, {len(seg)} events)")
        beats = sorted({s.strftime("%H:%M") for s in seg})
        shown = beats[: args.beats]
        print("  beats: " + " ".join(shown) + (f"  …+{len(beats) - len(shown)} more" if len(beats) > len(shown) else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
