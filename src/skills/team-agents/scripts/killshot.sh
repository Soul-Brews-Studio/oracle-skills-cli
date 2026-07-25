#!/usr/bin/env bash
# /team-agents killshot — kill ALL non-lead panes (nuclear option)
# Usage: bash ~/.claude/skills/team-agents/scripts/killshot.sh
#
# Uses maw commands instead of raw tmux — consistent routing through maw layer.

SESSION=$(tmux display-message -p '#S' 2>/dev/null)
if [ -z "$SESSION" ]; then
  echo "Not in a tmux session"
  exit 0
fi

PANE_COUNT=$(maw panes 2>/dev/null | wc -l)
[ "$PANE_COUNT" -le 0 ] && PANE_COUNT=1

if [ "$PANE_COUNT" -le 1 ]; then
  echo "✅ Only 1 pane (lead) — nothing to kill"
  exit 0
fi

echo ""
echo "💀 Killshot — $SESSION"
echo ""

KILLED=0

# Work backwards to avoid index shifting
for i in $(seq $((PANE_COUNT - 1)) -1 1); do
  # Capture info before killing via maw
  CAPTURE=$(maw capture "$SESSION" --pane "$i" --lines 3 2>/dev/null)
  MODEL=$(echo "$CAPTURE" | grep -oP '(Opus|Sonnet|Haiku) [0-9.]+' | head -1)
  [ -z "$MODEL" ] && MODEL="unknown"

  maw kill "$SESSION" --pane "$i" 2>/dev/null
  printf "  Pane %-3s %-12s → killed\n" "$i" "$MODEL"
  KILLED=$((KILLED + 1))
done

echo ""
echo "  Eliminated: $KILLED panes"
echo "  Remaining: 1 (lead only)"
echo ""
