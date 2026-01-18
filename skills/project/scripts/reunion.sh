#!/bin/bash
# project-reunion.sh - Scan project, oracle_learn, optionally offload
# Usage: ./reunion.sh [slug|all] [--keep]
#   --keep: don't offload after learning
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

# Check for --keep flag
KEEP=false
for arg in "$@"; do
    if [ "$arg" = "--keep" ]; then
        KEEP=true
    fi
done

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

find_project_path() {
    local slug="$1"

    # Search in learn
    for link in "$LEARN_DIR"/github.com/*/*; do
        if [ -L "$link" ] && matches_slug "$link" "$slug"; then
            readlink "$link"
            return 0
        fi
    done

    # Search in incubate
    for link in "$INCUBATE_DIR"/github.com/*/*; do
        if [ -L "$link" ] && matches_slug "$link" "$slug"; then
            readlink "$link"
            return 0
        fi
    done

    return 1
}

get_full_slug() {
    local link="$1"
    local name=$(basename "$link")
    local org=$(basename "$(dirname "$link")")
    echo "$org/$name"
}

reunion_single() {
    local slug="$1"
    local path=$(find_project_path "$slug")

    if [ -z "$path" ]; then
        echo "⚠️  Not loaded: $slug"
        echo "   Use: /project learn $slug"
        return 1
    fi

    # Get full owner/repo slug
    local full_slug=""
    for link in "$LEARN_DIR"/github.com/*/* "$INCUBATE_DIR"/github.com/*/*; do
        if [ -L "$link" ] && matches_slug "$link" "$slug"; then
            full_slug=$(get_full_slug "$link")
            break
        fi
    done

    echo "🤝 Reunion: $full_slug"
    echo "   Path: $path"
    echo ""

    # Sync via ghq (not git pull directly)
    echo "  ↳ Syncing (ghq get -u)..."
    ghq get -u "github.com/$full_slug" 2>/dev/null || echo "    (no remote or already up to date)"

    # Derive GitHub URL from ghq path (ground truth)
    local github_url="https://github.com/$full_slug"

    # Collect files for Oracle indexing
    local files_found=()
    local safe_slug="${full_slug//\//_}"  # Replace / with _ for filename
    local index_manifest="$LOG_DIR/index-$TODAY-$safe_slug.json"

    # Check for ψ/memory in project
    if [ -d "$path/ψ/memory" ]; then
        echo "📖 Found ψ/memory in $full_slug:"
        local count=$(find "$path/ψ/memory" -name "*.md" -type f 2>/dev/null | wc -l | xargs)
        echo "   $count markdown files"
        find "$path/ψ/memory" -name "*.md" -type f 2>/dev/null | head -10
    fi

    # Check for learnings/retrospectives at root
    for dir in learnings retrospectives docs; do
        if [ -d "$path/$dir" ]; then
            echo "📖 Found $dir/:"
            find "$path/$dir" -name "*.md" -type f 2>/dev/null | head -5
        fi
    done

    # Write manifest for Oracle indexing
    echo "📝 Index manifest: $index_manifest"
    echo "{" > "$index_manifest"
    echo "  \"project\": \"$full_slug\"," >> "$index_manifest"
    echo "  \"source\": \"$github_url\"," >> "$index_manifest"
    echo "  \"local_path\": \"$path\"," >> "$index_manifest"
    echo "  \"scanned\": \"$TODAY $NOW\"," >> "$index_manifest"
    echo "  \"files\": [" >> "$index_manifest"

    local first=true
    for dir in ψ/memory learnings retrospectives docs; do
        if [ -d "$path/$dir" ]; then
            find "$path/$dir" -name "*.md" -type f 2>/dev/null | while read file; do
                [ "$first" = false ] && echo "," >> "$index_manifest"
                first=false
                echo "    \"$file\"" >> "$index_manifest"
            done
        fi
    done

    echo "  ]" >> "$index_manifest"
    echo "}" >> "$index_manifest"

    echo "   → Main agent: use oracle_learn with source=$github_url"

    # Log reunion
    echo "- $full_slug: reunion at $NOW (path: $path)" >> "$LOG_DIR/reunion-$TODAY.log"

    # Offload unless --keep
    if [ "$KEEP" = false ]; then
        echo ""
        echo "🔄 Offloading $full_slug..."
        "$ROOT/.claude/skills/project-manager/scripts/offload.sh" "$full_slug"
    else
        echo ""
        echo "📌 Keeping $full_slug loaded (--keep)"
    fi
}

reunion_all() {
    echo "# Reunion All - $TODAY $NOW" > "$LOG_DIR/reunion-$TODAY.log"
    echo "" >> "$LOG_DIR/reunion-$TODAY.log"

    local count=0

    # Collect all loaded projects (unique, using full owner/repo slug)
    local all_slugs=""
    for link in "$LEARN_DIR"/github.com/*/*; do
        [ -L "$link" ] && all_slugs="$all_slugs\n$(get_full_slug "$link")"
    done
    for link in "$INCUBATE_DIR"/github.com/*/*; do
        [ -L "$link" ] && all_slugs="$all_slugs\n$(get_full_slug "$link")"
    done

    # Dedupe and count
    local unique_slugs=$(echo -e "$all_slugs" | grep -v '^$' | sort -u)
    local total=$(echo "$unique_slugs" | wc -l | xargs)

    echo "Found $total loaded projects"
    echo ""

    echo "$unique_slugs" | while read slug; do
        [ -n "$slug" ] && reunion_single "$slug" && echo "---" && count=$((count+1))
    done

    echo ""
    echo "✅ Reunion complete: $total projects"
    echo "📝 Log: $LOG_DIR/reunion-$TODAY.log"
}

# Main
if [ -z "$1" ]; then
    echo "Usage: ./reunion.sh [slug|all] [--keep]"
    echo ""
    echo "Supports mixed slug lookup:"
    echo "  owner/repo  → exact match"
    echo "  repo-name   → search all orgs"
    echo ""
    echo "Options:"
    echo "  --keep    Don't offload after learning"
    echo ""
    echo "Examples:"
    echo "  ./reunion.sh thedotmack/claude-mem"
    echo "  ./reunion.sh claude-mem"
    echo "  ./reunion.sh all"
    echo "  ./reunion.sh all --keep"
    exit 1
fi

SLUG="$1"
if [ "$SLUG" = "all" ]; then
    reunion_all
elif [ "$SLUG" != "--keep" ]; then
    reunion_single "$SLUG"
fi
