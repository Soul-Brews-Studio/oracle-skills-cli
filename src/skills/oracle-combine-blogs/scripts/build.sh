#!/usr/bin/env bash
# /oracle-combine-blogs pipeline: assemble EXISTING blogs -> harden -> wordbreak -> pandoc -> typst
# Run from the book dir (must contain book.json + preamble.typ):  bash <skill>/scripts/build.sh
set -euo pipefail
cd "$(pwd)"

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SC="$SKILL_DIR/scripts"   # self-contained: harden-md.py + wordbreak.py are bundled here

[ -f book.json ]    || { echo "ERROR: no book.json in $(pwd)"; exit 1; }
[ -f preamble.typ ] || { echo "ERROR: no preamble.typ in $(pwd) (copy from $SKILL_DIR/templates and fill the cover)"; exit 1; }

PDF="$(python3 -c "import json;print(json.load(open('book.json'))['pdf_name'])")"

echo "1/6 assemble body.md (from existing blogs)"
python3 "$SKILL_DIR/scripts/assemble.py" "$(pwd)"

echo "2/6 harden headings (blank line before each)"
python3 "$SC/harden-md.py" body.md

echo "3/6 Thai word-break (ZWSP via attacut)"
uvx --from pythainlp --with attacut python3 "$SC/wordbreak.py" < body.md > body-zwsp.md

echo "4/6 pandoc MD -> typst"
pandoc body-zwsp.md -o body.typ -t typst
perl -pi -e 's/#horizontalrule/#line(length: 100%, stroke: 0.5pt + luma(200))/g' body.typ

echo "5/6 concat preamble + body"
cat preamble.typ body.typ > full.typ

echo "6/6 typst compile"
typst compile \
  --font-path /System/Library/Fonts \
  --font-path /System/Library/AssetsV2 \
  --font-path "$HOME/Library/Fonts" \
  full.typ "$PDF.pdf"

echo "DONE -> $(pwd)/$PDF.pdf"
