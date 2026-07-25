#!/usr/bin/env bash
# broadcast-shutdown.sh — workaround for #212
#
# Upstream SendMessage rejects structured messages with to: "*":
#   SendMessage({ to: "*", message: { type: "shutdown_request" } })
#   → Error: structured messages cannot be broadcast
#
# This helper reads the team's config.json and prints:
#   1. The list of agent names (one per line) — machine-readable
#   2. A ready-to-copy SendMessage block the LLM can emit
#
# The script itself CANNOT invoke SendMessage (that's a tool call only the
# LLM can make). The LLM should either pipe --names into a loop and emit
# one SendMessage per name, or copy the printed block verbatim.
#
# Usage:
#   bash broadcast-shutdown.sh <team-name>            # human-readable
#   bash broadcast-shutdown.sh <team-name> --names    # names only, one per line
#   bash broadcast-shutdown.sh <team-name> --json     # JSON array of names
#   bash broadcast-shutdown.sh <team-name> --type=X   # custom structured type
#
# The lead is excluded from the shutdown list by default (lead cannot
# shutdown itself via SendMessage). Override with --include-lead.

set -euo pipefail

TEAM="${1:-}"
if [ -z "$TEAM" ]; then
  echo "Usage: broadcast-shutdown.sh <team-name> [--names|--json] [--type=TYPE] [--include-lead]" >&2
  echo "Lists teammates and prints SendMessage commands for structured broadcast (#212 workaround)." >&2
  exit 1
fi
shift

MODE="human"
MSG_TYPE="shutdown_request"
INCLUDE_LEAD=0
LEAD_NAME="team-lead"

for arg in "$@"; do
  case "$arg" in
    --names) MODE="names" ;;
    --json)  MODE="json" ;;
    --type=*) MSG_TYPE="${arg#--type=}" ;;
    --include-lead) INCLUDE_LEAD=1 ;;
    --lead=*) LEAD_NAME="${arg#--lead=}" ;;
    *) echo "Unknown flag: $arg" >&2; exit 2 ;;
  esac
done

CONFIG="$HOME/.claude/teams/$TEAM/config.json"
if [ ! -f "$CONFIG" ]; then
  echo "Team config not found: $CONFIG" >&2
  echo "Hint: check ~/.claude/teams/ for valid team names." >&2
  exit 3
fi

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required but not installed" >&2
  exit 4
fi

# Extract member names, optionally excluding the lead
if [ "$INCLUDE_LEAD" = "1" ]; then
  NAMES=$(jq -r '.members[].name' "$CONFIG")
else
  NAMES=$(jq -r --arg lead "$LEAD_NAME" '.members[] | select(.name != $lead) | .name' "$CONFIG")
fi

if [ -z "$NAMES" ]; then
  echo "No teammates found in $CONFIG (lead excluded: $([ $INCLUDE_LEAD = 0 ] && echo yes || echo no))" >&2
  exit 5
fi

case "$MODE" in
  names)
    # One name per line — pipe into a loop
    printf '%s\n' "$NAMES"
    ;;
  json)
    # JSON array — load into a tool or parse
    printf '%s\n' "$NAMES" | jq -R . | jq -s .
    ;;
  human)
    echo "# Team: $TEAM"
    echo "# Teammates (lead '$LEAD_NAME' excluded: $([ $INCLUDE_LEAD = 0 ] && echo yes || echo no)):"
    printf '%s\n' "$NAMES" | sed 's/^/#   - /'
    echo ""
    echo "# Structured broadcast is rejected upstream (#212). Emit N individual"
    echo "# SendMessage calls — copy this block verbatim into your next turn:"
    echo ""
    while IFS= read -r name; do
      [ -z "$name" ] && continue
      echo "SendMessage({ to: \"$name\", message: { type: \"$MSG_TYPE\" } })"
    done <<< "$NAMES"
    echo ""
    echo "# Then wait ~10s for shutdown_response from each, then TeamDelete()."
    ;;
esac
