#!/usr/bin/env bash
# /team-agents cleanup helper — kill orphaned agent panes after team shutdown
# Usage: bash ~/.claude/skills/team-agents/scripts/cleanup.sh [--dry-run]
#
# Uses maw commands instead of raw tmux — consistent routing through maw layer.
# Finds panes that were team agents (not the lead) and kills idle ones.

DRY_RUN=false
[ "$1" = "--dry-run" ] && DRY_RUN=true

# Get current session panes via maw
PANES_OUTPUT=$(maw panes 2>/dev/null)
if [ -z "$PANES_OUTPUT" ]; then
  echo "Not in a tmux session or maw panes unavailable"
  exit 0
fi

SESSION=$(tmux display-message -p '#S' 2>/dev/null)
PANE_COUNT=$(echo "$PANES_OUTPUT" | grep -c '│\|pane')
# Fallback: count from tmux if maw panes output is unexpected
[ "$PANE_COUNT" -le 0 ] && PANE_COUNT=$(maw panes 2>/dev/null | wc -l)

if [ "$PANE_COUNT" -le 1 ]; then
  echo "✅ Only 1 pane (lead) — nothing to clean"
  exit 0
fi

echo ""
echo "🧹 Cleanup — $SESSION ($PANE_COUNT panes)"
echo ""

KILLED=0
SKIPPED=0

# Work backwards (highest pane first) so killing doesn't shift indices
for i in $(seq $((PANE_COUNT - 1)) -1 1); do
  # Capture last 3 lines via maw
  CAPTURE=$(maw capture "$SESSION" --pane "$i" --lines 3 2>/dev/null)
  [ -z "$CAPTURE" ] && continue

  # Extract info
  MODEL=$(echo "$CAPTURE" | grep -oP '(Opus|Sonnet|Haiku) [0-9.]+' | head -1)
  [ -z "$MODEL" ] && MODEL="unknown"

  # Check if idle (has ❯ prompt = safe to kill)
  if echo "$CAPTURE" | grep -q '^❯'; then
    STATUS="idle"
  else
    STATUS="active"
  fi

  printf "  Pane %-3s %-12s %s" "$i" "$MODEL" "$STATUS"

  if [ "$STATUS" = "idle" ]; then
    if [ "$DRY_RUN" = true ]; then
      echo "  → would kill"
    else
      maw kill "$SESSION" --pane "$i" 2>/dev/null
      echo "  → killed"
    fi
    KILLED=$((KILLED + 1))
  else
    echo "  → skipped (still active)"
    SKIPPED=$((SKIPPED + 1))
  fi
done

echo ""
if [ "$DRY_RUN" = true ]; then
  echo "  Dry run: would kill $KILLED idle panes, skip $SKIPPED active"
  echo "  Run without --dry-run to execute"
else
  echo "  Killed: $KILLED | Skipped: $SKIPPED active"
  REMAINING=$(maw panes 2>/dev/null | wc -l)
  echo "  Panes remaining: $REMAINING"
fi
echo ""
