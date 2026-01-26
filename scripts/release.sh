#!/bin/bash
set -e

# Release script for oracle-skills-cli
# Usage: ./scripts/release.sh [patch|minor|major]
#        ./scripts/release.sh 1.5.37  (specific version)

CURRENT=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)
echo "Current version: $CURRENT"

# Determine new version
if [[ "$1" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW_VERSION="$1"
elif [[ "$1" == "major" ]]; then
  NEW_VERSION=$(echo $CURRENT | awk -F. '{print $1+1".0.0"}')
elif [[ "$1" == "minor" ]]; then
  NEW_VERSION=$(echo $CURRENT | awk -F. '{print $1"."$2+1".0"}')
else
  # Default: patch
  NEW_VERSION=$(echo $CURRENT | awk -F. '{print $1"."$2"."$3+1}')
fi

echo "New version: $NEW_VERSION"
echo ""

# Confirm
read -p "Release v$NEW_VERSION? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "📦 Bumping version..."

# 1. Update package.json
sed -i '' "s/\"version\": \"$CURRENT\"/\"version\": \"$NEW_VERSION\"/" package.json

# 2. Update version in skill files that reference it
find src/skills -name "SKILL.md" -exec sed -i '' "s/v$CURRENT/v$NEW_VERSION/g" {} \;

# 3. Compile skills
echo "🔮 Compiling skills..."
bun run compile

# 4. Commit
echo "📝 Committing..."
git add -A
git commit -m "chore: release v$NEW_VERSION"

# 5. Push
echo "🚀 Pushing to main..."
git push origin main

# 6. Tag
echo "🏷️  Creating tag v$NEW_VERSION..."
git tag "v$NEW_VERSION"
git push origin "v$NEW_VERSION"

echo ""
echo "✅ Released v$NEW_VERSION!"
echo ""
echo "GitHub Actions will now:"
echo "  1. Run tests"
echo "  2. Create GitHub Release"
echo ""
echo "Check: https://github.com/Soul-Brews-Studio/oracle-skills-cli/actions"
