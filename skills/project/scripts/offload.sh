#!/bin/bash
# project-offload.sh - Remove symlinks, keep ghq + slugs
# Usage: ./offload.sh [slug|all]
#
# Supports mixed slug lookup:
#   owner/repo  → exact match (priority)
#   repo-name   → search all orgs (fallback)

set -e

ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
LEARN_DIR="$ROOT/ψ/learn/repo"
INCUBATE_DIR="$ROOT/ψ/incubate/repo"
LOG_DIR="$ROOT/ψ/memory/logs"
TODAY=$(date '+%Y-%m-%d')
NOW=$(date '+%H:%M')

mkdir -p "$LOG_DIR"

# Match slug against symlink (supports owner/repo or just repo)
matches_slug() {
    local link="$1"
    local slug="$2"
    local name=$(basename "$link")
    local org=$(basename "$(dirname "$link")")

    # Full path match: owner/repo
    if [[ "$slug" == */* ]]; then
        [ "$slug" = "$org/$name" ] && return 0
    else
        # Short slug match: repo-name
        [ "$slug" = "$name" ] && return 0
    fi
    return 1
}

offload_single() {
    local slug="$1"
    local found=0

    # Search in learn
    for link in "$LEARN_DIR"/github.com/*/*; do
        if [ -L "$link" ] && matches_slug "$link" "$slug"; then
            local name=$(basename "$link")
            local org=$(basename "$(dirname "$link")")
            local full_slug="$org/$name"
            local safe_slug="${full_slug//\//_}"
            local manifest="$LOG_DIR/index-$TODAY-$safe_slug.json"

            echo "📚 Offloading from learn: $full_slug"

            # Log with manifest summary if exists
            echo "" >> "$LOG_DIR/offload-$TODAY.log"
            echo "## $full_slug" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Time: $NOW" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Type: learn" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Source: https://github.com/$full_slug" >> "$LOG_DIR/offload-$TODAY.log"

            if [ -f "$manifest" ]; then
                local file_count=$(grep -c '"/' "$manifest" 2>/dev/null || echo "0")
                echo "- Found: $file_count files" >> "$LOG_DIR/offload-$TODAY.log"
                echo "- Manifest: $manifest" >> "$LOG_DIR/offload-$TODAY.log"
            fi

            unlink "$link"
            found=1
        fi
    done

    # Search in incubate
    for link in "$INCUBATE_DIR"/github.com/*/*; do
        if [ -L "$link" ] && matches_slug "$link" "$slug"; then
            local name=$(basename "$link")
            local org=$(basename "$(dirname "$link")")
            local full_slug="$org/$name"
            local safe_slug="${full_slug//\//_}"
            local manifest="$LOG_DIR/index-$TODAY-$safe_slug.json"

            echo "🌱 Offloading from incubate: $full_slug"

            # Log with manifest summary if exists
            echo "" >> "$LOG_DIR/offload-$TODAY.log"
            echo "## $full_slug" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Time: $NOW" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Type: incubate" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Source: https://github.com/$full_slug" >> "$LOG_DIR/offload-$TODAY.log"

            if [ -f "$manifest" ]; then
                local file_count=$(grep -c '"/' "$manifest" 2>/dev/null || echo "0")
                echo "- Found: $file_count files" >> "$LOG_DIR/offload-$TODAY.log"
                echo "- Manifest: $manifest" >> "$LOG_DIR/offload-$TODAY.log"
            fi

            unlink "$link"
            found=1
        fi
    done

    if [ $found -eq 0 ]; then
        echo "⚠️  Not found: $slug"
    fi
}

offload_all() {
    echo "# Offload Snapshot $TODAY $NOW" > "$LOG_DIR/offload-$TODAY.log"
    echo "" >> "$LOG_DIR/offload-$TODAY.log"

    local count=0

    # Offload all learn
    echo "## 📚 Learn" >> "$LOG_DIR/offload-$TODAY.log"
    for link in "$LEARN_DIR"/github.com/*/*; do
        if [ -L "$link" ]; then
            local name=$(basename "$link")
            local org=$(basename "$(dirname "$link")")
            local full_slug="$org/$name"
            local safe_slug="${full_slug//\//_}"
            local manifest="$LOG_DIR/index-$TODAY-$safe_slug.json"
            local target=$(readlink "$link")

            echo "" >> "$LOG_DIR/offload-$TODAY.log"
            echo "### $full_slug" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Time: $NOW" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Source: https://github.com/$full_slug" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Path: $target" >> "$LOG_DIR/offload-$TODAY.log"

            if [ -f "$manifest" ]; then
                local file_count=$(grep -c '"/' "$manifest" 2>/dev/null || echo "0")
                echo "- Found: $file_count files" >> "$LOG_DIR/offload-$TODAY.log"
            fi

            unlink "$link"
            ((count++)) || true
        fi
    done

    # Offload all incubate
    echo "" >> "$LOG_DIR/offload-$TODAY.log"
    echo "## 🌱 Incubate" >> "$LOG_DIR/offload-$TODAY.log"
    for link in "$INCUBATE_DIR"/github.com/*/*; do
        if [ -L "$link" ]; then
            local name=$(basename "$link")
            local org=$(basename "$(dirname "$link")")
            local full_slug="$org/$name"
            local safe_slug="${full_slug//\//_}"
            local manifest="$LOG_DIR/index-$TODAY-$safe_slug.json"
            local target=$(readlink "$link")

            echo "" >> "$LOG_DIR/offload-$TODAY.log"
            echo "### $full_slug" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Time: $NOW" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Source: https://github.com/$full_slug" >> "$LOG_DIR/offload-$TODAY.log"
            echo "- Path: $target" >> "$LOG_DIR/offload-$TODAY.log"

            if [ -f "$manifest" ]; then
                local file_count=$(grep -c '"/' "$manifest" 2>/dev/null || echo "0")
                echo "- Found: $file_count files" >> "$LOG_DIR/offload-$TODAY.log"
            fi

            unlink "$link"
            ((count++)) || true
        fi
    done

    echo "" >> "$LOG_DIR/offload-$TODAY.log"
    echo "## Restore Commands" >> "$LOG_DIR/offload-$TODAY.log"
    echo '```bash' >> "$LOG_DIR/offload-$TODAY.log"
    echo "/project learn [owner/repo]     # restore to learn" >> "$LOG_DIR/offload-$TODAY.log"
    echo "/project incubate [owner/repo]  # restore to incubate" >> "$LOG_DIR/offload-$TODAY.log"
    echo '```' >> "$LOG_DIR/offload-$TODAY.log"

    echo "✅ Offloaded $count projects"
    echo "📝 Log: $LOG_DIR/offload-$TODAY.log"
}

# Main
if [ -z "$1" ]; then
    echo "Usage: ./offload.sh [slug|all]"
    echo ""
    echo "Supports mixed slug lookup:"
    echo "  owner/repo  → exact match"
    echo "  repo-name   → search all orgs"
    echo ""
    echo "Examples:"
    echo "  ./offload.sh thedotmack/claude-mem"
    echo "  ./offload.sh claude-mem"
    echo "  ./offload.sh all"
    exit 1
fi

if [ "$1" = "all" ]; then
    offload_all
else
    offload_single "$1"
fi
