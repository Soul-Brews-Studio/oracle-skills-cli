---
title: ## Skill Generation & Installation Flow
tags: [compile, install, generation, workflow, oracle-skills-cli]
created: 2026-01-27
source: Session 2026-01-27: speak skill - generation + install
---

# ## Skill Generation & Installation Flow

## Skill Generation & Installation Flow

**The 3-Step Pattern:**

```bash
# 1. CREATE - Write skill files
src/skills/{name}/
├── SKILL.md          # Frontmatter: name, description
└── scripts/{name}.ts # Optional automation script

# 2. GENERATE - Compile to command stubs
bun run compile
# → Creates src/commands/{name}.md (auto-generated, don't edit!)

# 3. INSTALL - Deploy with proper metadata
bun run src/cli/index.ts install -y -g --skill {name}
# → Installs to ~/.claude/skills/ with G-SKLL format
# → Auto-reloads in Claude Code!
```

**Key Insight:** 
- `compile` = generates command stubs for Claude Code to discover
- `install` = deploys to ~/.claude/skills/ with version metadata + auto-reload

**Never skip steps!** Manual `cp` bypasses metadata injection and auto-reload.

**Result:** `v1.5.39 G-SKLL | description...` (not "(user)" format)

---
*Added via Oracle Learn*
