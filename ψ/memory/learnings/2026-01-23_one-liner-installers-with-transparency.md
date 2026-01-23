# One-Liner Installers with Transparency

**Date**: 2026-01-23
**Context**: oracle-skills-cli install.sh development
**Confidence**: High

## Key Learning

When creating `curl | bash` installers, the common concern is "what am I running?" The solution is transparency: show the script content inline with an expandable section. Users can verify before running, AI agents can read and understand.

The key insight is that the install script should output a **copyable prompt** for the next step, not try to do everything itself. When installation requires restart (like Claude Code skills), the install script can't continue - it needs to hand off to a fresh session.

## The Pattern

```markdown
## Install

```bash
curl -fsSL https://raw.githubusercontent.com/.../install.sh | bash
```

<details>
<summary>📜 View install.sh (safe & transparent)</summary>

```bash
#!/bin/bash
# Full script content here for inspection
```

</details>
```

For handoff to fresh session:
```bash
echo "─────────────────────────────────────────"
cat << 'PROMPT'
[Instructions for fresh Claude to follow]
PROMPT
echo "─────────────────────────────────────────"
```

## Why This Matters

1. **Trust**: Users can verify script before running
2. **AI-friendly**: LLMs can read and understand the installation
3. **Clean handoff**: When restart required, prompt gets copied to new session
4. **Single source of truth**: Script in repo, not duplicated in docs

## Tags

`installation`, `curl-bash`, `transparency`, `handoff`, `cli`
