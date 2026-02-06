# Structural Separation Prevents Accidental Complexity

**Date**: 2026-02-06
**Context**: oracle-skills-cli /rrr skill refactoring
**Confidence**: High

## Key Learning

When an AI agent reads a skill file, it processes ALL content — not just the relevant section for the current mode. A 521-line SKILL.md with "Launch 5 Parallel Agents" instructions visible in every mode caused Claude to spawn subagents even in default mode. The fix wasn't better documentation or clearer headers — it was structural: move the deep mode instructions to a separate file (DEEP.md) that only gets read when explicitly requested.

This extends beyond skills to any configuration or instruction file consumed by AI agents. If you have optional complexity tiers, put them in separate files behind explicit gates rather than in conditional sections of a shared file.

## The Pattern

```
# BAD: All modes in one file
SKILL.md (521 lines)
  - Default mode
  - --detail mode
  - --deep mode (Launch 5 Parallel Agents) ← agent sees this and spawns agents

# GOOD: Complexity extracted
SKILL.md (109 lines)
  - Default mode
  - --detail mode
  - --deep: "Read DEEP.md" ← agent only reads DEEP.md when --deep is passed

DEEP.md (118 lines)
  - 5 parallel agent instructions
```

Also applies to config:
- Three-valued flags (auto/on/off) > booleans for platform features
- Cut aggressively in refactors — 3 modes beats 6 modes
- Let user feedback drive simplification ("too complex?" → cut)

## Why This Matters

AI agents don't have the same selective attention humans do when reading long documents. Every instruction in a skill file is "live" and may be followed. Structural separation is the only reliable way to gate optional complexity.

## Tags

`skills`, `ai-agents`, `complexity`, `refactoring`, `oracle-skills-cli`, `rrr`
