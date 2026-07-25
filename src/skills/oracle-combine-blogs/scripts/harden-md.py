#!/usr/bin/env python3
"""Fence-aware: ensure a BLANK LINE before every markdown heading, in place.

Writer agents trail content straight into the next heading, and cat-ing section files glues a
signature line onto the next `## …`. pandoc's blank_before_header then renders the heading as
LITERAL text. This inserts the missing blank — but ONLY outside fenced code blocks (``` and ~~~),
so it never corrupts a `#`-comment inside a code block (which a raw `re.sub` would).

Run:  python3 harden-md.py FILE.md   (edits FILE.md in place)
"""
import re, sys

HEADING = re.compile(r"^#{1,6} ")
FENCE = re.compile(r"^(`{3,}|~{3,})")


def main(path):
    lines = open(path, encoding="utf-8").read().split("\n")
    out, fence = [], False
    for ln in lines:
        if FENCE.match(ln):                  # col-0 fences only (indented blocks aren't fences here)
            fence = not fence
        if not fence and HEADING.match(ln) and out and out[-1].strip() != "":
            out.append("")
        out.append(ln)
    open(path, "w", encoding="utf-8").write("\n".join(out))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit("usage: harden-md.py FILE.md")
    main(sys.argv[1])
