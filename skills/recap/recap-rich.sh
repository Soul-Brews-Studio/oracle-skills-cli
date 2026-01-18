#!/bin/bash
# Rich recap - full context, one script
# Usage: .claude/scripts/recap-rich.sh

R=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
cd "$R"
git config core.quotePath false 2>/dev/null

echo "# RECAP (Rich)"
echo ""
echo "🕐 $(date '+%H:%M') | $(date '+%d %b %Y')"
echo ""
echo "---"
echo ""

# Focus
echo "## 🚧 FOCUS"
if [ -f ψ/inbox/focus-agent-main.md ]; then
  STATE=$(grep "^STATE:" ψ/inbox/focus-agent-main.md | cut -d: -f2 | xargs)
  TASK=$(grep "^TASK:" ψ/inbox/focus-agent-main.md | cut -d: -f2-)
  echo "\`${STATE:-none}\` ${TASK:-No active focus}"
else
  echo "No focus file"
fi
echo ""

# Schedule
echo "## 📅 TODAY"
grep -E "$(date '+%b') *($(date +%d | sed 's/^0//')|$(($(date +%d | sed 's/^0//')+1)))" ψ/inbox/schedule.md 2>/dev/null | head -3 || echo "No schedule"
echo ""

# Git
echo "## 📊 GIT"
git status -sb
echo ""
echo "**Last 3 commits:**"
git log --oneline -3
echo ""

# Tracks
echo "## 🔥 TRACKS"
for f in $(ls -t ψ/inbox/tracks/*.md 2>/dev/null | grep -v INDEX | grep -v CLAUDE | head -6); do
  id=$(basename "$f" | grep -oE '^[0-9]+' || echo "-")
  name=$(head -1 "$f" | sed 's/^# Track[^:]*: //')
  echo "- $id: $name"
done
echo ""

# Latest retro - with content
echo "---"
echo ""
echo "## 📝 LAST SESSION"
RETRO=$(ls -t ψ/memory/retrospectives/$(date +%Y-%m)/*/*.md 2>/dev/null | grep -v CLAUDE | head -1)
if [ -f "$RETRO" ]; then
  echo "**From**: $(basename "$RETRO")"
  echo ""
  # Extract key sections
  echo "**Summary**:"
  sed -n '/^## Session Summary/,/^## /p' "$RETRO" | head -10 | tail -n +2
  echo ""
  echo "**Commits**:"
  sed -n '/^## Commits/,/^## /p' "$RETRO" | head -10 | tail -n +2
fi
echo ""

# Handoff
HANDOFF=$(ls -t ψ/inbox/handoff/*.md 2>/dev/null | grep -v CLAUDE | head -1)
if [ -f "$HANDOFF" ]; then
  echo "**Handoff**: $(basename "$HANDOFF")"
  head -20 "$HANDOFF" | tail -n +3
fi
echo ""

# Context
echo "---"
echo ""
echo "## 📖 CONTEXT"
echo ""
echo "**Modified**:"
git status --porcelain | grep "^ M" | cut -c4- | sed 's/^/  /'
echo ""
echo "**Untracked**:"
git status --porcelain | grep "^??" | cut -c4- | sed 's/^/  /'
