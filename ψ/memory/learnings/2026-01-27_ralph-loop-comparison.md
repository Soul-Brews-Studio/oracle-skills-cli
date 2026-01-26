# Ralph Loop Implementation Comparison

**Date**: 2026-01-27
**Context**: Comparing Anthropic's ralph-wiggum vs Soul Brews' ralph-local
**Confidence**: High

## Overview

Both implementations create self-referential development loops using Claude Code's stop hooks. The key difference is **session isolation** - Soul Brews' fork addresses a critical bug where multiple Claude Code sessions interfere with each other.

## Implementations Compared

| Aspect | Anthropic `ralph-wiggum` | Soul Brews `ralph-local` |
|--------|--------------------------|--------------------------|
| State File | `.claude/ralph-loop.local.md` (single) | `state/${SESSION_ID}.md` (per-session) |
| Session Isolation | None | Full isolation |
| Hooks | Stop only | Stop + SessionStart |
| Commands | 3 (help, ralph-loop, cancel-ralph) | 4 (+check-updates) |
| PR Status | - | PR #15853 submitted |

## The Session Isolation Problem

**Anthropic's approach** (broken for multi-session):
```bash
RALPH_STATE_FILE=".claude/ralph-loop.local.md"
```

If you have two Claude Code terminals open:
1. Terminal A starts ralph-loop on project X
2. Terminal B opens same project
3. Terminal B triggers A's ralph-loop state
4. Both sessions interfere with each other

**Soul Brews' fix**:
```bash
RALPH_STATE_FILE="$STATE_DIR/${SESSION_ID}.md"
```

Each session gets its own state file based on `CLAUDE_SESSION_ID`.

## Key Architecture Differences

### 1. SessionStart Hook (Soul Brews only)

```bash
# session-start-hook.sh
SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // empty')
echo "export CLAUDE_SESSION_ID=\"$SESSION_ID\"" >> "$CLAUDE_ENV_FILE"
```

This extracts the session ID from hook input and persists it to the environment.

### 2. State Directory Structure

**Anthropic**:
```
.claude/
  ralph-loop.local.md  # Single file for all sessions
```

**Soul Brews**:
```
plugins/ralph-local/
  state/
    abc123-def4-5678.md  # Session-specific state
    xyz789-ghi0-1234.md  # Another session's state
```

### 3. Stop Hook Session Validation

**Anthropic** - Checks file exists:
```bash
if [[ ! -f "$RALPH_STATE_FILE" ]]; then
  exit 0
fi
```

**Soul Brews** - Extracts session ID from hook input:
```bash
SESSION_ID=$(echo "$HOOK_INPUT" | jq -r '.session_id // empty')
if [[ -z "$SESSION_ID" ]]; then
  exit 0
fi
RALPH_STATE_FILE="$STATE_DIR/${SESSION_ID}.md"
```

### 4. Active Flag Check (Soul Brews only)

```bash
ACTIVE=$(echo "$FRONTMATTER" | grep '^active:' | sed 's/active: *//')
if [[ "$ACTIVE" != "true" ]]; then
  exit 0
fi
```

Allows clean deactivation without deleting state file.

## Command Differences

### ralph-loop.md

**Anthropic**:
```yaml
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/setup-ralph-loop.sh:*)"]
hide-from-slash-command-tool: "true"
```

**Soul Brews**:
```yaml
allowed-tools: ["Bash", "Write"]
```

Soul Brews exposes the state file location in the command for debugging.

### check-updates.md (Soul Brews only)

```bash
# Check upstream for changes
gh api repos/anthropics/claude-code/commits --jq '[.[] | select(.commit.message | test("ralph"; "i"))]'

# Check PR status
gh pr view 15853 --repo anthropics/claude-code
```

Helps track when upstream changes should be merged.

## Setup Script Comparison

### Prompt for Session ID (Soul Brews only)

```bash
if [[ -z "${CLAUDE_SESSION_ID:-}" ]]; then
  echo "Error: CLAUDE_SESSION_ID not available" >&2
  echo "   Ralph loop requires session isolation to work correctly." >&2
  exit 1
fi
```

Fails fast if session isolation isn't working.

### State File Path

**Anthropic**:
```bash
mkdir -p .claude
cat > .claude/ralph-loop.local.md <<EOF
```

**Soul Brews**:
```bash
mkdir -p "$STATE_DIR"
RALPH_STATE_FILE="$STATE_DIR/${CLAUDE_SESSION_ID}.md"
cat > "$RALPH_STATE_FILE" <<EOF
```

## Why Soul Brews Fork Exists

1. **Session isolation bug** - Critical for multi-terminal workflows
2. **Worktree support** - Oracle uses git worktrees extensively
3. **Oracle Forum integration** - EXIT_LOOP signal for forum communication
4. **Better error handling** - More graceful recovery from parse errors
5. **Update tracking** - `/check-updates` command

## Recommendation

Use `ralph-local` (Soul Brews) unless:
- You only use single Claude Code session at a time
- Upstream PR #15853 gets merged

## Tags

`ralph-loop`, `session-isolation`, `hooks`, `comparison`, `soul-brews`, `anthropic`
