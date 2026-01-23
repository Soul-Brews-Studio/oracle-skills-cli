#!/bin/bash
# Oracle Skills Installer - One command to install everything

set -e

echo "🔮 Oracle Skills Installer"
echo ""

# 1. Check & install bun
if ! command -v bun &> /dev/null; then
  echo "📦 Installing bun..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="$HOME/.bun/bin:$PATH"
else
  echo "✓ bun installed"
fi

# 2. Check & install ghq
if ! command -v ghq &> /dev/null; then
  echo "📦 Installing ghq..."
  if command -v brew &> /dev/null; then
    brew install ghq
  elif command -v go &> /dev/null; then
    go install github.com/x-motemen/ghq@latest
  else
    echo "⚠️  Please install ghq manually: brew install ghq"
  fi
else
  echo "✓ ghq installed"
fi

# 3. Install oracle-skills
echo "📦 Installing oracle-skills..."
~/.bun/bin/bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli \
  install -g -y

# 4. Pre-approve permissions (Claude Code)
if [ ! -f .claude/settings.local.json ]; then
  echo "🔐 Setting up permissions..."
  mkdir -p .claude
  cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(gh:*)", "Bash(ghq:*)", "Bash(git:*)",
      "Bash(bun:*)", "Bash(mkdir:*)", "Bash(ln:*)",
      "Bash(rg:*)", "Bash(date:*)", "Bash(cat:*)",
      "Bash(*ψ/*)", "Bash(*psi/*)"
    ]
  }
}
EOF
else
  echo "✓ permissions already configured"
fi

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  ✨ Done! Now run:                      │"
echo "│                                         │"
echo "│  claude .                               │"
echo "│  /awaken                                │"
echo "└─────────────────────────────────────────┘"
