---
name: forward
description: Hand off the current session to the next one. Use when user says "forward", "handoff", "wrap up", or before ending a session.
argument-hint: "[--bg | asap | --only]"
---

# /forward - Handoff to Next Session

Create context for next session, then enter plan mode to define next steps.

## Usage

```
/forward              # Create handoff, show plan, wait for approval
/forward --bg         # Hand the whole handoff to a background Haiku — returns instantly
/forward asap         # Create handoff + commit immediately (no approval needed)
/forward --only       # Create handoff only, skip plan mode
```

---

## /forward --bg

**Fire-and-forget.** A background Haiku subagent mines the session JSONL and writes the
handoff file. Returns immediately — no plan mode, no blocking. Use it to snapshot progress
mid-session, or at the end when you'd rather keep moving. For the full interactive flow
with plan approval, use plain `/forward`.

Haiku is the right tier here: this is bullet extraction from structured JSONL, not writing.
(Its sibling `/rrr --bg` uses Sonnet — a retro's diary and lessons *are* writing.)

### Resolve first, then spawn

```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
ENCODED_PWD=$(echo "$ORACLE_ROOT" | sed 's|^/|-|; s|[/.]|-|g')
PROJECT_DIR="$HOME/.claude/projects/${ENCODED_PWD}"
LATEST_JSONL=$(ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -1)
SESSION_ID=$(basename "$LATEST_JSONL" .jsonl | cut -c1-8)
PSI=$(readlink -f "$ORACLE_ROOT/ψ" 2>/dev/null || echo "$ORACLE_ROOT/ψ")
REPO_NAME=$(basename "$ORACLE_ROOT")
DATE_SLUG=$(date +%Y-%m-%d_%H-%M)
```

Substitute every `<PLACEHOLDER>` with the real value before spawning — the subagent
cannot see your shell. Check whether the handoff directory exists; if not, tell the
subagent to `mkdir -p` it.

### Spawn ONE background Agent (`model: "haiku"`, `run_in_background: true`)

```
You are a session archivist. Write a handoff file for the current session.

JSONL path: <LATEST_JSONL>
Vault path (PSI): <PSI>
Session ID: <SESSION_ID>
Repo: <REPO_NAME>
Date: <YYYY-MM-DD HH:MM>

Steps:
1. Run: python3 "$(ls ~/.claude/skills/forward/scripts/dig-session.py \
             ~/.claude/plugins/marketplaces/*/skills/forward/scripts/dig-session.py \
             ~/.claude/plugins/cache/*/*/*/skills/forward/scripts/dig-session.py \
             ~/.claude/skills/forward/dig-session.py 2>/dev/null | head -1)" "<LATEST_JSONL>"
2. From the JSON output, write 4-8 bullets summarizing what happened. Be specific:
   skills invoked, teammates used, files changed, key outputs.
3. Run: git -C <ORACLE_ROOT> status --short
4. Write the handoff to: <PSI>/inbox/handoff/<DATE_SLUG>_bg-forward.md

Format:

# Handoff: [session focus from the JSONL]

**Date**: <YYYY-MM-DD HH:MM>
**Source**: /forward --bg (JSONL-mined, not memory)
📡 Session: <SESSION_ID> | <REPO_NAME>

## What We Did
<bullets from the JSONL analysis>

## Uncommitted Files
<from git status --short, or "none">

## Pending
<infer from the session: what was in progress? what was mentioned but not done?>

## Next Session
<1-3 specific actions based on where the session ended>

After writing, print: "📤 Handoff written: <absolute_path>"
Do NOT enter plan mode. Do NOT commit anything.
```

### After spawning

Tell the user where it will land, then **keep working — don't wait**:

```
📤 /forward --bg launched — handoff writing in background.
   Session: <SESSION_ID>
   Will write to: <PSI>/inbox/handoff/<DATE_SLUG>_bg-forward.md
```

Sibling: `/rrr --bg` (retrospective). Run both at session end — `/rrr --bg` looks back,
`/forward --bg` looks forward.

## Steps

1. **Git status**: Check uncommitted work
2. **Detect session**: Current session ID for traceability
3. **Session summary**: What we did (from memory)
4. **Pending items**: What's left
5. **Next steps**: Specific actions

### Session Detection

```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)
ENCODED_PWD=$(echo "$ORACLE_ROOT" | sed 's|^/|-|; s|[/.]|-|g')
PROJECT_DIR="$HOME/.claude/projects/${ENCODED_PWD}"
LATEST_JSONL=$(ls -t "$PROJECT_DIR"/*.jsonl 2>/dev/null | head -1)
if [ -n "$LATEST_JSONL" ]; then
  SESSION_ID=$(basename "$LATEST_JSONL" .jsonl)
  echo "SESSION: ${SESSION_ID:0:8}"
fi
```

Include in handoff header if detected:
```markdown
📡 Session: 74c32f34 | repo-name | Xh XXm
```
Skip silently if detection fails.

## Output

Resolve vault path first:
```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$ORACLE_ROOT" ] && [ -f "$ORACLE_ROOT/CLAUDE.md" ] && { [ -d "$ORACLE_ROOT/ψ" ] || [ -L "$ORACLE_ROOT/ψ" ]; }; then
  PSI=$(readlink -f "$ORACLE_ROOT/ψ" 2>/dev/null || echo "$ORACLE_ROOT/ψ")
else
  PSI=$(readlink -f ψ 2>/dev/null || echo "ψ")
fi
```

Write to: `$PSI/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`

**IMPORTANT**: Always use the resolved `$PSI` path, never the `ψ/` symlink directly.
This ensures handoffs go to the project's vault (wherever ψ points).
Do NOT `git add` vault files — they are shared state, not committed to repos.

```markdown
# Handoff: [Session Focus]

**Date**: YYYY-MM-DD HH:MM
**Context**: [%]

## What We Did
- [Accomplishment 1]
- [Accomplishment 2]

## Pending
- [ ] Item 1
- [ ] Item 2

## Next Session
- [ ] Specific action 1
- [ ] Specific action 2

## Key Files
- [Important file 1]
- [Important file 2]
```

### Confirm handoff write (announce-mode — absolute paths required)

# announce-mode → absolute path (no ψ/, no ~/, no $VAR, no ...).
# Use:  echo "marker: $RESOLVED_PATH"  — bash substitutes. See CONVENTIONS.md.

```bash
HANDOFF_FILE="$PSI/inbox/handoff/$(date +%Y-%m-%d_%H-%M)_${SLUG}.md"
echo "📤 Handoff: $HANDOFF_FILE"
```

## Then: Create Issues from Pending Items

After writing the handoff file, extract actionable items and offer to create GitHub issues.

### Step 1: Extract Items

From the handoff you just wrote, collect all `- [ ]` items from **Pending** and **Next Session** sections.

### Step 2: Filter Actionable Items

Skip items that are NOT actionable:
- Items containing "monitor", "watch", "track", "deferred", "maybe", "consider"
- Items that are vague (less than 4 words after the checkbox)

### Step 3: Check for Duplicates

```bash
# For each item, check if an issue already exists with a similar title
gh issue list --state open --search "ITEM_TITLE" --json title --jq '.[].title' 2>/dev/null
```

Skip items that already have a matching open issue (case-insensitive title match).

### Step 4: Show and Confirm

Display the list of new issues to create:

```
📋 Create GitHub issues from pending items?

  1. Fix awaken git push auth
  2. /rrr --deep time-based

Create these 2 issues? [y/N]
```

**NEVER auto-create issues without user approval.**

If user declines, skip issue creation and continue to plan mode.

### Step 5: Create Issues

If user approves:

```bash
# Detect repo for issue creation
REMOTE=$(git remote get-url origin 2>/dev/null)
# Extract owner/repo from remote URL
REPO=$(echo "$REMOTE" | sed -E 's|.*[:/]([^/]+/[^/]+?)(\.git)?$|\1|')

# For each actionable item:
gh issue create --repo "$REPO" --title "ITEM_TITLE" --body "From /forward handoff on YYYY-MM-DD"
```

Show results:
```
Created #115: Fix awaken git push auth
Created #116: /rrr --deep time-based
```

### Step 6: Write to Outbox

Regardless of whether issues were created, write items to the outbox:

```bash
ORACLE_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$ORACLE_ROOT" ] && [ -f "$ORACLE_ROOT/CLAUDE.md" ] && { [ -d "$ORACLE_ROOT/ψ" ] || [ -L "$ORACLE_ROOT/ψ" ]; }; then
  PSI=$(readlink -f "$ORACLE_ROOT/ψ" 2>/dev/null || echo "$ORACLE_ROOT/ψ")
else
  PSI=$(readlink -f ψ 2>/dev/null || echo "ψ")
fi
OUTBOX_DIR="$PSI/outbox"
mkdir -p "$OUTBOX_DIR"
```

Write to: `$PSI/outbox/YYYY-MM-DD_pending.md`

```markdown
# Pending Items — YYYY-MM-DD

## From: [repo-name] /forward

- [ ] Item 1 (issue #115)
- [ ] Item 2 (issue #116)
- [ ] Item 3 (no issue — skipped: vague)
```

### Confirm outbox write (announce-mode — absolute paths required)

# announce-mode → absolute path (no ψ/, no ~/, no $VAR, no ...).
# Use:  echo "marker: $RESOLVED_PATH"  — bash substitutes. See CONVENTIONS.md.

```bash
OUTBOX_FILE="$OUTBOX_DIR/$(date +%Y-%m-%d)_pending.md"
echo "📋 Outbox: $OUTBOX_FILE"
```

### Silent Failures

- If `gh` is not available: write to outbox only, skip issue creation silently
- If repo has no GitHub remote: skip issue creation silently, write to outbox only
- If `gh auth status` fails: skip issue creation silently, write to outbox only

---

## Then: Report to jan (family digest — fleet only)

If this Oracle is part of the maw family fleet (`maw` is on PATH), send a one-shot
digest to **jan**, the family's central index Oracle. This implements the family rule
(Earth, 2026-06-16): every house reports to jan after /rrr + /forward, before closing —
so family status is push-collected centrally, not pulled per-house. If `maw` is absent,
skip this whole step silently.

Send it (durable — `--inbox` is REQUIRED, otherwise maw only pane-injects into jan's
shell and **no inbox file is created**):

```bash
command -v maw >/dev/null 2>&1 && \
maw hey --inbox --from <host>:<house> local:jan "[report:<house>] $(date '+%Y-%m-%d %H:%M')
did: <1-3 lines from the handoff 'What We Did'>
decision: <key decision/change, if any>
lesson: <new lesson crystallized, if any>
blocker: <🔴 hard / ⚠️ some / — none>
next: <carried-forward next action from the handoff>"
```

- `<house>` = this Oracle's name (repo dir without the `oracle-` prefix).
  `<host>` = the maw host on this machine.
- **Fallback** (bus down / unsure it landed): write the digest as markdown directly to
  `~/Desktop/oracle-jan/ψ/inbox/<YYYY-MM-DD_HH-MM>_report-from-<house>.md` with
  frontmatter (`from` / `to` / `timestamp` / `read: false`) + the digest body, then
  verify the file exists.
- **Point, don't copy**: the report is a digest — full sources (handoff/retro) stay in
  the house vault. It does **not** duplicate the handoff (handoff = for this house's next
  session; report = for the family's central index).
- Spec: `~/Desktop/oracle-jan/ψ/active/REPORT-PROTOCOL.md`. Don't block on this — if maw
  errors, note it and continue to the plan box.

---

## Then: MUST Show Plan Approval Box

**CRITICAL — DO NOT SKIP**: The whole point of /forward is the plan approval UI.
You MUST do ALL 3 steps in order. If you skip any step, the user cannot approve and clear the session.

1. `EnterPlanMode` — enters plan mode
2. Write plan file — session summary + next steps
3. `ExitPlanMode` — **THIS shows the approval box** where user can approve/reject/clear

If you only do EnterPlanMode without ExitPlanMode, the user sees nothing.
If you skip EnterPlanMode entirely, the user sees nothing.
ALL 3 STEPS ARE REQUIRED.

**Do NOT commit the handoff file** — it lives in the vault, not the repo.
After writing the handoff, gather cleanup context:

```bash
# Check for things next session might need to clean up
git status --short
git branch --list | grep -v '^\* main$' | grep -v '^  main$'
gh pr list --state open --json number,title,headRefName --jq '.[] | "#\(.number) \(.title) (\(.headRefName))"' 2>/dev/null
gh issue list --state open --limit 5 --json number,title --jq '.[] | "#\(.number) \(.title)"' 2>/dev/null
```

Then:

1. **Call `EnterPlanMode`** tool
3. In plan mode, write a plan file with:
   - What we accomplished this session
   - Pending items carried forward
   - Cleanup needed (stale branches, open PRs, uncommitted files)
   - Next session goals and scope
   - Reference to handoff file path
   - **Always end plan with a choice table:**

```markdown
## Next Session: Pick Your Path

| Option | Command | What It Does |
|--------|---------|--------------|
| **Continue** | `/recap` | Pick up where we left off |
| **Clean up first** | See cleanup list below, then `/recap` | Merge PRs, delete branches, close issues, then continue |
| **Fresh start** | `/recap --quick` | Minimal context, start something new |

### Cleanup Checklist (if any)
- [ ] [Open PR to merge]
- [ ] [Stale branch to delete]
- [ ] [Issue to close]
- [ ] [Uncommitted work to commit or stash]
```

4. **Call `ExitPlanMode`** — user sees the built-in plan approval UI

The user gets the standard plan approval screen with options to approve, modify, or reject. This is the proper way to show plans.

If user calls `/forward` again — just show the existing plan, do not re-create the handoff file.

## Wizard v2 Context in Handoff

If CLAUDE.md contains demographics from `/awaken` wizard v2, include in handoff:

```markdown
## Context
**Oracle**: [name] ([pronouns]) | **Human**: [name] ([pronouns])
**Mode**: [Fast/Full Soul Sync] | **Memory**: [auto/manual]
**Team**: [solo/team context]
```

This helps the next session orient faster. If demographics not present, skip.

---

## ASAP Mode

If user says `/forward asap` or `/forward now`:
- Write handoff file
- **Immediately commit and push** — no approval needed
- Skip plan mode
- User wants to close fast

## Skip Plan Mode

If user says `/forward --only`:
- Skip plan mode after commit
- Just tell user: "💡 Run /plan to plan next session"

ARGUMENTS: $ARGUMENTS
