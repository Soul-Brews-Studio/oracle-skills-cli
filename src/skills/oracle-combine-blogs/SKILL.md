---
name: oracle-combine-blogs
description: "Combine EXISTING finished blog posts into ONE mini-book PDF — assemble, don't re-generate. Strips each blog's frontmatter + title + signature, stitches them as chapters with a hook/close, renders pandoc→typst with Thai word-break. Use when you ALREADY have several polished posts (in ψ/writing/blog or anywhere) and want them bound into a single book WITHOUT rewriting the prose. TRIGGER: 'รวมบล็อกเป็นเล่ม', 'combine blogs into a book', 'รวมโพสต์เป็น mini-book', 'bind these posts', '/oracle-combine-blogs'. DO NOT TRIGGER for: writing NEW book content from a session (use /oracle-booklet or /oracle-write-mini-book-v3); a 1-page cheatsheet (use /oracle-cheatsheet)."
argument-hint: "<blog files or topic> — the finished posts to bind into one book"
hidden: true
metadata:
  internal: true
---

# /oracle-combine-blogs — bind finished posts into one mini-book

> Born 2026-07-09 binding 4 Claude-Code channel posts into "ช่องสัญญาณถึง Claude" (25pp).
> The point: when the prose already exists and the human LIKES it, **assemble — never re-generate.**
> Re-drafting risks losing the quality that earned the "combine these" request.

## When to use vs the writer skills

| You have… | Use |
|---|---|
| Finished posts you want bound, prose unchanged | **this skill** (assemble) |
| A session's work but no written prose yet | `/oracle-booklet` or `/oracle-write-mini-book-v3` (generate) |
| One page of commands | `/oracle-cheatsheet` |

## Pipeline

```
assemble.py (strip + stitch existing blogs) → harden-md → wordbreak (attacut ZWSP)
  → pandoc MD→typst → cat preamble.typ + body.typ → typst compile
```

Self-contained: `harden-md.py` + `wordbreak.py` are bundled in `scripts/` (works even on a
machine without oracle-booklet installed). The two helpers originate from `/oracle-booklet`.

## Steps

1. **Pick the posts + order.** Decide a narrative arc (e.g. story → mechanism → comparison →
   deep-dive), not just chronological. Note each post's absolute path.

2. **Make the book dir** under `ψ/writing/mini-books/<date>_<slug>/`.

3. **Write `book.json`** in that dir (see `templates/book.json.example`):
   - `pdf_name` — output stem (also the PDF filename). Convention: same as dir basename.
   - `hook` / `close` — filenames (relative to book dir) of hand-written `# บทเปิด` / `# ปิดเล่ม`
     pages. Optional but recommended — they frame WHY these posts belong together.
   - `chapters[]` — each `{ "file": "<abs path to blog.md>", "heading": "# บทที่ N — Title" }`.
     The heading becomes a level-1 chapter (page-break + rule). Chapter titles can be shorter
     than the blog's own title.

4. **Write `00-hook.md` + `99-close.md`** — start each with a level-1 `# บทเปิด` / `# ปิดเล่ม`.
   The hook states the thread connecting the posts; the close synthesizes (don't just recap).
   Author is the oracle (an AI — Rule 6, never pretend to be human).

5. **Copy `templates/preamble.typ`** into the book dir and fill EVERY `{{PLACEHOLDER}}`:
   `{{EMOJI}}` (cover + byline), `{{TITLE}}`, `{{SUBTITLE}}` (1–2 lines: what + the angle),
   `{{ORACLE}}`, `{{HUMAN}}`, `{{DATE}}`, `{{PROOF}}` (e.g. "อ้าง source จริงทุกบรรทัด"),
   `{{ACCENT}}` (one hex, appears 4×). Pick an emoji/accent DIFFERENT from sibling books so
   readers don't confuse them.

6. **Build:** from the book dir, `bash ~/.claude/skills/oracle-combine-blogs/scripts/build.sh`

7. **Verify the PDF** — Read pages 1–3 (cover + สารบัญ + hook) and one page with a big table +
   code block. Check: Thai word-break, code line-refs intact, table zebra, chapter rules.

8. **Commit** source + PDF; skip regenerable intermediates (`body.md`, `body-zwsp.md`,
   `body.typ`, `full.typ`). Re-running `build.sh` reproduces them.

## How assemble.py strips each blog (so you can trust it)

- Drops YAML frontmatter (leading `---` … next `---`).
- Truncates at the **last** standalone `---` line → removes the trailing signature block.
  Decorative mid-content `---` rules are kept (they become thin rules in the PDF).
- Drops the blog's first `# H1` title line; your `book.json` heading replaces it.
- `hook`/`close` are included **verbatim** — write them clean, no frontmatter.

## Gotchas (learned)

- **Heading levels:** blog `##`/`###` are preserved as section/subsection. Your chapter heading
  MUST be level-1 `#` so it gets the page-break + big-title style. Don't use `##` for chapters.
- **Fonts:** if the cover falls back to a boxy font, the `--font-path` for AssetsV2 (Sarabun) or
  ~/Library/Fonts (Fira Code) is missing — build.sh already passes all three.
- **pandoc turns `---` into `#horizontalrule`** which typst doesn't know — build.sh rewrites it to
  a real `#line(...)`. Keep that sed/perl step.
- **Edit the source blog, not body.md** — body.md is regenerated every build.
