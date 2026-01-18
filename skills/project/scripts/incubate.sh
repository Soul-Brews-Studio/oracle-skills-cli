#!/bin/bash
# incubate.sh - Clone or create repo for active work
# Usage: incubate.sh <owner/repo|name> [--org <org>]
# If repo doesn't exist, creates it first
#
# Supports:
#   incubate.sh owner/repo
#   incubate.sh repo-name --org laris-co
#   incubate.sh repo-name  (defaults to laris-co)

set -e

ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
SLUGS_FILE="$ROOT/ψ/memory/slugs.yaml"
DEFAULT_ORG="laris-co"

INPUT="$1"
if [ -z "$INPUT" ]; then
  echo "Usage: incubate.sh <owner/repo|name> [--org <org>]"
  echo ""
  echo "Examples:"
  echo "  incubate.sh laris-co/new-project"
  echo "  incubate.sh new-project --org laris-co"
  echo "  incubate.sh new-project  # defaults to laris-co"
  exit 1
fi

# Parse --org flag
ORG="$DEFAULT_ORG"
if [ "$2" = "--org" ] && [ -n "$3" ]; then
  ORG="$3"
fi

# Extract owner/repo
if [[ "$INPUT" == */* ]]; then
  OWNER=$(echo "$INPUT" | cut -d'/' -f1)
  NAME=$(echo "$INPUT" | cut -d'/' -f2)
else
  OWNER="$ORG"
  NAME="$INPUT"
fi

REPO="$OWNER/$NAME"
GHQ_PATH="$HOME/Code/github.com/$OWNER/$NAME"
INCUBATE_PATH="$ROOT/ψ/incubate/repo/github.com/$OWNER/$NAME"

echo "🌱 Incubating: $OWNER/$NAME"

# 1. Check if repo exists on GitHub
if gh repo view "$REPO" &>/dev/null; then
  echo "  ↳ Repo exists, cloning..."
  ghq get -u "github.com/$REPO"
else
  echo "  ↳ Repo doesn't exist, creating..."
  gh repo create "$REPO" --private --clone=false
  echo "  ↳ Cloning new repo..."
  ghq get "github.com/$REPO"

  # Initialize if empty
  if [ ! -f "$GHQ_PATH/README.md" ]; then
    echo "# $NAME" > "$GHQ_PATH/README.md"
    git -C "$GHQ_PATH" add README.md
    git -C "$GHQ_PATH" commit -m "Initial commit"
    git -C "$GHQ_PATH" push origin main 2>/dev/null || git -C "$GHQ_PATH" push origin master
  fi
fi

# 2. Create symlink (with owner structure)
mkdir -p "$(dirname "$INCUBATE_PATH")"
if [ -L "$INCUBATE_PATH" ]; then
  unlink "$INCUBATE_PATH"
fi
ln -s "$GHQ_PATH" "$INCUBATE_PATH"
echo "  ↳ Symlink: ψ/incubate/repo/github.com/$OWNER/$NAME"

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
echo "✅ Ready to incubate: $OWNER/$NAME"
echo "   Path: $GHQ_PATH"
echo "   GitHub: https://github.com/$REPO"
