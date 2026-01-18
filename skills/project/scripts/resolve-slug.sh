#!/bin/bash
# resolve-slug.sh - Shared slug resolution logic
# Usage: source this file, then call resolve_slug "input"
#
# Supports mixed lookup:
#   owner/repo  → exact match (priority)
#   repo-name   → search all orgs (fallback)

SLUGS_FILE="${SLUGS_FILE:-/Users/nat/Code/github.com/laris-co/Nat-s-Agents/ψ/memory/slugs.yaml}"

resolve_slug() {
    local input="$1"

    # 1. If it's already a path, use it
    if [ -d "$input" ]; then
        echo "$input"
        return 0
    fi

    # Expand ~ to $HOME for path checks
    local expanded="${input/#\~/$HOME}"
    if [ -d "$expanded" ]; then
        echo "$expanded"
        return 0
    fi

    # 2. Check slugs.yaml
    if [ -f "$SLUGS_FILE" ]; then
        # Full path match (owner/repo) - priority
        if [[ "$input" == */* ]]; then
            local path=$(grep "^$input:" "$SLUGS_FILE" 2>/dev/null | cut -d: -f2- | xargs)
            if [ -n "$path" ]; then
                local expanded="${path/#\~/$HOME}"
                if [ -d "$expanded" ]; then
                    echo "$expanded"
                    return 0
                fi
            fi
        fi

        # Short slug - search all orgs (match /repo-name:)
        local path=$(grep "/$input:" "$SLUGS_FILE" 2>/dev/null | head -1 | cut -d: -f2- | xargs)
        if [ -n "$path" ]; then
            local expanded="${path/#\~/$HOME}"
            if [ -d "$expanded" ]; then
                echo "$expanded"
                return 0
            fi
        fi

        # Also try exact match without slash (legacy support)
        local path=$(grep "^$input:" "$SLUGS_FILE" 2>/dev/null | cut -d: -f2- | xargs)
        if [ -n "$path" ]; then
            local expanded="${path/#\~/$HOME}"
            if [ -d "$expanded" ]; then
                echo "$expanded"
                return 0
            fi
        fi
    fi

    # 3. Search in learn/incubate symlinks
    local ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
    for link in "$ROOT/ψ/learn/repo"/github.com/*/* "$ROOT/ψ/incubate/repo"/github.com/*/*; do
        if [ -L "$link" ]; then
            local name=$(basename "$link")
            local org=$(basename "$(dirname "$link")")

            # Match full path or short name
            if [ "$input" = "$org/$name" ] || [ "$input" = "$name" ]; then
                readlink "$link"
                return 0
            fi
        fi
    done

    # 4. Search in ghq
    local ghq_path=""
    if [[ "$input" == */* ]]; then
        ghq_path=$(ghq list -p 2>/dev/null | grep -i "/$input$" | head -1)
    else
        ghq_path=$(ghq list -p 2>/dev/null | grep -i "/$input$" | head -1)
    fi

    if [ -n "$ghq_path" ]; then
        echo "$ghq_path"
        return 0
    fi

    return 1
}

# If run directly, test resolution
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
    if [ -z "$1" ]; then
        echo "Usage: ./resolve-slug.sh <slug>"
        echo ""
        echo "Examples:"
        echo "  ./resolve-slug.sh thedotmack/claude-mem  # full path"
        echo "  ./resolve-slug.sh claude-mem             # short slug"
        exit 1
    fi

    result=$(resolve_slug "$1")
    if [ -n "$result" ]; then
        echo "✅ Resolved: $1"
        echo "   Path: $result"
    else
        echo "❌ Not found: $1"
        exit 1
    fi
fi
