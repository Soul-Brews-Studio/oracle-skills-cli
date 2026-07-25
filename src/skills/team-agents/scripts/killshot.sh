#!/usr/bin/env bash
# /team-agents killshot — kill every pane in this window EXCEPT the one you ran it from.
# Usage: bash ~/.claude/skills/team-agents/scripts/killshot.sh [--dry-run]
#
# Two bugs made the old version kill the lead (#411):
#
#   1. `maw panes | wc -l` counted the table HEADER as a pane, so the count was
#      always real+1. With a single pane it read 2, sailed past the "nothing to
#      kill" guard, and started killing.
#   2. It assumed the lead is pane 0 and killed indices N-1..1. That only holds
#      while the lead happens to be first — after a `maw join`, a pane swap, or a
#      non-zero pane-base-index it is not, and the lead sits inside the range.
#
# The fix removes the guesswork: the lead is whichever pane is RUNNING this
# script, and $TMUX_PANE tells us exactly which that is. Everything else in the
# window dies. No counting, no index arithmetic, no assumption about ordering.

set -uo pipefail

DRY_RUN=0
[ "${1:-}" = "--dry-run" ] && DRY_RUN=1

# Read-only tmux introspection: maw exposes no verb that reports pane IDs, and an
# ID is the only handle that survives panes being renumbered as we kill them.
SELF_ID="${TMUX_PANE:-}"
if [ -z "$SELF_ID" ]; then
  echo "Not inside a tmux pane — refusing to kill anything."
  exit 1
fi

SESSION=$(MAW_ALLOW_RAW_TMUX=1 tmux display-message -p '#S' 2>/dev/null)
WINDOW=$(MAW_ALLOW_RAW_TMUX=1 tmux display-message -p '#I' 2>/dev/null)
if [ -z "$SESSION" ]; then
  echo "Not in a tmux session"
  exit 0
fi

# index + id for every pane in THIS window, highest index first so killing one
# never renumbers a pane we have not visited yet.
PANES=$(MAW_ALLOW_RAW_TMUX=1 tmux list-panes -t "${SESSION}:${WINDOW}" \
          -F '#{pane_index} #{pane_id}' 2>/dev/null | sort -rn)

VICTIMS=$(echo "$PANES" | awk -v self="$SELF_ID" 'NF && $2 != self { print }')

if [ -z "$VICTIMS" ]; then
  echo "✅ Only the lead ($SELF_ID) is here — nothing to kill"
  exit 0
fi

echo ""
echo "💀 Killshot — ${SESSION}:${WINDOW}   (lead $SELF_ID is protected)"
echo ""

KILLED=0
while read -r IDX PID; do
  [ -z "${IDX:-}" ] && continue

  # Belt and braces: never touch our own pane even if the filter above changes.
  if [ "$PID" = "$SELF_ID" ]; then
    printf "  Pane %-3s %-10s → SKIPPED (this is the lead)\n" "$IDX" "$PID"
    continue
  fi

  CAPTURE=$(maw capture "$SESSION" --pane "$IDX" --lines 3 2>/dev/null)
  # BSD grep (macOS) has no -P; -E is portable across the fleet.
  MODEL=$(echo "$CAPTURE" | grep -oE '(Opus|Sonnet|Haiku|GPT|gpt)[- ][0-9.]+' | head -1)
  [ -z "$MODEL" ] && MODEL="unknown"

  if [ "$DRY_RUN" = "1" ]; then
    printf "  Pane %-3s %-10s → would kill (%s)\n" "$IDX" "$PID" "$MODEL"
  else
    maw kill "$SESSION" --pane "$IDX" >/dev/null 2>&1
    printf "  Pane %-3s %-10s → killed (%s)\n" "$IDX" "$PID" "$MODEL"
  fi
  KILLED=$((KILLED + 1))
done <<< "$VICTIMS"

echo ""
if [ "$DRY_RUN" = "1" ]; then
  echo "  Dry run — $KILLED pane(s) would be killed, lead $SELF_ID kept"
else
  echo "  Eliminated: $KILLED pane(s)"
  echo "  Remaining:  the lead ($SELF_ID)"
fi
echo ""
