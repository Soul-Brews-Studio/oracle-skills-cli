#!/bin/bash
# project-history.sh - Git timeline analysis
# Usage: ./history.sh [slug|path] [--since=6months]
#
# Supports mixed slug lookup:
#   owner/repo  → exact match (priority)
#   repo-name   → search all orgs (fallback)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/resolve-slug.sh"

SINCE="6 months ago"

# Parse args
for arg in "$@"; do
    case $arg in
        --since=*)
            SINCE="${arg#*=}"
            ;;
    esac
done

show_history() {
    local path="$1"
    local name=$(basename "$path")

    if [ ! -d "$path/.git" ]; then
        echo "⚠️  Not a git repo: $path"
        return 1
    fi

    echo "# 📊 Git History: $name"
    echo "Path: $path"
    echo "Since: $SINCE"
    echo ""

    cd "$path"

    # Basic stats
    local total_commits=$(git rev-list --count HEAD 2>/dev/null || echo "?")
    local recent_commits=$(git rev-list --count --since="$SINCE" HEAD 2>/dev/null || echo "0")
    local contributors=$(git shortlog -sn --all 2>/dev/null | wc -l | xargs)
    local first_commit=$(git log --reverse --format="%ad" --date=short 2>/dev/null | head -1)
    local last_commit=$(git log -1 --format="%ad" --date=short 2>/dev/null)

    echo "## Summary"
    echo "| Metric | Value |"
    echo "|--------|-------|"
    echo "| Total commits | $total_commits |"
    echo "| Recent commits (since $SINCE) | $recent_commits |"
    echo "| Contributors | $contributors |"
    echo "| First commit | $first_commit |"
    echo "| Last commit | $last_commit |"
    echo ""

    # Recent commits
    echo "## Recent Commits (last 15)"
    echo '```'
    git log --oneline --since="$SINCE" -15 2>/dev/null || git log --oneline -15
    echo '```'
    echo ""

    # Top changed files
    echo "## Top Changed Files"
    echo '```'
    git log --name-only --pretty="" --since="$SINCE" 2>/dev/null | \
        sort | uniq -c | sort -rn | head -10 || \
        echo "(no changes in period)"
    echo '```'
    echo ""

    # Activity by date
    echo "## Activity Timeline"
    echo '```'
    git log --format="%ad" --date=short --since="$SINCE" 2>/dev/null | \
        sort | uniq -c | tail -20 || \
        echo "(no activity in period)"
    echo '```'
    echo ""

    # Top contributors
    echo "## Top Contributors"
    echo '```'
    git shortlog -sn --since="$SINCE" 2>/dev/null | head -5 || \
        git shortlog -sn --all | head -5
    echo '```'
}

# Main
if [ -z "$1" ] || [ "$1" = "--help" ]; then
    echo "Usage: ./history.sh [slug|path] [--since=6months]"
    echo ""
    echo "Supports mixed slug lookup:"
    echo "  owner/repo  → exact match (priority)"
    echo "  repo-name   → search all orgs (fallback)"
    echo ""
    echo "Examples:"
    echo "  ./history.sh thedotmack/claude-mem"
    echo "  ./history.sh claude-mem"
    echo "  ./history.sh ~/Code/github.com/owner/repo"
    echo "  ./history.sh headline --since='1 year ago'"
    exit 0
fi

INPUT="$1"
if [[ "$INPUT" == --* ]]; then
    echo "Error: First argument must be slug or path"
    exit 1
fi

PATH_RESOLVED=$(resolve_slug "$INPUT")
if [ -z "$PATH_RESOLVED" ]; then
    echo "⚠️  Not found: $INPUT"
    echo "   Try: /project learn $INPUT"
    exit 1
fi

show_history "$PATH_RESOLVED"
