#!/bin/bash
# create.sh - Create new GitHub repo, init, commit, push
# Usage: create.sh <name> [--public]
#
# Default: private repo
# --public: make repo public

set -e

ROOT="/Users/nat/Code/github.com/laris-co/Nat-s-Agents"
ORG="laris-co"

NAME="$1"
VISIBILITY="private"

# Check for --public flag
if [[ "$2" == "--public" ]] || [[ "$1" == "--public" ]]; then
  VISIBILITY="public"
  if [[ "$1" == "--public" ]]; then
    NAME="$2"
  fi
fi

if [ -z "$NAME" ]; then
  echo "Usage: create.sh <name> [--public]"
  echo ""
  echo "Examples:"
  echo "  create.sh oracle-framework          # private repo"
  echo "  create.sh oracle-framework --public # public repo"
  exit 1
fi

GHQ_PATH="$HOME/Code/github.com/$ORG/$NAME"
INCUBATE_PATH="$ROOT/ψ/incubate/$NAME"

echo "🆕 Creating: $ORG/$NAME ($VISIBILITY)"

# 1. Create GitHub repo
echo "  ↳ Creating GitHub repo..."
gh repo create "$ORG/$NAME" --"$VISIBILITY" --clone=false 2>/dev/null || {
  echo "  ↳ Repo may already exist, continuing..."
}

# 2. Clone via ghq
echo "  ↳ Cloning via ghq..."
ghq get -u "github.com/$ORG/$NAME" 2>/dev/null || true

# 3. Init if empty
if [ ! -d "$GHQ_PATH/.git" ]; then
  echo "  ↳ Initializing git..."
  mkdir -p "$GHQ_PATH"
  cd "$GHQ_PATH"
  git init
  git remote add origin "git@github.com:$ORG/$NAME.git"
fi

# 4. Create README if empty
if [ ! -f "$GHQ_PATH/README.md" ]; then
  echo "  ↳ Creating README..."
  echo "# $NAME" > "$GHQ_PATH/README.md"
  echo "" >> "$GHQ_PATH/README.md"
  echo "Created by Oracle Open Framework" >> "$GHQ_PATH/README.md"
fi

# 5. Initial commit if needed
cd "$GHQ_PATH"
if [ -z "$(git log --oneline 2>/dev/null | head -1)" ]; then
  echo "  ↳ Initial commit..."
  git add -A
  git commit -m "Initial commit

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
fi

# 6. Push
echo "  ↳ Pushing to origin..."
git push -u origin main 2>/dev/null || git push -u origin master 2>/dev/null || {
  git branch -M main
  git push -u origin main
}

# 7. Create symlink to incubate
echo "  ↳ Linking to ψ/incubate/..."
mkdir -p "$ROOT/ψ/incubate"
[ -L "$INCUBATE_PATH" ] && unlink "$INCUBATE_PATH"
ln -sf "$GHQ_PATH" "$INCUBATE_PATH"

echo ""
echo "✅ Created: $ORG/$NAME ($VISIBILITY)"
echo "   GitHub: https://github.com/$ORG/$NAME"
echo "   Local:  $GHQ_PATH"
echo "   Linked: ψ/incubate/$NAME"
