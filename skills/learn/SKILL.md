---
name: learn
description: Explore a codebase with parallel Haiku agents — clone, read, and document. Modes — --fast (1 agent), default (3), --deep (5). Use when user says "learn [repo]", "explore codebase", "study this repo", or shares a GitHub URL to study. Do NOT trigger for finding projects (use /trace), session mining (use /dig), or cloning for active development (use /incubate).
argument-hint: "<repo-url> [--fast | --deep]"
---

# /learn - Deep Dive Learning Pattern

Explore a codebase with 3 parallel Haiku agents → create organized documentation.

## Usage

```
/learn [url]             # Auto: clone via ghq, symlink origin/, then explore
/learn [slug]            # Use slug from ψ/memory/slugs.yaml
/learn [repo-path]       # Path to repo
/learn [repo-name]       # Finds in ψ/learn/owner/repo
/learn --init            # Restore all origins after git clone (like submodule init)
```

## Depth Modes

| Flag | Agents | Files | Use Case |
|------|--------|-------|----------|
| `--fast` | 1 | 1 overview | Quick scan, "what is this?" |
| (default) | 3 | 3 docs | Normal exploration |
| `--deep` | 5 | 5 docs | Master complex codebases |

```
/learn --fast [target]   # Quick overview (1 agent, ~2 min)
/learn [target]          # Standard (3 agents, ~5 min)
/learn --deep [target]   # Deep dive (5 agents, ~10 min)
```

## Directory Structure

```
ψ/learn/
├── .origins             # Manifest of learned repos (committed)
└── owner/
    └── repo/
        ├── origin       # Symlink to ghq source (gitignored)
        ├── repo.md      # Hub file - links to all sessions (committed)
        └── YYYY-MM-DD/  # Date folder
            ├── 1349_ARCHITECTURE.md      # Time-prefixed files
            ├── 1349_CODE-SNIPPETS.md
            ├── 1349_QUICK-REFERENCE.md
            ├── 1520_ARCHITECTURE.md      # Second run same day
            └── ...
```

**Multiple learnings**: Each run gets time-prefixed files (HHMM_), nested in date folder.

**Offload source, keep docs:**
```bash
unlink ψ/learn/owner/repo/origin   # Remove symlink
ghq rm owner/repo                  # Remove source
# Docs remain in ψ/learn/owner/repo/
```

## /learn --init

Restore all origins after cloning (like `git submodule init`):

```bash
ROOT="$(pwd)"
# Read .origins manifest and restore symlinks
while read repo; do
  ghq get -u "https://github.com/$repo"
  OWNER=$(dirname "$repo")
  REPO=$(basename "$repo")
  mkdir -p "$ROOT/ψ/learn/$OWNER/$REPO"
  ln -sf "$(ghq root)/github.com/$repo" "$ROOT/ψ/learn/$OWNER/$REPO/origin"
  echo "✓ Restored: $repo"
done < "$ROOT/ψ/learn/.origins"
```

## Step 0: Detect Input Type + Resolve Path

**CRITICAL: Capture ABSOLUTE paths first (before spawning any agents):**
```bash
date "+🕐 %H:%M %Z (%A %d %B %Y)" && ROOT="$(pwd)"
echo "Learning from: $ROOT"
```

**IMPORTANT FOR SUBAGENTS:**
When spawning Haiku agents, you MUST give them TWO literal paths:
1. **SOURCE_DIR** (where to READ code) — the **`readlink`-RESOLVED ghq path**.
   **Never the `origin/` symlink path.** See ⚠️ below — this is not cosmetic.
2. **DOCS_DIR** (where to WRITE docs) - the parent directory, NOT inside origin/

⚠️ **BUG 1 (writes)**: If you only give agents `origin/` path, they cd into it and write there → files end up in WRONG repo!

⚠️ **BUG 2 (reads — worse, and silent)**: The `origin/` path is *nested inside
this oracle repo* (`ROOT/ψ/learn/...`). An agent handed that path reads the
target as a subdirectory of us and describes it as a variant of our repo. Measured
on `mattpocock/skills` (2026-08-16): the arm given the nested path produced 3
contaminated docs / 26 false claims; the arm given the resolved ghq path produced
**zero**. Same target, same minute, same model. Resolve it:

```bash
SOURCE_DIR="$(readlink "$ROOT/ψ/learn/$OWNER/$REPO/origin")"   # → ghq path
```

**FIX**: Always give BOTH paths as LITERAL absolute values (no variables!):

Example: ROOT=/home/user/ghq/.../my-oracle, learning acme-corp/cool-library, TODAY=2026-02-04, TIME=1349:
```
READ from:  /home/user/ghq/github.com/acme-corp/cool-library/     ← resolved, NOT under ψ/
WRITE to:   .../ψ/learn/acme-corp/cool-library/2026-02-04/1349_[FILENAME].md
```

Tell each agent: "Read from [SOURCE_DIR]. Write to [DOCS_DIR]/[TIME]_[FILENAME].md"

### ⚠️ MANDATORY: Isolation preamble (prepend to EVERY agent prompt)

Agents spawned here inherit **this oracle repo's** `CLAUDE.md` as project
instructions. They will silently describe the *target* repo using *our*
vocabulary. Measured on `mattpocock/skills` (2026-08-16): 3 of 5 docs
contaminated, 26 false structural claims — including a doc that wrote
*"(not in mattpocock/skills; reference from oracle-skills-cli CLAUDE.md)"*
and then asserted the claim anyway. **Detection is not containment.** The
agent noticing the mismatch does not stop it shipping.

Prepend this verbatim to every agent prompt:

```
ISOLATION RULE — read before anything else.
You are running inside an unrelated repo whose CLAUDE.md is in your context.
Its conventions describe YOUR HOST, not the target you are analyzing.
Document ONLY what you can cite from a file under SOURCE_DIR.
Before writing any structural claim (build tooling, versioning scheme,
directory layout, curation/lifecycle model, CI gates), verify it with a
concrete check — `ls`, reading package.json, reading the config file.
If you cannot cite it, write "not present" — never substitute a mechanism
you know from elsewhere, and never describe the target as a variant of
another repo.
```

**Do not soften this to "be careful."** The failure mode is confident and
fluent; only a citation requirement catches it.

### ⚠️ Absent-referent rule (the biggest single cause)

A mandated section with no material in the target is what actually produces
contamination. `TESTING.md` was demanded for a repo with **zero tests**; the
agent correctly wrote "no test infrastructure" — then filled the rest of the
page with our CalVer, our `bun run compile`, our "public shelf". The two docs
whose topics were fully sourced from the target's README came back spotless.

So: **every agent must be told the section may legitimately be empty.**

```
If the target has little or nothing for your assigned topic, say so plainly
in one or two lines and STOP. A short accurate doc is correct output. Do NOT
pad, and do NOT reach for mechanisms from any other repo to fill the page.
```

### ⚠️ Never let SOURCE_DIR read as "inside us"

`origin` is a symlink living under our own `ψ/`, so the target's absolute
path is nested in ours. An agent given only that path modeled the target as
*"this origin version"* — an upstream variant of our repo — and inherited our
architecture wholesale. **Resolve the symlink and hand agents the real path:**

```bash
SOURCE_DIR="$(readlink "$ROOT/ψ/learn/$OWNER/$REPO/origin")"   # → the ghq path
```

State the target's identity explicitly too: *"You are analyzing the
independent repository `OWNER/REPO`, which has no relationship to the repo
you are running inside."*

### If URL (http* or owner/repo format)

**Clone, create docs dir, symlink origin, update manifest:**
```bash
# Replace [URL] with actual URL
URL="[URL]"
ROOT="$(pwd)"  # CRITICAL: Save current directory!
ghq get -u "$URL" && \
  GHQ_ROOT=$(ghq root) && \
  OWNER=$(echo "$URL" | sed -E 's|.*github.com/([^/]+)/.*|\1|') && \
  REPO=$(echo "$URL" | sed -E 's|.*/([^/]+)(\.git)?$|\1|') && \
  mkdir -p "$ROOT/ψ/learn/$OWNER/$REPO" && \
  ln -sf "$GHQ_ROOT/github.com/$OWNER/$REPO" "$ROOT/ψ/learn/$OWNER/$REPO/origin" && \
  echo "$OWNER/$REPO" >> "$ROOT/ψ/learn/.origins" && \
  sort -u -o "$ROOT/ψ/learn/.origins" "$ROOT/ψ/learn/.origins" && \
  echo "✓ Ready: $ROOT/ψ/learn/$OWNER/$REPO/origin → source"
```

**Verify:**
```bash
ls -la "$ROOT/ψ/learn/$OWNER/$REPO/"
```

> **Note**: Grep tool doesn't follow symlinks — which is precisely why agents get the
> **resolved** `SOURCE_DIR` (`readlink ... /origin`) rather than the symlink path. On the
> resolved ghq path, plain `rg "pattern" "$SOURCE_DIR"` works and no `-L` is needed.
> (Historical: an oracle hit this symlink friction, switched to the direct path for
> unrelated reasons, and accidentally produced the only uncontaminated run — see BUG 2.)

### Then resolve path:
```bash
# Find by name (searches origin symlinks)
find ψ/learn -name "origin" -type l | xargs -I{} dirname {} | grep -i "$INPUT" | head -1
```

## Scope

**For external repos**: Clone with script first, then explore via `origin/`
**For local projects** (in `specs/`, `ψ/lib/`): Read directly

## Step 1: Detect Mode & Calculate Paths

Check arguments for `--fast` or `--deep`:
- `--fast` → Single overview agent
- `--deep` → 5 parallel agents
- (neither) → 3 parallel agents (default)

**Calculate ACTUAL paths (replace variables with real values):**
```
TODAY = YYYY-MM-DD (e.g., 2026-02-04)
TIME = HHMM (e.g., 1349)
REPO_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/
DOCS_DIR = [ROOT]/ψ/learn/[OWNER]/[REPO]/[TODAY]/   ← date folder
SOURCE_DIR = $(readlink [ROOT]/ψ/learn/[OWNER]/[REPO]/origin)  ← RESOLVED ghq path.
             Never pass the ψ/-nested symlink path to an agent (see BUG 2 above).
FILE_PREFIX = [TIME]_                               ← time prefix for files

Example:
- ROOT = /home/user/ghq/github.com/my-org/my-oracle
- OWNER = acme-corp
- REPO = cool-library
- TODAY = 2026-02-04, TIME = 1349
- DOCS_DIR = .../ψ/learn/acme-corp/cool-library/2026-02-04/
- Files: 1349_ARCHITECTURE.md, 1349_CODE-SNIPPETS.md, etc.
```

**⚠️ CRITICAL: Create symlink AND date folder FIRST, then spawn agents!**

1. Run the clone + symlink script in Step 0 FIRST
2. Capture TIME: `date +%H%M` (e.g., 1349)
3. Create the date folder: `mkdir -p "$DOCS_DIR"`
4. Capture DOCS_DIR, SOURCE_DIR, and TIME as literal values
5. THEN spawn agents with paths including TIME prefix

**Multiple runs same day?** Each run gets unique TIME prefix → no overwrites.

---

## Mode: --fast (1 agent)

### Single Agent: Quick Overview

**Prompt the agent with (use LITERAL paths, not variables!):**
```
You are exploring a codebase.

READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_OVERVIEW.md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!

Analyze:
- What is this project? (1 sentence)
- Key files to look at
- How to use it (install + basic example)
- Notable patterns or tech
```

**Skip to Step 2** after agent completes.

---

## Mode: Default (3 agents)

Launch 3 agents in parallel. Each prompt must include (use LITERAL paths!):
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_[filename].md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

### Agent 1: Architecture Explorer → `[TIME]_ARCHITECTURE.md`
- Directory structure
- Entry points
- Core abstractions
- Dependencies

### Agent 2: Code Snippets Collector → `[TIME]_CODE-SNIPPETS.md`
- Main entry point code
- Core implementations
- Interesting patterns

### Agent 3: Quick Reference Builder → `[TIME]_QUICK-REFERENCE.md`
- What it does
- Installation
- Key features
- Usage patterns

**Skip to Step 2** after all agents complete.

---

## Mode: --deep (5 agents)

Launch 5 agents in parallel. Each prompt must include (use LITERAL paths!):
```
READ source code from: [SOURCE_DIR]
WRITE your output to:   [DOCS_DIR]/[TIME]_[filename].md

⚠️ IMPORTANT: Write to DOCS_DIR (the date folder), NOT inside origin/!
```

### Agent 1: Architecture Explorer → `[TIME]_ARCHITECTURE.md`
- Directory structure & organization philosophy
- Entry points (all of them)
- Core abstractions & their relationships
- Dependencies (direct + transitive patterns)

### Agent 2: Code Snippets Collector → `[TIME]_CODE-SNIPPETS.md`
- Main entry point code
- Core implementations with context
- Interesting patterns & idioms
- Error handling examples

### Agent 3: Quick Reference Builder → `[TIME]_QUICK-REFERENCE.md`
- What it does (comprehensive)
- Installation (all methods)
- Key features with examples
- Configuration options

### Agent 4: Testing & Quality Patterns → `[TIME]_TESTING.md`
- Test structure and conventions
- Test utilities and helpers
- Mocking patterns
- Coverage approach

### Agent 5: API & Integration Surface → `[TIME]_API-SURFACE.md`
- Public API documentation
- Extension points / hooks
- Integration patterns
- Plugin/middleware architecture

**Skip to Step 2** after all agents complete.

## Step 1.9: Contamination check (REQUIRED — before the hub file)

Agents that leak are fluent and confident; you cannot spot it by reading. Grep
for **our** distinctive vocabulary appearing in docs about **their** repo:

```bash
# Terms distinctive to THIS oracle repo. A hit means the doc is describing us.
rg -n --stats "src/skills|split-brain|bun run compile|public shelf|CalVer|G-SKLL|zombie|lefthook" \
   "$DOCS_DIR"/${TIME}_*.md
```

Any hit → verify that specific claim against the target before trusting the
doc. Cheap structural checks settle most of them instantly:

```bash
ls -d "$SOURCE_DIR/src" 2>&1                                  # does the vault exist?
python3 -c "import json;print(json.load(open('$SOURCE_DIR/package.json')).get('scripts'))"
```

If a doc is contaminated, **prepend a correction banner naming each false
claim and its verified reality** — do not silently delete, and do not just
warn generically. Check **every** doc: a partial pass leaves a poisoned file
looking clean by omission (this happened — `TESTING.md` was missed on the
first pass and read as verified for 25 minutes).

## Step 2: Create/Update Hub File ([REPO].md)

```markdown
# [REPO] Learning Index

## Source
- **Origin**: ./origin/
- **GitHub**: https://github.com/$OWNER/$REPO

## Explorations

### [TODAY] [TIME] ([mode])
- [[YYYY-MM-DD/HHMM_ARCHITECTURE|Architecture]]
- [[YYYY-MM-DD/HHMM_CODE-SNIPPETS|Code Snippets]]
- [[YYYY-MM-DD/HHMM_QUICK-REFERENCE|Quick Reference]]
- [[YYYY-MM-DD/HHMM_TESTING|Testing]]        <!-- --deep only -->
- [[YYYY-MM-DD/HHMM_API-SURFACE|API Surface]] <!-- --deep only -->

**Key insights**: [2-3 things learned]

### [TODAY] [EARLIER-TIME] ([mode])
...
```

## Output Summary

After learning completes, print the hub + generated file paths.

# announce-mode → absolute path (no ψ/, no ~/, no $VAR, no ...).
# Use:  echo "marker: $RESOLVED_PATH"  — bash substitutes. See CONVENTIONS.md.

```bash
echo "📚 Hub: $REPO_DIR/$REPO.md"
echo "📚 Files: $DOCS_DIR/${TIME}_*.md"
ls "$DOCS_DIR"/${TIME}_*.md
```

Files generated depend on mode (`--fast` → 1 overview; default → 3 docs; `--deep` → 5 docs). Add a 2–3 line "Key Insights" summary after the file listing.

## .gitignore Pattern

For Oracles that want to commit docs but ignore symlinks:

```gitignore
# Ignore origin symlinks only (source lives in ghq)
# Note: no trailing slash - origin is a symlink, not a directory
ψ/learn/**/origin
```

**After running /learn**, check your repo's `.gitignore` has these patterns so docs are committed but symlinks are ignored.

## Trace Connection

After writing docs, log the learning to Oracle so it's discoverable via `/trace`:

### Save the lesson (two-layer pattern)

1. Write to `ψ/memory/learnings/YYYY-MM-DD_<slug>.md` with frontmatter:
   ```yaml
   ---
   pattern: "Learned [REPO]: [2-3 key insights]"
   date: <today>
   source: learn: OWNER/REPO
   concepts: ["learn", "codebase", <relevant-tags>]
   ---

   # Learned [REPO]
   <2-3 key insights in body>
   ```

2. The Oracle's auto-memory layer picks up new files in `ψ/memory/learnings/` automatically — no separate API call needed.

This connects `/learn` to the shared knowledge layer — future `/trace` queries find what was learned.

## Notes

- `--fast`: 1 agent, quick scan for "what is this?"
- Default: 3 agents in parallel, good balance
- `--deep`: 5 agents, comprehensive for complex repos
- Haiku for exploration = cost effective
- Main reviews = quality gate
- `origin/` structure allows easy offload
- `.origins` manifest enables `--init` restore
