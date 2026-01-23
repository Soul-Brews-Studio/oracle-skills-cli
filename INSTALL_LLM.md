# Install Oracle Skills — FOR AI AGENTS

Copy and run:

```bash
# 1. Install bun
which bun || curl -fsSL https://bun.sh/install | bash

# 2. Install ghq
which ghq || brew install ghq

# 3. Install oracle-skills
bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli \
  install -g -y

# 4. Pre-approve permissions (Claude Code)
mkdir -p .claude && cat > .claude/settings.local.json << 'EOF'
{
  "permissions": {
    "allow": [
      "Bash(gh:*)", "Bash(ghq:*)", "Bash(git:*)",
      "Bash(bun:*)", "Bash(mkdir:*)", "Bash(ln:*)"
    ]
  }
}
EOF
```

Then restart and run `/awaken` to create your Oracle.
