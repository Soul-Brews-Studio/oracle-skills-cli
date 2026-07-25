#!/usr/bin/env bash
# team-ops — unified CLI for team agent operations
# Usage: team-ops <command> [args]
#
# Commands:
#   panes [team-name]              Peek at tmux panes
#   spawn-skills <team> <agents>   Create ephemeral /agent skills
#   shutdown-skills <team> <agents> Archive skills to /tmp
#   cleanup                        Kill idle orphan panes
#   killshot                       Kill ALL non-lead panes
#   status                         Show team + panes + skills
#
# Example:
#   team-ops spawn-skills myteam scout builder auditor
#   team-ops status
#   team-ops shutdown-skills myteam scout builder auditor
#   team-ops killshot

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CMD="${1:-help}"
shift 2>/dev/null || true

case "$CMD" in
  panes)
    bash "$SCRIPT_DIR/panes.sh" "$@"
    ;;

  spawn-skills|spawn)
    bash "$SCRIPT_DIR/spawn-skills.sh" "$@"
    ;;

  shutdown-skills|archive)
    bash "$SCRIPT_DIR/shutdown-skills.sh" "$@"
    ;;

  shutdown-worktrees|sweep-worktrees)
    bash "$SCRIPT_DIR/shutdown-worktrees.sh" "$@"
    ;;

  cleanup|sweep)
    bash "$SCRIPT_DIR/cleanup.sh" "$@"
    ;;

  killshot|nuke)
    bash "$SCRIPT_DIR/killshot.sh" "$@"
    ;;

  status)
    TEAM_NAME="${1:-}"
    SESSION=$(tmux display-message -p '#S' 2>/dev/null || echo "")
    # NOTE: tmux display-message kept for session name detection (maw doesn't expose this yet)

    echo ""
    echo "🤖 Team Ops Status"
    echo ""

    # Teams
    if ls -d "$HOME/.claude/teams"/*/ &>/dev/null; then
      echo "  Teams:"
      for dir in "$HOME/.claude/teams"/*/; do
        name=$(basename "$dir")
        members=$(python3 -c "
import json
config = json.load(open('$dir/config.json'))
print(', '.join(m['name'] for m in config.get('members', [])))
" 2>/dev/null || echo "?")
        echo "    🟢 $name — $members"
      done
    else
      echo "  Teams: none active"
    fi
    echo ""

    # Agent skills
    SKILLS_DIR="$HOME/.claude/skills"
    AGENT_SKILLS=0
    if [ -d "$SKILLS_DIR" ]; then
      for dir in "$SKILLS_DIR"/*/; do
        [ -d "$dir" ] || continue
        if grep -q "Ephemeral skill" "$dir/SKILL.md" 2>/dev/null; then
          name=$(basename "$dir")
          team=$(grep -oP 'team \K\S+' "$dir/SKILL.md" 2>/dev/null | head -1 | tr -d '.')
          echo "  Agent skill: /$name (team: $team)"
          AGENT_SKILLS=$((AGENT_SKILLS + 1))
        fi
      done
    fi
    [ "$AGENT_SKILLS" -eq 0 ] && echo "  Agent skills: none"
    echo ""

    # Panes
    if [ -n "$SESSION" ]; then
      PANE_COUNT=$(maw panes 2>/dev/null | wc -l)
      echo "  Panes: $PANE_COUNT in $SESSION"
    else
      echo "  Panes: not in tmux"
    fi

    # Archives
    ARCHIVES=$(ls -d /tmp/team-* 2>/dev/null | wc -l)
    if [ "$ARCHIVES" -gt 0 ]; then
      echo "  Archives: $ARCHIVES in /tmp"
      ls -dt /tmp/team-* 2>/dev/null | head -3 | while read d; do
        echo "    📦 $(basename "$d")"
      done
    fi
    echo ""
    ;;

  doctor|doc)
    bash "$SCRIPT_DIR/doctor.sh" "$@"
    ;;

  mailbox)
    # /mailbox is its own skill — data lives in ψ/, not ~/.claude/
    MAILBOX_SCRIPT="$(dirname "$SCRIPT_DIR")/../mailbox/scripts/mailbox.sh"
    if [ -f "$MAILBOX_SCRIPT" ]; then
      bash "$MAILBOX_SCRIPT" "$@"
    else
      bash "$HOME/.claude/skills/mailbox/scripts/mailbox.sh" "$@" 2>/dev/null || echo "📬 /mailbox skill not installed. Run: /go enable mailbox"
    fi
    ;;

  help|--help|-h)
    echo ""
    echo "🤖 team-ops — unified team agent CLI"
    echo ""
    echo "  Usage: team-ops <command> [args]"
    echo ""
    echo "  Commands:"
    echo "    panes [team]                  👁 Peek at tmux panes"
    echo "    spawn-skills <team> <agents>  🔧 Create /agent skills"
    echo "    shutdown-skills <team> <agents> 📦 Archive skills to /tmp"
    echo "    shutdown-worktrees [repo]     🌳 Remove agent worktrees (#336)"
    echo "    cleanup [--dry-run]           🧹 Kill idle panes (safe)"
    echo "    killshot                      💀 Kill ALL non-lead panes"
    echo "    doctor [--fix]                🩺 Detect ghosts + orphans"
    echo "    mailbox <cmd> [args]          📬 Persistent agent memory"
    echo "    status                        📊 Show everything"
    echo ""
    echo "  Lifecycle:"
    echo "    spawn-skills → panes → status → shutdown-skills → cleanup/killshot"
    echo ""
    ;;

  *)
    echo "Unknown command: $CMD"
    echo "Run: team-ops help"
    exit 1
    ;;
esac
