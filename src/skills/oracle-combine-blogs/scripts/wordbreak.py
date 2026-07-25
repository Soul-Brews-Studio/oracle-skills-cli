#!/usr/bin/env python3
"""Insert ZWSP (U+200B) at Thai word boundaries so typst breaks lines correctly.
attacut engine (better Thai segmentation), newmm fallback. Skips inline code (single- AND
double-backtick) and fenced blocks (``` and ~~~). Reads stdin, writes stdout.

Run:  uvx --from pythainlp --with attacut python3 wordbreak.py < in.md > out.md
"""
import sys, re
from pythainlp.tokenize import word_tokenize

ZWSP = "​"
TH = r"฀-๿"
FENCE = re.compile(r"^(`{3,}|~{3,})")           # ``` or ~~~ fences
INLINE = re.compile(r"(``[^`]+``|`[^`]+`)")     # double- before single-backtick (longest wins)


def has_thai(t): return bool(re.search(f"[{TH}]", t))


def tok(s):
    try:
        return word_tokenize(s, engine="attacut")
    except Exception:
        return word_tokenize(s, engine="newmm")


def seg(part):
    return "".join(
        ZWSP.join(tok(s)) if has_thai(s) else s
        for s in re.split(f"([{TH}]+)", part)
    )


def line(ln):
    if not has_thai(ln):
        return ln
    # keep inline `code` / ``code`` runs intact
    return "".join(x if x.startswith("`") else seg(x) for x in INLINE.split(ln))


def main():
    fence = False
    for raw in sys.stdin:
        s = raw.rstrip("\n")
        if FENCE.match(s):                   # col-0 fences only
            fence = not fence
            print(s)
            continue
        print(s if fence else line(s))


if __name__ == "__main__":
    main()
