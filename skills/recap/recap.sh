#!/bin/bash
# Fast recap - no AI, just git status
# Usage: .claude/scripts/recap.sh

R=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$R"

# Gather data
BRANCH=$(git branch --show-current)
AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
LAST_COMMIT=$(git log --oneline -1 | cut -c9- | head -c60)
FOCUS_STATE=$(grep "^STATE:" ψ/inbox/focus-agent-main.md 2>/dev/null | cut -d: -f2 | xargs)
FOCUS_TASK=$(grep "^TASK:" ψ/inbox/focus-agent-main.md 2>/dev/null | cut -d: -f2- | head -c80)
SCHEDULE=$(grep -E "$(date '+%b') *($(date +%d | sed 's/^0//')|$(($(date +%d | sed 's/^0//')+1)))" ψ/inbox/schedule.md 2>/dev/null | sed 's/|//g' | xargs | head -c120)
RETRO=$(ls -t ψ/memory/retrospectives/$(date +%Y-%m)/*/*.md 2>/dev/null | grep -v CLAUDE | head -1)
HANDOFF=$(ls -t ψ/inbox/handoff/*.md 2>/dev/null | grep -v CLAUDE | head -1)

# Count files (use -c false to show ψ correctly)
git config core.quotePath false 2>/dev/null
MODIFIED=$(git status --porcelain | grep -c "^ M" || echo "0")
UNTRACKED=$(git status --porcelain | grep -c "^??" || echo "0")

# File lists (clean format)
MODIFIED_FILES=$(git status --porcelain | grep "^ M" | cut -c4- | sed 's/^/  /')
UNTRACKED_FILES=$(git status --porcelain | grep "^??" | cut -c4- | sed 's/^/  /')

# Output
echo "# RECAP"
echo ""
echo "🕐 $(date '+%H:%M') | $(date '+%d %b %Y')"
echo ""
echo "---"
echo ""
echo "## 🚧 FOCUS"
echo "\`${FOCUS_STATE:-none}\` ${FOCUS_TASK:-No active focus}"
echo ""
echo "## 📅 TODAY"
echo "${SCHEDULE:-No schedule}"
echo ""
echo "## 📊 GIT: $BRANCH (+$AHEAD ahead)"
echo "Last: $LAST_COMMIT"
echo ""
if [ "$MODIFIED" != "0" ]; then
  echo "**Modified** ($MODIFIED):"
  echo "$MODIFIED_FILES"
  echo ""
fi
if [ "$UNTRACKED" != "0" ]; then
  echo "**Untracked** ($UNTRACKED):"
  echo "$UNTRACKED_FILES"
  echo ""
fi
echo "---"
echo ""
echo "## 📝 LAST SESSION"
echo "Retro: $(basename "$RETRO" 2>/dev/null || echo 'none')"
echo "Handoff: $(basename "$HANDOFF" 2>/dev/null || echo 'none')"
