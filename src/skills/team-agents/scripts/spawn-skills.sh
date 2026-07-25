#!/usr/bin/env bash
# Create live skills for each team agent — /scout, /builder, etc.
# Usage: bash spawn-skills.sh <team-name> <agent1> <agent2> ...
#
# Creates .claude/skills/<agent>/SKILL.md for each agent
# These are ephemeral — moved to /tmp on shutdown
# Also tags tmux panes with @agent-name for reliable identity (#225)

TEAM_NAME="${1:?Usage: spawn-skills.sh <team-name> <agent1> <agent2> ...}"
shift
AGENTS=("$@")

if [ ${#AGENTS[@]} -eq 0 ]; then
  echo "No agents specified"
  exit 1
fi

SKILLS_DIR="$HOME/.claude/skills"
CREATED=0

# Tag tmux panes with agent names via maw tag (#225)
SESSION=$(tmux display-message -p '#S' 2>/dev/null)
tag_panes() {
  [ -z "$SESSION" ] && return
  local PANE_COUNT=$(maw panes 2>/dev/null | wc -l)
  local AGENT_IDX=0

  # Team agents are the newest panes (highest index)
  local FIRST_TEAM_PANE=$((PANE_COUNT - ${#AGENTS[@]}))
  [ "$FIRST_TEAM_PANE" -lt 1 ] && FIRST_TEAM_PANE=1

  for i in $(seq "$FIRST_TEAM_PANE" $((PANE_COUNT - 1))); do
    [ "$AGENT_IDX" -ge "${#AGENTS[@]}" ] && break

    local AGENT="${AGENTS[$AGENT_IDX]}"
    maw tag "$SESSION" --pane "$i" --title "${AGENT}@${TEAM_NAME}" \
      --meta "agent-name=$AGENT" --meta "team-name=$TEAM_NAME" 2>/dev/null
    AGENT_IDX=$((AGENT_IDX + 1))
  done
}

echo ""
echo "🔧 Creating team skills for $TEAM_NAME"
echo ""

for AGENT in "${AGENTS[@]}"; do
  DIR="$SKILLS_DIR/$AGENT"
  mkdir -p "$DIR"

  cat > "$DIR/SKILL.md" << SKILL
---
name: $AGENT
description: 'Talk to $AGENT on team $TEAM_NAME. Use when user says "$AGENT", "tell $AGENT", "ask $AGENT", or wants to direct this agent.'
argument-hint: "<instruction>"
---

# /$AGENT — Team Agent (${TEAM_NAME})

> Ephemeral skill — created by /team-agents --manual, removed on shutdown.

## Usage

\`\`\`
/$AGENT <instruction>          # Direct this agent
/$AGENT status                 # Check if idle/working
/$AGENT what did you find?     # Ask for update
\`\`\`

## How It Works

When the user invokes /$AGENT, send the instruction to the agent via SendMessage:

\`\`\`
SendMessage({
  to: "$AGENT",
  summary: "[5-10 word summary of instruction]",
  message: "[full instruction from user]"
})
\`\`\`

Then report: "Sent to $AGENT. Waiting for response..."

When $AGENT replies via SendMessage, show the response to the user.

## Rules

1. **Relay only** — send user's words to $AGENT, show $AGENT's response
2. **Don't interpret** — pass instructions verbatim
3. **Team**: $TEAM_NAME
4. **Ephemeral** — this skill is removed on team shutdown

---

ARGUMENTS: \$ARGUMENTS
SKILL

  echo "  ✅ /$AGENT created"
  CREATED=$((CREATED + 1))
done

# Tag tmux panes after skill creation
tag_panes

echo ""
echo "  Created $CREATED agent skills for team $TEAM_NAME"
[ -n "$SESSION" ] && echo "  🏷️ Tagged panes via maw tag (@agent-name, @team-name)"
echo "  💡 Restart Claude Code to activate, or they load on next /command"
echo ""
