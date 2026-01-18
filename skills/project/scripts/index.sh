#!/bin/bash
# project-index.sh - Index manifest files to Oracle knowledge base
# Usage: ./index.sh [date|today] [--dry-run] [--filter TYPE]
#
# Reads manifest JSON files and extracts learnings for Oracle indexing.
# Filters out noise (i18n, CLAUDE.md) and focuses on valuable content.

set -e

ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
LOG_DIR="$ROOT/ψ/memory/logs"
TODAY=$(date '+%Y-%m-%d')

# Parse args
DATE="$TODAY"
DRY_RUN=false
FILTER=""

for arg in "$@"; do
    case "$arg" in
        --dry-run) DRY_RUN=true ;;
        --filter=*) FILTER="${arg#--filter=}" ;;
        today) DATE="$TODAY" ;;
        20*) DATE="$arg" ;;  # Date like 2026-01-08
    esac
done

# Our orgs from GitHub (legacy patterns allowed)
OUR_ORGS=$(gh api user/orgs --jq '.[].login' 2>/dev/null | tr '\n' '|' | sed 's/|$//')
# Add personal username too
OUR_USER=$(gh api user --jq '.login' 2>/dev/null)
[ -n "$OUR_USER" ] && OUR_ORGS="$OUR_ORGS|$OUR_USER"

# File scoring
# - Our projects: ψ/ + legacy patterns
# - External: only ψ/
score_file() {
    local file="$1"

    # Always index ψ/ files
    case "$file" in
        */ψ/*.md|*/ψ/*/*.md) echo 1; return ;;
    esac

    # For OUR projects, also index legacy patterns
    if echo "$file" | grep -qE "github.com/($OUR_ORGS)/"; then
        case "$file" in
            */retrospectives/*.md) echo 1; return ;;
            */learnings/*.md) echo 1; return ;;
            */memory/*.md) echo 1; return ;;
        esac
    fi

    # Skip everything else
    echo 0
}

# Extract key content from file (first meaningful section)
extract_summary() {
    local file="$1"
    local max_chars=1000

    # Skip if file doesn't exist
    [ ! -f "$file" ] && return

    # Extract title and first paragraph
    head -50 "$file" | sed -n '1,/^$/p' | head -20
}

list_manifests() {
    echo "📋 Manifests for $DATE:"

    local total_files=0
    local indexable_files=0
    local indexable_list=""
    local skip_list=""

    for manifest in "$LOG_DIR"/index-$DATE-*.json; do
        [ ! -f "$manifest" ] && continue

        local slug=$(basename "$manifest" | sed 's/index-[0-9-]*-//' | sed 's/.json$//' | tr '_' '/')
        local file_count=$(grep -c '"/' "$manifest" 2>/dev/null || echo "0")

        # Count indexable files
        local indexable=0
        while IFS= read -r file; do
            local score=$(score_file "$file")
            [ "$score" -gt 0 ] && ((indexable++)) || true
        done < <(grep '"/' "$manifest" | tr -d '", ')

        if [ "$indexable" -gt 0 ]; then
            indexable_list="$indexable_list  $slug ($indexable ψ/ files)\n"
        else
            skip_list="$skip_list  $slug ($file_count files, no ψ/)\n"
        fi

        total_files=$((total_files + file_count))
        indexable_files=$((indexable_files + indexable))
    done

    echo ""
    echo "✅ Indexable (has ψ/):"
    if [ -n "$indexable_list" ]; then
        echo -e "$indexable_list"
    else
        echo "  (none)"
    fi

    echo "⏭️  Skip (no ψ/):"
    if [ -n "$skip_list" ]; then
        echo -e "$skip_list"
    else
        echo "  (none)"
    fi

    echo "Total: $total_files files, $indexable_files indexable"
}

index_manifest() {
    local manifest="$1"
    local slug=$(basename "$manifest" | sed 's/index-[0-9-]*-//' | sed 's/.json$//' | tr '_' '/')
    local source_url=$(grep '"source"' "$manifest" | sed 's/.*"source": *"//' | sed 's/".*//')

    echo ""
    echo "🔍 Indexing: $slug"
    echo "   Source: $source_url"

    local indexed=0
    local skipped=0

    while IFS= read -r file; do
        # Clean the file path
        file=$(echo "$file" | tr -d '", ')
        [ -z "$file" ] && continue

        local score=$(score_file "$file")
        local name=$(basename "$file")

        if [ "$score" -eq 0 ]; then
            ((skipped++)) || true
            continue
        fi

        if [ ! -f "$file" ]; then
            echo "   ⚠️  Not found: $name"
            continue
        fi

        # Extract universal path (works for local and GitHub)
        # github.com/owner/repo/path/to/file.md
        local universal_path=$(echo "$file" | sed "s|$HOME/Code/||")

        # Local path for cmd+click (use ~ for shorter display)
        local local_path="~/Code/$universal_path"

        if [ "$DRY_RUN" = true ]; then
            echo "   📄 $name (score: $score)"
            echo "      $local_path"
        else
            echo "   📄 $name (score: $score)"
            echo "      $local_path"
        fi

        ((indexed++)) || true
    done < <(grep '"/' "$manifest")

    echo "   ✅ Indexed: $indexed, Skipped: $skipped"
}

index_all() {
    echo "🔮 Oracle Index - $DATE"
    echo ""

    for manifest in "$LOG_DIR"/index-$DATE-*.json; do
        [ ! -f "$manifest" ] && continue
        index_manifest "$manifest"
    done

    echo ""
    echo "✅ Indexing complete"
}

# Main
case "${1:-list}" in
    list|--list)
        list_manifests
        ;;
    all)
        index_all
        ;;
    *)
        # Single manifest by slug
        SLUG="$1"
        SAFE_SLUG="${SLUG//\//_}"
        MANIFEST="$LOG_DIR/index-$DATE-$SAFE_SLUG.json"

        if [ -f "$MANIFEST" ]; then
            index_manifest "$MANIFEST"
        else
            echo "⚠️  Manifest not found: $MANIFEST"
            echo "Available manifests:"
            list_manifests
        fi
        ;;
esac
