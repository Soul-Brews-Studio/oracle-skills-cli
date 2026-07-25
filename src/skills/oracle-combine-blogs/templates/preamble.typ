// ===== oracle-combine-blogs preamble template =====
//   FILL every {{PLACEHOLDER}} in the cover block below, then build.sh does:
//   harden -> wordbreak -> pandoc MD->typst -> cat preamble + body -> typst compile
// Fonts (macOS): Sarabun under AssetsV2, Fira Code + IBM Plex Sans Thai Looped under ~/Library/Fonts.
// ACCENT color: pick one hex and use it in all 4 spots marked {{ACCENT}} (e.g. #2c3e50 navy, #c0392b red).

#set text(font: ("IBM Plex Sans Thai Looped", "Sarabun"), lang: "th")

// --- Cover page (NO page number) ---
#set page(paper: "a4", margin: 2.2cm)
#line(length: 100%, stroke: 3pt + rgb("{{ACCENT}}"))
#v(6em)
#align(center, text(size: 46pt)[{{EMOJI}}])
#v(2em)
#align(center, text(size: 32pt, weight: "bold", fill: rgb("#1a1a2e"))[{{TITLE}}])
#v(1.2em)
#align(center, text(size: 13pt, fill: luma(100))[{{SUBTITLE}}])
#v(3em)
#align(center, text(size: 12pt, weight: "bold", fill: rgb("{{ACCENT}}"))[
  {{ORACLE}} {{EMOJI}} (AI, ไม่ใช่คน) — จาก {{HUMAN}}
])
#v(0.5em)
#align(center, text(size: 10pt, fill: luma(140))[{{DATE}} · {{PROOF}} · mini-book])
#v(1fr)
#line(length: 100%, stroke: 3pt + rgb("{{ACCENT}}"))

// --- Content pages (numbered, start at 1) ---
#set page(numbering: "1", fill: white, margin: (top: 2.5cm, bottom: 2.5cm, left: 3cm, right: 3cm))
#counter(page).update(1)
#pagebreak()

#set text(size: 11.5pt)
#set par(leading: 1.5em, justify: false)
#set block(spacing: 2em)

// TOC — chapters only (level 1)
#outline(title: "สารบัญ", depth: 1, indent: auto)
#pagebreak()

// L1 = chapter — page break before, big title with rule
#show heading.where(level: 1): it => {
  pagebreak(weak: true)
  v(2em)
  set text(size: 26pt, weight: "bold", fill: rgb("#1a1a2e"))
  it
  v(0.4em)
  line(length: 100%, stroke: 2.5pt + rgb("{{ACCENT}}"))
  v(1.2em)
}

// L2 = section heading with colored rule line
#show heading.where(level: 2): it => {
  v(1.2em)
  line(length: 100%, stroke: 1.5pt + rgb("{{ACCENT}}"))
  v(0.6em)
  set text(size: 17pt, weight: "bold", fill: rgb("#1a1a2e"))
  it
  v(0.8em)
}

// L3 = subsection
#show heading.where(level: 3): it => {
  v(0.8em)
  set text(size: 13pt, weight: "bold", fill: rgb("{{ACCENT}}"))
  it
  v(0.4em)
}

#show raw.where(block: true): it => block(fill: rgb("#f6f8fa"), stroke: 0.5pt + luma(200), inset: 12pt, radius: 4pt, width: 100%, text(font: "Fira Code", size: 8.5pt, it))
#show raw.where(block: false): it => box(fill: rgb("#f0f0f0"), inset: (x: 3pt, y: 1.5pt), radius: 2pt, text(font: "Fira Code", size: 9pt, fill: rgb("#36454f"), it))
#show strong: it => text(weight: "bold", fill: rgb("#1a1a2e"), it)
#show quote.where(block: true): it => block(fill: rgb("#f0f4f8"), stroke: (left: 3pt + rgb("#3498db")), inset: (left: 16pt, right: 12pt, top: 10pt, bottom: 10pt), radius: (right: 4pt), it)
#set table(stroke: 0.5pt + luma(180), fill: (_, r) => if r == 0 { rgb("#2c3e50") } else if calc.odd(r) { rgb("#f8f9fa") } else { white }, inset: 10pt)
#show table.cell: it => { set text(size: 9.5pt); if it.y == 0 { align(center, text(fill: white, weight: "bold", it)) } else { align(left, it) } }
