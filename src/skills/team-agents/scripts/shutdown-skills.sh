#!/usr/bin/env bash
# Move team agent skills to /tmp on shutdown — Nothing is Deleted
# Usage: bash shutdown-skills.sh <team-name> <agent1> <agent2> ...

TEAM_NAME="${1:?Usage: shutdown-skills.sh <team-name> <agent1> <agent2> ...}"
shift
AGENTS=("$@")

if [ ${#AGENTS[@]} -eq 0 ]; then
  echo "No agents specified"
  exit 1
fi

SKILLS_DIR="$HOME/.claude/skills"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE="/tmp/team-${TEAM_NAME}-${TIMESTAMP}"
mkdir -p "$ARCHIVE"

MOVED=0
MISSING=0

echo ""
echo "📦 Archiving team skills → /tmp"
echo ""

for AGENT in "${AGENTS[@]}"; do
  DIR="$SKILLS_DIR/$AGENT"
  if [ -d "$DIR" ]; then
    mv "$DIR" "$ARCHIVE/$AGENT"
    echo "  📦 /$AGENT → $ARCHIVE/$AGENT"
    MOVED=$((MOVED + 1))
  else
    echo "  ⚠️ /$AGENT not found (already removed?)"
    MISSING=$((MISSING + 1))
  fi
done

echo ""
echo "  Archived: $MOVED skills to $ARCHIVE"
[ "$MISSING" -gt 0 ] && echo "  Missing: $MISSING (already gone)"
echo "  Nothing is Deleted — recover from $ARCHIVE"
echo ""
