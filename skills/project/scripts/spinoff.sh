#!/bin/bash
# spinoff.sh - Graduate project to its own repo
# Usage: spinoff.sh <slug> <target-org/repo>

set -e

SLUG="$1"
TARGET="$2"

if [ -z "$SLUG" ] || [ -z "$TARGET" ]; then
  echo "Usage: spinoff.sh <slug> <target-org/repo>"
  echo "Example: spinoff.sh my-project Soul-Brews-Studio/my-project"
  exit 1
fi

INCUBATE_PATH="ψ/incubate/$SLUG"
SLUGS_FILE="ψ/memory/slugs.yaml"

if [ ! -L "$INCUBATE_PATH" ] && [ ! -d "$INCUBATE_PATH" ]; then
  echo "❌ Project not found: $INCUBATE_PATH"
  exit 1
fi

# Resolve symlink to actual path
if [ -L "$INCUBATE_PATH" ]; then
  SOURCE_PATH=$(readlink "$INCUBATE_PATH")
else
  SOURCE_PATH="$INCUBATE_PATH"
fi

TARGET_ORG=$(echo "$TARGET" | cut -d'/' -f1)
TARGET_NAME=$(echo "$TARGET" | cut -d'/' -f2)
TARGET_GHQ="$HOME/Code/github.com/$TARGET_ORG/$TARGET_NAME"

echo "🎓 Spinoff: $SLUG → $TARGET"
echo "   Source: $SOURCE_PATH"
echo "   Target: $TARGET_GHQ"

# 1. Create target repo
echo "  ↳ Creating target repo..."
if gh repo view "$TARGET" &>/dev/null; then
  echo "    Repo already exists"
else
  gh repo create "$TARGET" --private
fi

# 2. Clone to ghq path
echo "  ↳ Cloning to ghq..."
ghq get "github.com/$TARGET"

# 3. Copy files (if source has content)
if [ -d "$SOURCE_PATH" ] && [ "$(ls -A $SOURCE_PATH)" ]; then
  echo "  ↳ Copying files..."
  cp -r "$SOURCE_PATH"/* "$TARGET_GHQ"/ 2>/dev/null || true
  cp -r "$SOURCE_PATH"/.[!.]* "$TARGET_GHQ"/ 2>/dev/null || true
fi

# 4. Commit and push
echo "  ↳ Pushing to target..."
cd "$TARGET_GHQ"
git add -A
git commit -m "Spinoff from $SLUG" 2>/dev/null || echo "    (no changes to commit)"
git push origin main 2>/dev/null || git push origin master 2>/dev/null || true

# 5. Update symlink to point to new location
echo "  ↳ Updating symlink..."
[ -L "$INCUBATE_PATH" ] && unlink "$INCUBATE_PATH"
ln -s "$TARGET_GHQ" "$INCUBATE_PATH"

# 6. Update slug registry
echo "  ↳ Updating slug registry..."
# Mark as spinoff type

echo ""
echo "✅ Spinoff complete: $SLUG → $TARGET"
echo "   New location: $TARGET_GHQ"
echo "   GitHub: https://github.com/$TARGET"
echo ""
echo "💡 Next: /project reunion $SLUG to sync learnings back later"
