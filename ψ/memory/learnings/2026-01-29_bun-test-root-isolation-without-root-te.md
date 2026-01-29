---
title: **Bun test root isolation**: Without `root = "./test"` in bunfig.toml, bun test 
tags: [bun, testing, bunfig, isolation, monorepo]
created: 2026-01-29
source: /oracle-skills-cli session 2026-01-29
---

# **Bun test root isolation**: Without `root = "./test"` in bunfig.toml, bun test 

**Bun test root isolation**: Without `root = "./test"` in bunfig.toml, bun test searches parent directories and can pick up tests from sibling repos. Always set `root` to restrict test discovery to the current project. This is especially important in monorepo or ghq-style directory structures where multiple projects share a parent directory.

---
*Added via Oracle Learn*
