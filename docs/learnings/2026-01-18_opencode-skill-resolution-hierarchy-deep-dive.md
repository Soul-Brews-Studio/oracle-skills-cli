# OpenCode Skill Resolution: The Hierarchy of Shadows

**Date**: 2026-01-18
**Context**: Debugging `oracle-skills-cli` v1.2.0 -> v1.2.7 integration with Soul-Brews-Studio/opencode
**Severity**: High (Blocks new features)
**Tags**: #deep-dive #opencode #debugging #hierarchy #shadowing #trap

---

## The Core Conflict

OpenCode has a complex, multi-layered system for resolving "Skills" (formerly Commands). When moving from a legacy setup to a modern XDG-compliant setup, users often encounter the "Disappearance Paradox" where installing *more* skills makes *fewer* appear.

This document details the exact resolution logic, precedence rules, and the "Shadowing Trap" discovered during the v1.2.5 rollout.

## The Hierarchy of Precedence (Highest to Lowest)

When you type `/rrr` in OpenCode, it resolves the definition file in this exact order. The **first match wins**, and crucially, **shadows** (hides) all lower matches.

| Rank | Scope | Path | Status |
|------|-------|------|--------|
| **1** | **Local Legacy** | `.opencode/command/*.md` | 🔴 **THE BLOCKER** |
| **2** | **Local Modern** | `.opencode/skill/*/SKILL.md` | 🟡 Ignored by some forks |
| **3** | **Global Legacy** | `~/.opencode/command/*.md` | 🔴 Legacy Global |
| **4** | **Global Modern** | `~/.config/opencode/command/*.md` | 🟢 **Target State** |
| **5** | **Global Wrong** | `~/.config/opencode/skill/*.md` | ❌ Ignored (Wrong Dir) |

### The "Shadowing Trap" Mechanism

1. **The Setup**: You have a legacy file `.opencode/command/rrr.md` (Rank 1). It has no version info.
2. **The Action**: You install `oracle-skills-cli` v1.2.6 globally to `~/.config/opencode/command/rrr/SKILL.md` (Rank 4).
3. **The Result**: OpenCode sees Rank 1 exists. It loads Rank 1. It **STOPS LOOKING**.
4. **The Symptom**: "I installed v1.2.6 but it still shows the old version!"

### The "Disappearance Paradox"

1. **The Setup**: You delete Rank 1 (`.opencode/command/`) to fix the shadowing.
2. **The Action**: Your global install was in `~/.config/opencode/skill/` (Rank 5).
3. **The Result**: OpenCode removes Rank 1. It looks for Rank 4 (`command/`). It doesn't find it. It ignores Rank 5 (`skill/`).
4. **The Symptom**: "It all disappeared! Nothing shows!"

## Directory Structure Requirements

Soul-Brews OpenCode (v1.1.25+) has specific directory expectations that differ from upstream or other agents.

### Correct Structure (Rank 4)
```
~/.config/opencode/
└── command/              <-- MUST be "command" (singular)
    └── rrr/
        └── SKILL.md      <-- Standard skill file
```

### Incorrect Structure (Rank 5)
```
~/.config/opencode/
└── skill/                <-- IGNORED by this fork
    └── rrr/
        └── SKILL.md
```

## Solution: The "Clean State" Protocol

To successfully migrate a user to modern Global Skills:

1.  **Nuke Legacy Local**: `rm -rf .opencode/command/`
    *   *Why*: Removes the Highest Priority Blocker.
2.  **Nuke Legacy Global**: `rm -rf ~/.opencode/`
    *   *Why*: Removes the Secondary Blocker.
3.  **Install to Command**: Ensure `oracle-skills-cli` installs to `command/` directory.
    *   *Fix*: Implemented in `oracle-skills-cli` v1.2.7.

## Meta-Analysis: Why this happened

We assumed **Additive Behavior** (Local + Global = More Skills).
The reality is **Subtractive Behavior** (Local *masks* Global).

We assumed **Flexible Paths** (`skill` or `command` works).
The reality is **Strict Paths** (Only `command` works for this specific agent config).

**Reference**:
- `oracle-skills-cli` v1.2.7 release commit: `d9c52d1`
- Trace Session: `2026-01-18`
- User Quote: *"this is the most high priority what you think? not ~/. that .opencode!"*
