#!/bin/bash
# learn.sh - Clone repo for read-only study
# Usage: learn.sh <github-url-or-owner/repo>
#
# Supports:
#   learn.sh https://github.com/owner/repo
#   learn.sh owner/repo
#   learn.sh repo-name  (searches ghq)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
SLUGS_FILE="$ROOT/ψ/memory/slugs.yaml"

INPUT="$1"
if [ -z "$INPUT" ]; then
  echo "Usage: learn.sh <github-url-or-owner/repo>"
  echo ""
  echo "Examples:"
  echo "  learn.sh https://github.com/owner/repo"
  echo "  learn.sh owner/repo"
  echo "  learn.sh repo-name  # searches ghq"
  exit 1
fi

# Extract repo info
if [[ "$INPUT" == http* ]]; then
  # Full URL: https://github.com/owner/repo
  REPO=$(echo "$INPUT" | sed 's|https://github.com/||' | sed 's|.git$||')
elif [[ "$INPUT" == */* ]]; then
  # Short form: owner/repo
  REPO="$INPUT"
else
  # Just repo name - try to find in ghq
  GHQ_MATCH=$(ghq list 2>/dev/null | grep -i "/$INPUT$" | head -1)
  if [ -n "$GHQ_MATCH" ]; then
    REPO=$(echo "$GHQ_MATCH" | sed 's|github.com/||')
  else
    echo "❌ Not found: $INPUT"
    echo "   Provide full path: owner/repo"
    exit 1
  fi
fi

OWNER=$(echo "$REPO" | cut -d'/' -f1)
NAME=$(echo "$REPO" | cut -d'/' -f2)
GHQ_PATH="$HOME/Code/github.com/$OWNER/$NAME"
LEARN_PATH="$ROOT/ψ/learn/repo/github.com/$OWNER/$NAME"

echo "📚 Learning: $OWNER/$NAME"

# 1. Clone via ghq
if [ -d "$GHQ_PATH" ]; then
  echo "  ↳ Updating existing repo..."
  ghq get -u "github.com/$REPO"
else
  echo "  ↳ Cloning..."
  ghq get "github.com/$REPO"
fi

# 2. Create symlink (with owner structure)
mkdir -p "$(dirname "$LEARN_PATH")"
if [ -L "$LEARN_PATH" ]; then
  unlink "$LEARN_PATH"
fi
ln -s "$GHQ_PATH" "$LEARN_PATH"
echo "  ↳ Symlink: ψ/learn/repo/github.com/$OWNER/$NAME"

# 3. Register slug (owner/repo: path format)
mkdir -p "$ROOT/ψ/memory"
if [ ! -f "$SLUGS_FILE" ]; then
  echo "# Slug Registry (owner/repo: path)" > "$SLUGS_FILE"
fi

# Remove old entry if exists, add new
grep -v "^$OWNER/$NAME:" "$SLUGS_FILE" > "$SLUGS_FILE.tmp" 2>/dev/null || true
mv "$SLUGS_FILE.tmp" "$SLUGS_FILE"
echo "$OWNER/$NAME: $GHQ_PATH" >> "$SLUGS_FILE"

echo "  ↳ Registered: $OWNER/$NAME"
echo ""
echo "✅ Ready to learn: $OWNER/$NAME"
echo "   Path: $GHQ_PATH"
