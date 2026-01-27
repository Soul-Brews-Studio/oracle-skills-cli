---
name: help
description: Explain Ralph Wiggum technique and available commands
---

# Ralph Loop Plugin Help

> Source: anthropics/claude-plugins-official + Soul Brews session isolation

## What is Ralph Loop?

Ralph Loop implements the Ralph Wiggum technique - an iterative development methodology based on continuous AI loops, pioneered by Geoffrey Huntley.

**Core concept:**
```bash
while :; do
  cat PROMPT.md | claude-code --continue
done
```

The same prompt is fed to Claude repeatedly. The "self-referential" aspect comes from Claude seeing its own previous work in the files and git history, not from feeding output back as input.

**Each iteration:**
1. Claude receives the SAME prompt
2. Works on the task, modifying files
3. Tries to exit
4. Stop hook intercepts and feeds the same prompt again
5. Claude sees its previous work in the files
6. Iteratively improves until completion

## Available Commands

### /ralph-loop <PROMPT> [OPTIONS]

Start a Ralph loop in your current session.

**Usage:**
```
/ralph-loop "Refactor the cache layer" --max-iterations 20
/ralph-loop "Add tests" --completion-promise "TESTS COMPLETE"
```

**Options:**
- `--max-iterations <n>` - Max iterations before auto-stop
- `--completion-promise <text>` - Promise phrase to signal completion

### /cancel-ralph

Cancel an active Ralph loop (removes the loop state file).

## Soul Brews Extensions

This version includes session isolation from Soul Brews:

- **Per-session state files**: `state/${SESSION_ID}.md`
- **SessionStart hook**: Extracts session ID
- **Multi-terminal safe**: No interference between sessions

## Key Concepts

### Completion Promises

To signal completion, output a `<promise>` tag:

```
<promise>TASK COMPLETE</promise>
```

### Self-Reference Mechanism

- Same prompt repeated
- Claude's work persists in files
- Each iteration sees previous attempts
- Builds incrementally toward goal

## When to Use Ralph

**Good for:**
- Well-defined tasks with clear success criteria
- Tasks requiring iteration and refinement
- Greenfield projects
- Tasks with automatic verification (tests, linters)

**Not good for:**
- Tasks requiring human judgment
- One-shot operations
- Unclear success criteria

## Learn More

- Original technique: https://ghuntley.com/ralph/
- Upstream: https://github.com/anthropics/claude-plugins-official/tree/main/plugins/ralph-loop
