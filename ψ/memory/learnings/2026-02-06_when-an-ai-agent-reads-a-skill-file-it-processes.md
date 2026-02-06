---
title: When an AI agent reads a skill file, it processes ALL content — not just the rel
tags: [skills, ai-agents, complexity, refactoring, structural-separation, oracle-skills-cli, rrr]
created: 2026-02-06
source: rrr --deep: Soul-Brews-Studio/oracle-skills-cli
---

# When an AI agent reads a skill file, it processes ALL content — not just the rel

When an AI agent reads a skill file, it processes ALL content — not just the relevant section for the current mode. A 521-line SKILL.md with "Launch 5 Parallel Agents" instructions visible in every mode caused Claude to spawn subagents even in default mode. The fix was structural: move deep mode instructions to a separate file (DEEP.md) that only gets read when explicitly requested.

Pattern: Separate complexity tiers into different files behind explicit gates. Three-valued flags (auto/on/off) beat booleans for platform features. Cut aggressively in refactors — 3 modes beats 6 modes. Let user feedback drive simplification.

AI agents don't have selective attention like humans when reading long documents. Every instruction in a skill file is "live". Structural separation is the only reliable way to gate optional complexity.

---
*Added via Oracle Learn*
