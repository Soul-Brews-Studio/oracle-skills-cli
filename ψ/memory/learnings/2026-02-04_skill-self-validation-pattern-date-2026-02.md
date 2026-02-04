---
title: # Skill Self-Validation Pattern
tags: [skills, testing, validation, self-verification, patterns, agent-testing]
created: 2026-02-04
source: rrr: Soul-Brews-Studio/oracle-skills-cli
---

# # Skill Self-Validation Pattern

# Skill Self-Validation Pattern

**Date**: 2026-02-04
**Context**: Discovered while improving /worktree skill
**Confidence**: High

## Key Learning

Skills are prompts, not code. You cannot unit test them in the traditional sense because AI interpretation varies. However, you CAN embed validation logic that allows agents to verify their own work after execution.

The pattern has three components:

1. **Checklist** - Expected outcomes to verify
2. **Validation commands** - Shell commands that check the expected state
3. **Dry-run** - Preview what would happen without executing

This shifts testing from "did the AI understand?" (hard) to "did the action succeed?" (easy).

## The Pattern

Add a `## Self-Validation` section at the end of any SKILL.md:

```markdown
## Self-Validation

### After [action name]

```bash
# Validation commands
ls -la "$EXPECTED_PATH"
git branch --list "$EXPECTED_BRANCH"
```

**Expected:**
- [ ] Directory exists at correct location
- [ ] Branch was created
- [ ] Output displayed to user

### Dry-Run Test

```bash
# Preview without executing
echo "Would create: $PATH"
echo "Would branch: $BRANCH"
```
```

## Why This Matters

1. **No infrastructure needed** - Validation is in the skill itself
2. **Agent self-service** - AI can verify without human intervention
3. **Catches errors immediately** - Before committing or proceeding
4. **Documentation as test** - Checklist doubles as spec
5. **Composable** - Works with Task/Explore agents for automated testing

---
*Added via Oracle Learn*
