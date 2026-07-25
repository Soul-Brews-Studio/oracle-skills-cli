#!/usr/bin/env bash
# /team-agents --panes helper v4 — uses maw panes + maw capture
# Usage: bash ~/.claude/skills/team-agents/scripts/panes.sh [team-name]
#
# v4: Routes through maw layer instead of raw tmux.
#     Still uses /proc for agent identity (maw doesn't know about agent flags).

TEAM_NAME="${1:-}"
SESSION=$(tmux display-message -p '#S' 2>/dev/null)

if [ -z "$SESSION" ]; then
  echo "Not in a tmux session — pane view unavailable"
  exit 0
fi

# Get pane count via maw panes
PANE_LIST=$(maw panes 2>/dev/null)
PANE_COUNT=$(echo "$PANE_LIST" | wc -l)
[ "$PANE_COUNT" -le 0 ] && PANE_COUNT=1
TEAM_FOUND=0

echo ""
echo "🖥 Team Panes — $SESSION ($PANE_COUNT panes)"
echo ""
echo "  Pane  Agent        Model        Color   Team         Ctx    Status   PID"
echo "  ───── ──────────── ──────────── ─────── ──────────── ────── ──────── ──────"

for i in $(seq 0 $((PANE_COUNT - 1))); do
  # Get pane pid via maw panes --pid
  PANE_PID=$(maw panes "$SESSION" --pid 2>/dev/null | awk -v idx="$i" 'NR==idx+1 {print}' | grep -oP '\d+' | tail -1)
  [ -z "$PANE_PID" ] && continue

  # Find claude process in pane's process tree
  CLAUDE_PID=$(pstree -p "$PANE_PID" 2>/dev/null | grep -oP 'claude\((\d+)\)' | grep -oP '\d+' | head -1)

  # If no direct claude child, check if pane_pid itself is claude
  if [ -z "$CLAUDE_PID" ]; then
    CMD_CHECK=$(cat /proc/$PANE_PID/cmdline 2>/dev/null | tr '\0' ' ')
    if echo "$CMD_CHECK" | grep -q claude; then
      CLAUDE_PID="$PANE_PID"
    fi
  fi

  if [ -z "$CLAUDE_PID" ]; then
    printf "  %-5s %-12s %-12s %-7s %-12s %-6s %-8s %s\n" "$i" "(no claude)" "-" "-" "-" "-" "-" "-"
    continue
  fi

  # Extract flags from /proc cmdline
  CMDLINE=$(cat /proc/$CLAUDE_PID/cmdline 2>/dev/null | tr '\0' '\n')

  AGENT_NAME=$(echo "$CMDLINE" | grep -A1 '^--agent-name$' | tail -1)
  AGENT_TEAM=$(echo "$CMDLINE" | grep -A1 '^--team-name$' | tail -1)
  AGENT_COLOR=$(echo "$CMDLINE" | grep -A1 '^--agent-color$' | tail -1)
  AGENT_MODEL=$(echo "$CMDLINE" | grep -A1 '^--model$' | tail -1)
  HAS_CONTINUE=$(echo "$CMDLINE" | grep -c '^--continue$')

  # Capture status bar via maw capture
  CAPTURE=$(maw capture "$SESSION" --pane "$i" --lines 3 2>/dev/null)
  CTX=$(echo "$CAPTURE" | grep -oP 'ctx \d+%' | head -1 | sed 's/ctx //')
  [ -z "$CTX" ] && CTX=$(echo "$CAPTURE" | grep -oP '\d+%' | tail -1)
  [ -z "$CTX" ] && CTX="?"

  # Determine status
  if echo "$CAPTURE" | grep -q '^❯'; then
    STATUS="idle"
  else
    STATUS="working"
  fi

  # Classify
  if [ -n "$AGENT_NAME" ]; then
    NAME="$AGENT_NAME"
    MODEL="${AGENT_MODEL:-sonnet}"
    COLOR="${AGENT_COLOR:-?}"
    TEAM="${AGENT_TEAM:-?}"
    TEAM_FOUND=$((TEAM_FOUND + 1))
  elif [ "$HAS_CONTINUE" -gt 0 ]; then
    if [ "$i" -eq 0 ]; then
      NAME="team-lead"
      STATUS="← YOU"
    else
      NAME="(standalone)"
    fi
    MODEL=$(echo "$CAPTURE" | grep -oP '(Opus|Sonnet|Haiku) [0-9.]+' | head -1)
    [ -z "$MODEL" ] && MODEL="?"
    COLOR="-"
    TEAM="-"
  else
    NAME="(other)"
    MODEL=$(echo "$CAPTURE" | grep -oP '(Opus|Sonnet|Haiku) [0-9.]+' | head -1)
    [ -z "$MODEL" ] && MODEL="?"
    COLOR="-"
    TEAM="-"
  fi

  printf "  %-5s %-12s %-12s %-7s %-12s %-6s %-8s %s\n" "$i" "$NAME" "$MODEL" "$COLOR" "$TEAM" "$CTX" "$STATUS" "$CLAUDE_PID"
done

echo ""
if [ -n "$TEAM_NAME" ]; then
  OTHER=$((PANE_COUNT - 1 - TEAM_FOUND))
  echo "  Team: $TEAM_NAME | Agents: $TEAM_FOUND/$((PANE_COUNT-1)) panes | Non-team: $OTHER"

  TEAM_CONFIG="$HOME/.claude/teams/$TEAM_NAME/config.json"
  if [ ! -f "$TEAM_CONFIG" ] && [ "$TEAM_FOUND" -eq 0 ]; then
    echo "  ✅ Team '$TEAM_NAME' cleaned up — no agents remain"
  fi
fi
echo ""
echo "  Detection: /proc cmdline + maw capture/panes (v4)"
echo ""
