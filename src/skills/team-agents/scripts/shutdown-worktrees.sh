#!/usr/bin/env bash
# Remove team-agent git worktrees on shutdown — root-cause fix for #336
# Usage: bash shutdown-worktrees.sh [repo-path] [--dry-run]
#
# TeamDelete() claims to clean worktrees, but agents that crash or sessions
# that die without calling TeamDelete leave stale worktrees behind. Those
# worktrees pollute test runs (e.g., maw-js picked up ~1700 extra tests from
# agents/engine-isolator, agents/fail-debugger, agents/mock-builder).
#
# This script sweeps both worktree patterns used by /team-agents:
#   1. `agents/<name>/`            ← Mode 1: --worktree flag
#   2. `.claude/worktrees/<name>/` ← Mode 2: Agent tool isolation:"worktree"
#
# Safe to call unconditionally at shutdown — no-op if nothing matches.

set -euo pipefail

REPO_PATH="${1:-$(pwd)}"
DRY_RUN=false
[ "${2:-}" = "--dry-run" ] && DRY_RUN=true
[ "${1:-}" = "--dry-run" ] && { DRY_RUN=true; REPO_PATH="$(pwd)"; }

# Resolve to repo root
if ! REPO_ROOT=$(git -C "$REPO_PATH" rev-parse --show-toplevel 2>/dev/null); then
  echo "⚠️  Not a git repo: $REPO_PATH"
  exit 0
fi

echo ""
echo "🧹 Worktree sweep — $REPO_ROOT"
echo ""

REMOVED=0
SKIPPED=0

# git worktree list --porcelain emits blocks of:
#   worktree /abs/path
#   HEAD <sha>
#   branch <ref>
# Extract only worktree paths, skip the main worktree (first entry).
MAIN_WT=$(git -C "$REPO_ROOT" rev-parse --show-toplevel)

while IFS= read -r line; do
  [ "${line:0:9}" = "worktree " ] || continue
  WT_PATH="${line:9}"
  [ "$WT_PATH" = "$MAIN_WT" ] && continue

  # Match our two patterns: agents/<name> or .claude/worktrees/<name>
  REL="${WT_PATH#$MAIN_WT/}"
  case "$REL" in
    agents/*|.claude/worktrees/*)
      if [ "$DRY_RUN" = true ]; then
        echo "  🔍 would remove: $REL"
      else
        if git -C "$REPO_ROOT" worktree remove --force "$WT_PATH" 2>/dev/null; then
          echo "  ✓ removed: $REL"
          REMOVED=$((REMOVED + 1))
        else
          echo "  ⚠️  failed: $REL (try: git worktree remove --force $WT_PATH)"
          SKIPPED=$((SKIPPED + 1))
        fi
      fi
      ;;
    *)
      # Not ours — leave alone
      ;;
  esac
done < <(git -C "$REPO_ROOT" worktree list --porcelain)

# Also prune any stale worktree metadata
git -C "$REPO_ROOT" worktree prune 2>/dev/null || true

echo ""
if [ "$DRY_RUN" = true ]; then
  echo "  Dry run — re-run without --dry-run to execute"
elif [ "$REMOVED" -eq 0 ] && [ "$SKIPPED" -eq 0 ]; then
  echo "  ✅ No agent worktrees found — clean"
else
  echo "  Removed: $REMOVED | Failed: $SKIPPED"
fi
echo ""
