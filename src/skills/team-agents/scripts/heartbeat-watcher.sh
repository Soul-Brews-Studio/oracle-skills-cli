#!/usr/bin/env bash
# heartbeat-watcher.sh — passive activity tracker for team-agents teammates
#
# Fired on UserPromptSubmit + Stop hooks (configured in ~/.claude/settings.json
# by the team-agents skill installer). Without this script existing on disk,
# every hook fires "No such file or directory" and pollutes the session — that
# was issue #300.
#
# This is currently a STUB. The full implementation per SKILL.md derives
# last_activity_at from four signals (max wins):
#   1. Pane tail diff (bottom 3 lines of agent's tmux pane, cached at /tmp/maw-pane-snap/)
#   2. CPU time delta (ps -o time snapshot, portable Mac+Linux, no /proc dependency)
#   3. Mailbox mtime (~/.claude/teams/<team>/inboxes/<agent>.json)
#   4. Task file mtime (~/.claude/tasks/<team>/<id>.json)
#
# State written to ~/.claude/teams/<team>/heartbeats/<agent>.json.
# Real impl: detect stale (>5min) and silent (>15min) teammates, emit
# <system-reminder> to stdout for the lead to act on.
#
# Until then: no-op. The hook no longer errors; the presence dots in
# `/team-agents who` fall back to recomputing from raw signals at read
# time. Stale/silent detection isn't enforced, but teams still work —
# the lead checks worktree state and SendMessage flow instead.
#
# Args:
#   (none)       — fire normally
#   --silent     — print just the stale count (used by doctor.sh)
#
# See: https://github.com/Soul-Brews-Studio/arra-oracle-skills-cli/issues/300
# Spec: skills/team-agents/SKILL.md (Heartbeat section)

# Silent mode for doctor.sh
if [ "${1:-}" = "--silent" ]; then
  echo "0"
  exit 0
fi

# Normal hook fire — no-op, exit clean so the hook doesn't error
exit 0
