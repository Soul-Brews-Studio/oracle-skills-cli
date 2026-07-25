#!/usr/bin/env python3
"""Assemble body.md for /oracle-combine-blogs from EXISTING blog files (no re-generation).

Reads book.json in the target dir (or the dir given as argv[1]):

  {
    "pdf_name": "2026-07-09_my-book",       # output stem (also the PDF filename)
    "hook":  "00-hook.md",                   # optional, relative to book dir; included verbatim
    "close": "99-close.md",                  # optional, relative to book dir; included verbatim
    "chapters": [
      {"file": "/abs/path/to/blog.md", "heading": "# บทที่ ๑ — Title"},
      ...
    ]
  }

Each chapter file is a finished blog post. We: strip YAML frontmatter (leading '---'..'---'),
drop its first H1 title line, truncate at the LAST standalone '---' (removes the trailing
signature block), then prepend the given chapter heading. Decorative mid-content '---' rules
are preserved. hook/close are hand-written clean markdown and are included verbatim (their own
'# ...' H1 becomes a level-1 chapter heading in the book).
"""
import json
import os
import sys


def strip_blog(path):
    lines = open(path, encoding='utf-8').read().split('\n')
    # drop YAML frontmatter: leading '---' ... next '---'
    if lines and lines[0].strip() == '---':
        try:
            end = next(i for i in range(1, len(lines)) if lines[i].strip() == '---')
            lines = lines[end + 1:]
        except StopIteration:
            pass
    # truncate at the LAST standalone '---' (signature separator)
    rule_idx = [i for i, l in enumerate(lines) if l.strip() == '---']
    if rule_idx:
        lines = lines[:rule_idx[-1]]
    # drop the first H1 title line
    out, dropped = [], False
    for l in lines:
        if not dropped and l.startswith('# '):
            dropped = True
            continue
        out.append(l)
    return '\n'.join(out).strip('\n')


def main():
    book_dir = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.getcwd()
    cfg = json.load(open(os.path.join(book_dir, 'book.json'), encoding='utf-8'))

    parts = []
    if cfg.get('hook'):
        parts.append(open(os.path.join(book_dir, cfg['hook']), encoding='utf-8').read().strip('\n'))
    for ch in cfg['chapters']:
        body = strip_blog(ch['file'])
        parts.append(ch['heading'].rstrip() + '\n\n' + body)
    if cfg.get('close'):
        parts.append(open(os.path.join(book_dir, cfg['close']), encoding='utf-8').read().strip('\n'))

    combined = '\n\n'.join(parts) + '\n'
    open(os.path.join(book_dir, 'body.md'), 'w', encoding='utf-8').write(combined)
    print(f'wrote body.md — {len(cfg["chapters"])} chapters, {len(combined.split())} words')


if __name__ == '__main__':
    main()
