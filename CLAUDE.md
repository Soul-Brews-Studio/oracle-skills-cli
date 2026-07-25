# Oracle Skills CLI

## Skills are the Only Source of Truth

There is **no `src/commands/` directory anymore**. Command stubs are generated
inline by the installer at install time (`src/cli/installer.ts`) for agents that
need them (OpenCode, Codex, Gemini). Claude Code invokes SKILL.md directly as `/name`.

## Public Shelf / Vault Split (the layout invariant)

**`skills/` = public shelf. `src/skills/` = vault. Membership IS curation.**

- `skills/` — the curated set. Every external channel serves exactly this
  directory: our CLI profiles, the Claude plugin marketplace
  (`.claude-plugin/marketplace.json` is generated from it 1:1), and
  `npx skills add Soul-Brews-Studio/arra-oracle-skills-cli` (it's the vercel
  CLI's priority-scan dir — finding it suppresses the recursive fallback).
  No `secret`/`hidden`/`zombie` flag ever belongs here (compile fails).
- `src/skills/` — everything non-public: `release-alpha`/`release-beta`
  (secret), `.archive/` (zombies — still installable via `-s <name>`),
  `.template/`. All carry `metadata: internal: true` so external installers
  skip them even under `--full-depth`. The archive **never** moves to the
  shelf — the vercel CLI scans dot-dirs inside containers.
- A skill name existing in BOTH roots is a split-brain (usually a rebase
  resurrecting `src/skills/<name>` after its move) — compile, generate-vfs,
  and discoverSkills all fail hard with a `git mv` hint.

### How It Works

```
skills/  +  src/skills/   →  bun run compile  →  .claude-plugin/marketplace.json
(shelf)     (vault)           (validate + gates)    (= readdir(skills/) exactly)
```

### Workflow

1. Edit skill in `skills/{name}/SKILL.md` (shelf) or `src/skills/` (vault)
2. Run `bun run compile` — validates frontmatter + regenerates marketplace.json
   (the lefthook pre-commit `regen-manifest` hook does this automatically)
3. Commit the marketplace.json change with your skill change (CI fails on drift)

### Creating New Skills

**IMPORTANT:** Every SKILL.md must have frontmatter with `name` and `description`:

```markdown
---
name: my-skill
description: Short description shown in skill list. Use when user says "trigger words".
---

# /my-skill

Full documentation here...
```

The compile script validates against the official Agent Skills spec and **fails on**:
- `name` >64 chars, not lowercase/digits/hyphens, or containing "claude"/"anthropic"
- `description` missing, >1024 chars, or containing XML tags
- missing frontmatter block

It **warns** (doesn't fail) when SKILL.md exceeds 500 lines — move detail to `references/`.

### Curation tiers → marketplace.json

`.claude-plugin/marketplace.json` is the explicit allowlist external ecosystems
read. Skills flagged `secret: true`, `hidden: true`, or `zombie: true` in
frontmatter (and everything under `src/skills/.archive/`) are **never listed**.
Note: unlisted ≠ private — files in this public repo are still readable by
anyone; see issue #441.

**Deciding what to zombie/archive** is data-driven, not vibes. Run the usage
census over your real Claude Code transcripts before demoting anything:

```bash
scripts/skill-usage-census.py                       # all skills, markdown table
scripts/skill-usage-census.py --skills recap,dig    # just these
scripts/skill-usage-census.py --json                # + monthly histogram
```

It counts user-typed (`/name`) and agent-invoked (Skill tool) hits separately by
parsing JSONL structurally (not `grep` — tool_result echoes and prose mentions
would inflate a raw count), and dedups cross-file copies left behind by repo
renames. `__tests__/census.test.ts` locks in those four behaviours.

### Installing Skills (Auto-Reload)

**DO NOT manually copy to `~/.claude/skills/`** — use the installer!

```bash
# Install specific skills (auto-reloads in Claude Code)
bun run src/cli/index.ts install -y -g --skill my-skill

# Install all skills
bun run src/cli/index.ts install -y -g
```

The installer:
1. Copies to `~/.claude/skills/`
2. Adds `installer: oracle-skills-cli v{version}` to frontmatter
3. Prepends `v{version} G-SKLL |` to description
4. Updates `.oracle-skills.json` manifest
5. **Auto-reloads** in Claude Code (no restart needed!)

### What Gets Generated

Each skill gets a command stub:

```markdown
---
description: v1.5.37 | [skill description]
---

# /{skill-name}

Execute the `{skill-name}` skill with the provided arguments.

## Instructions

1. Read the skill file: `{skillPath}/{skill-name}/SKILL.md`
2. Follow all instructions in the skill file
3. Pass these arguments to the skill: `$ARGUMENTS`
```

## Script Permissions

**All `.ts` and `.sh` scripts in `{skills,src/skills}/*/scripts/` must have executable permission!**

```bash
# When creating new scripts, always set +x
chmod +x skills/my-skill/scripts/my-script.ts
```

**Why:** Scripts with shebang (`#!/usr/bin/env bun`) require `+x` to be invoked directly. Without it, you get "permission denied" even with correct shebang.

**Check all scripts:**
```bash
find skills src/skills -name "*.ts" ! -name "*.test.ts" -exec ls -la {} \; | grep -v rwx
```

## Skills with Hooks

Skills with `hooks/hooks.json` are installed as Claude Code plugins:

- Regular skills → `~/.claude/skills/`
- Skills with hooks → `~/.claude/plugins/`

Currently `ralph-loop-soulbrews` has hooks.

## Branch Strategy — **alpha only**

**Everything targets `alpha`. There is no stable cut.** Not for features, not for
fixes, not for releases (Nat, 2026-07-25).

```bash
gh pr create --base alpha --head feat/my-thing --title "..."
```

`alpha` is now the repo's **default branch**, so `gh pr create` gets it right on its own —
but pass `--base alpha` anyway. A PreToolUse hook at `~/.claude/hooks/safety-pr-base.sh`
blocks any `gh pr create` here that targets `main` or omits `--base`; if it fires, fix the
flag rather than bypassing it.

### Why `main` is dead, not just discouraged

Every delivery path already reads `alpha`:

| path | reads |
|---|---|
| `/plugin marketplace add …` | the **default branch** — i.e. alpha |
| documented installs | `bunx --bun github:…#alpha` |
| CI | runs on alpha |

`main` has no consumer left, so cutting to it is ceremony that only adds ways to fail —
two of which happened on 2026-07-25:

- Merging `alpha → main` carries alpha's version onto main. `calver-release.yml` then
  computes a tag that **already exists** (created when alpha bumped) and dies on its
  collision guard — *after* the PR's own CI went green, because the collision only occurs
  post-merge. That killed PR #474; #475 was closed under this rule.
- A stale `bump:` riding inside a feature branch moves the version **backwards** (#467),
  and merging such a branch cut an unwanted stable tag off alpha.

So: no `alpha → main` PRs, no `release/*` branches, no `--stable` versions. If someone
asks for "a release", that means an alpha cut.

**`/alpha-feature`** commits to the `alpha` branch.
**`/release-alpha`** tags from `alpha` — and only alpha.

## Version Workflow — always /calver, never manual

Versions are **CalVer computed from date + time**: `v{yy}.{m}.{d}-alpha.{HMM}`
(e.g. 2026-07-06 10:44 → `v26.7.6-alpha.1044`). Never type a version by hand.

```bash
# Preview what the next version would be (no writes)
bun run calver -- --check

# Bump (writes package.json) — do this on alpha branch, at release time only
bun run calver

# Compile + test
bun run compile
bun test

# Commit + push (on alpha branch!) — CI tags + publishes from the bump commit
git add -A && git commit -m "bump: vYY.M.D-alpha.HMM"
git push origin alpha
```

Note: `bun run calver` writes package.json immediately — it is NOT a dry run.
marketplace.json intentionally carries no version field, so calver bumps never
touch it.
