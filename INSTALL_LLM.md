# Install Oracle Skills — FOR AI AGENTS

Copy and run:

```bash
# Requirements: bash/zsh (macOS/Linux) or Git Bash (Windows)

# 1. Check & install bun
which bun || curl -fsSL https://bun.sh/install | bash

# 2. Check & install ghq (for /learn and /trace)
which ghq || brew install ghq  # macOS
# Linux/Windows: go install github.com/x-motemen/ghq@latest

# 3. Install oracle-skills
bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli \
  install -g -y

# 4. Pre-approve Oracle commands (Claude Code)
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

# 5. Create alias (add to ~/.bashrc or ~/.zshrc)
alias oracle-skills='bunx --bun \
  oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli'

# 6. Usage (with alias)
oracle-skills install -g -y
oracle-skills list -g
oracle-skills uninstall -g -y

# Or full command
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli install -g -y
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli list -g
bunx --bun oracle-skills@github:Soul-Brews-Studio/oracle-skills-cli uninstall -g -y

# Flags
# -g  Global (user) directory
# -y  Skip prompts
# -a  Target agent(s)
# -s  Specific skill(s)
```

Then restart and run `/awaken` to create your Oracle.
