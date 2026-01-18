#!/bin/bash
# project-find.sh - Find repos (local first, remote fallback)
# Usage: ./find.sh <query> [--remote]
#
# 1. Search local ghq repos (fast)
# 2. If --remote or not found locally, search GitHub API

set -e

if [ -z "$1" ]; then
    echo "Usage: ./find.sh <query> [--remote]"
    echo ""
    echo "Options:"
    echo "  <query>       Search repo names"
    echo "  --remote      Force search GitHub API (slower)"
    echo "  --list-orgs   List all orgs you have access to"
    echo ""
    echo "Examples:"
    echo "  ./find.sh claude           # Local first, fast"
    echo "  ./find.sh voice --remote   # Search GitHub API"
    exit 1
fi

QUERY="$1"
REMOTE=false
[ "$2" = "--remote" ] && REMOTE=true

GHQ_ROOT=$(ghq root 2>/dev/null || echo "$HOME/Code")

# List orgs mode
if [ "$QUERY" = "--list-orgs" ]; then
    echo "📋 Your GitHub organizations:"
    echo ""
    gh api user/orgs --jq '.[].login' 2>/dev/null | while read org; do
        count=$(gh repo list "$org" --limit 1000 --json name --jq 'length' 2>/dev/null || echo "?")
        echo "  $org ($count repos)"
    done
    echo ""
    echo "Plus your personal repos:"
    user=$(gh api user --jq '.login')
    count=$(gh repo list "$user" --limit 1000 --json name --jq 'length' 2>/dev/null || echo "?")
    echo "  $user ($count repos)"
    exit 0
fi

# === LOCAL SEARCH (ghq) ===
echo "🔍 Searching local (ghq): $QUERY"
echo ""

LOCAL_MATCHES=$(ghq list | grep -i "$QUERY" 2>/dev/null || true)
LOCAL_COUNT=$(echo "$LOCAL_MATCHES" | grep -c . 2>/dev/null || echo 0)

if [ -n "$LOCAL_MATCHES" ] && [ "$LOCAL_COUNT" -gt 0 ]; then
    echo "📦 Found $LOCAL_COUNT local repos:"
    echo ""
    echo "$LOCAL_MATCHES" | while read repo; do
        echo "  ~/Code/$repo"
    done
    echo ""
    echo "💡 To load: /project learn owner/repo"

    # If local found and not forcing remote, done
    if [ "$REMOTE" = false ]; then
        exit 0
    fi
fi

# === REMOTE SEARCH (GitHub API) ===
if [ "$REMOTE" = true ] || [ "$LOCAL_COUNT" -eq 0 ]; then
    echo ""
    echo "🌐 Searching GitHub API..."
    echo ""

    # Get current user
    USER=$(gh api user --jq '.login')

    # Search in personal repos
    echo "📦 Personal ($USER):"
    gh repo list "$USER" --limit 1000 --json name,description --jq ".[] | select(.name | test(\"$QUERY\"; \"i\")) | \"  \\(.name) - \\(.description // \"(no description)\")\"" 2>/dev/null || echo "  (none found)"

    # Search in each org
    echo ""
    echo "🏢 Organizations:"
    gh api user/orgs --jq '.[].login' 2>/dev/null | while read org; do
        matches=$(gh repo list "$org" --limit 1000 --json name,description --jq ".[] | select(.name | test(\"$QUERY\"; \"i\")) | \"  $org/\\(.name) - \\(.description // \"(no description)\")\"" 2>/dev/null)
        if [ -n "$matches" ]; then
            echo ""
            echo "  [$org]"
            echo "$matches"
        fi
    done

    echo ""
    echo "💡 To clone & load: /project learn owner/repo"
fi
