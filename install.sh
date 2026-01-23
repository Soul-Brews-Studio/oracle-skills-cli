#!/bin/bash
# Oracle Skills Installer - One command to install everything

set -e

echo "🔮 Oracle Skills Installer"
echo ""

# 0. Check & install Claude Code
if ! command -v claude &> /dev/null; then
  echo "📦 Installing Claude Code..."
  curl -fsSL https://claude.ai/install.sh | bash
else
  echo "✓ Claude Code installed"
fi

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

# 4. Setup permissions
echo "🔐 Setting up permissions..."
mkdir -p .claude
cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(gh:*)", "Bash(ghq:*)", "Bash(git:*)",
      "Bash(bun:*)", "Bash(bunx:*)", "Bash(mkdir:*)", "Bash(ln:*)",
      "Bash(rg:*)", "Bash(date:*)", "Bash(ls:*)", "Bash(tree:*)",
      "Bash(curl:*)", "Bash(du:*)", "Bash(wc:*)",
      "Bash(*ψ/*)", "Bash(*psi/*)",
      "Skill(learn)", "Skill(trace)", "Skill(awaken)",
      "Skill(rrr)", "Skill(recap)", "Skill(project)"
    ]
  }
}
EOF
echo "✓ permissions configured"

echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  ✨ Done! Now:                          │"
echo "│                                         │"
echo "│  1. Restart Claude Code                 │"
echo "│  2. Run: /awaken                        │"
echo "└─────────────────────────────────────────┘"
