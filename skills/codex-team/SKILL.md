---
name: codex-team
description: Spawn, lead, and tear down a team of omx/codex coders from a Claude lead — preflight the machine, pick the team shape, create isolated worktrees, heal the fresh-worktree boot pitfall, dispatch with done-criteria via `maw hey`, run the 10-minute peek/nudge loop, gate and merge PRs, then shut down without losing work. Trigger eagerly on "codex team", "spawn coders", "set up a team", "add codex N", "lead the team", "dispatch to coders", "peek the coders", "nudge the team", "team up", "tear down the team", "ตั้งทีม codex", "เปิดทีม", "สั่งงาน coder", "ส่องทีม", "ปลุกทีม", "ปิดทีม" — and also when the user simply describes parallel work ("split this across a few agents", "run these 4 issues at once", "แบ่งงานให้หลายตัวทำพร้อมกัน"). Supersedes /codex-lead, /codex-team-lessons and /peek-and-nudge-every-10m. Do NOT trigger for a single task with no parallelism (use `maw work . --wt WT-SLUG` or /flash), for in-session subagent fan-out (/sonnet), or for pure session mining (/dig, /trace).
---

# /codex-team

You are the LEAD. Coders write code; you write dispatches, gates, and merges. The moment you "just
quickly fix" something yourself you become the bottleneck and the coder learns nothing — that failure
mode cost a whole run once and is why this skill exists.

Verified against `maw-rs v26.7.25-alpha.1755 (fd82a9b)` and its source. Don't invent flags. `maw team
--help` works; the **sub**-subcommands don't (`maw team up --help` → `team: unknown argument --help`)
— read usage by running the subcommand bare (`maw team up`). Never bare `maw team`: it dumps every
team registered on the machine (180+ here).

## Golden rules (top, because these are the expensive ones)

- **Dispatch only with `maw hey`.** `maw team send` / SendMessage write `<team>/inboxes/<agent>.json`
  and never touch tmux. An omx coder has no file inbox, so it is a silent no-op that still exits 0.
  `maw hey` writes the inbox *and* injects into the pane.
- **The charter does not carry your prompt.** `maw team up` shells out to `maw wake … --no-attach
  --session … -e <engine>` with **no** `--prompt`/`--task`; only `maw team spawn` reads a member's
  `prompt:`. `maw hey` isn't a re-send — it is the only delivery mechanism you have.
- **The charter parser is line-based, not YAML.** Every line is truncated at the first `#`; every
  scalar takes only the rest of its own line, so `goal: |` stores the literal `"|"`. See §1.
- **1 coder : 1 worktree : 1 CODEX_HOME : 1 auth.json : 1 account.** Every violation produced an
  incident (`refresh token already used`, SQLite lock collisions). Slots are machine-global — check
  other teams' claims before taking one (§6).
- **maw verbs, never raw tmux.** `tmux send-keys` is safety-hook blocked; bare `tmux kill-window`
  kills *your* window. `maw join` exists now — the `tmux join-pane` workaround for #264 is dead.
- **Isolate the build cache per coder** or the team deadlocks on one lock. Rust:
  `CARGO_TARGET_DIR=/tmp/<repo>-target-<coder>`. Node/Python: the per-worktree `node_modules`/`.venv`
  already does it — just never point them at a shared dir.

**When NOT to use this.** One task, one branch → `maw work . --wt <slug> -e omx`. A long build off the
critical path → /flash. Fan-out inside your own context → /sonnet. History → /dig or /trace. A team
costs a charter, boot healing, a peek loop, and N merge gates — pay it only for 2+ genuinely
independent workstreams **and** a queue to keep them fed.

## 0. Preflight the machine (skip this and you will misdiagnose §3)

Every failure a first-timer hits is here, not in the maw verbs.

```bash
for c in maw omx codex bun jq gh git; do command -v "$c" >/dev/null || echo "MISSING: $c"; done
gh auth status >/dev/null 2>&1 || echo "MISSING: gh auth (issues + PRs)"
[ -f "$HOME/.claude/skills/oracle-team/scripts/codex-setup.ts" ] \
  || echo "MISSING: codex-setup.ts — install oracle-team, or use the fallback engine (§1)"
ls -d ~/.codex-team/*/ 2>/dev/null | wc -l   # 0 → no credential slots; do §6 first
grep -qx 'agents/' .gitignore 2>/dev/null || echo 'agents/' >> .gitignore
grep -qx 'agents/' .git/info/exclude 2>/dev/null || echo 'agents/' >> .git/info/exclude
```

If `codex-setup.ts` is missing, the engine string's `bun … && omx` short-circuits, omx never launches,
and the pane sits at a bare shell — which looks exactly like the §3 boot pitfall and sends you healing
the wrong thing for an hour. Coder worktrees live *inside* the repo, hence the ignore lines; post this
in your notes and in every dispatch: **never `git clean -fdx` at the repo root while a team is live** —
it deletes every coder worktree, uncommitted work included, and `--madmax` coders have no approval
prompt to catch it.

**Scheduling.** §5 arms the loop with **ScheduleWakeup**, which is not in every harness. If it isn't in
your tool list, use `/loop 10m` on this skill, or ask the human. Prefer either over cron or `maw
schedule` — both outlive the session; a wakeup dies with the team, which is the property you want.

## 1. Decide the team shape

Three questions decide the size. **How many independent workstreams?** — not how many coders you can
afford, but how many streams proceed without touching the same files; parallel PRs in one dispatch
zone ping-pong CONFLICTING forever, so serialize those rebases or merge the streams. **Do I have a
queue?** — idle high-effort coders are the biggest waste in the system; keep 1–2 tasks queued each,
and with no queue run fewer coders. **How many *live* credential slots?** (§6) — usually the real cap.

Then make the repo ready: `git worktree add` fails on an unborn HEAD and coders need an origin to push
to. Guard every line; most repos already pass.

```bash
DEFAULT="$(git symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's#^origin/##')"
DEFAULT="${DEFAULT:-main}"
git rev-parse --verify HEAD >/dev/null 2>&1 \
  || { git commit --allow-empty -m "chore: initial commit" && git push -u origin "$DEFAULT"; }
git ls-remote --exit-code --heads origin alpha >/dev/null 2>&1 \
  || { git branch alpha "origin/$DEFAULT" && git push -u origin alpha; }
REPO="$(git rev-parse --show-toplevel)"
TEAM="$(basename "$REPO")-team-$(date +%m%d%H%M)"   # discriminator is mandatory
mkdir -p "$REPO/ψ/teams"; CHARTER="$REPO/ψ/teams/$TEAM.yaml"
maw team status "$TEAM" 2>/dev/null | head -3       # must NOT list members you didn't write
```

Never create `alpha` from current HEAD — it may be a dirty feature branch, and every coder branches
from what you publish. And the team registry is **machine-global**, not per-repo or per-session: 180+
teams are registered here, several already shaped `<repo>-team`. A bare `<repo>-team` adopts — and
later tears down — someone else's live coders. If `team status` shows members you didn't write, stop
and rename. Never `team down` a team you didn't create.

### Charter schema — one contract, not two

The old `/codex-lead` shipped two contradictory schemas. **Use this one:** every member declares its
own `worktree:` (explicit relative path, inside the repo root) and its own `branch:`. Never
`defaults: {worktree: true}`. Parser rules that bite (`team_core.rs`):

- `raw.split('#').next()` runs on **every** line. Any `#` — `PR#123`, a URL fragment, `gh issue view
  #12` — silently truncates the rest of that line.
- `goal:` and member `prompt:` take the **rest of the line only**. `goal: |` plus an indented block
  stores `"|"` and discards the block. Keep both to one quoted line, and treat them as labels rather
  than delivery (see Golden rules).
- `lifecycle:` and `merge_on_shutdown:` are **not** charter keys — they parse into nothing.
  Merge-on-shutdown is a flag on another verb (`maw team shutdown <name> --merge`). Don't use it; you
  merge one PR at a time, deliberately.
- Worktree paths resolve against **the repo root of your cwd**, and a path canonicalizing outside it
  is rejected — so always run `maw team *` from the repo root. `project:` is an `owner/repo` label
  whose shape preflight checks; it locates nothing.

```yaml
name: <team>                      # id for maw team up/down/status
project: <org>/<repo>             # owner/repo label; preflight checks the shape
session: <tmux-session>           # coder windows land here
goal: "Gate <cmd>. PR base alpha. Diff budget 250 lines. No hash signs on this line."
engines:
  omx-1: "bun $HOME/.claude/skills/oracle-team/scripts/codex-setup.ts 1 && CODEX_HOME=$PWD/.codex OMX_AUTO_UPDATE=0 omx --direct --madmax"
  omx-2: "bun $HOME/.claude/skills/oracle-team/scripts/codex-setup.ts 2 && CODEX_HOME=$PWD/.codex OMX_AUTO_UPDATE=0 omx --direct --madmax"
members:
  - role: coder-1                 # tmux window name
    name: <repo>-codex-cli        # identity + branch suffix
    engine: omx-1
    worktree: agents/<repo>-codex-cli
    branch: agents/<repo>-codex-cli
    prompt: "Scope <globs>. Work only in your own worktree. WAIT for maw hey."
  - role: lead
    name: <repo>
    engine: claude
    worktree: false
    branch: alpha
```

The `&&` is load-bearing: `codex-setup.ts` prepares the home and **exits**, so omx runs in the pane's
own shell and keeps its TTY. A forked omx loses the terminal and exits 1.

Two dead workarounds not to re-apply. maw-rs #658 (a trailing top-level section clobbering the last
member's `worktree:`) is **fixed** in #664, in this binary, with a regression test — ordering coders
before `lead` is convention now, and a bare `worktree: true` no longer creates a literal directory
named `true`. And if `codex-setup.ts` is absent, `OMX_AUTO_UPDATE=0 CODEX_HOME=$HOME/.codex-team/<N>
omx --direct --madmax` is a **first-class fallback**, not a deprecated one; its single rule is that a
slot may be used by exactly one coder fleet-wide, because it shares the pool's SQLite (`logs_2`,
`state_5`, `memories_1`). Prefer worktree-local `.codex` when you can — it isolates state while still
sharing the credential.

## 2. Spawn — isolation is the whole point, and order matters

`maw team preflight` is a **pre-spawn gate that checks the disk**: it requires the worktrees, the
session, and each `.codex/config.toml` trust entry to already exist. Run it before creating them and it
exits 1 with three ✗ lines. Create first, gate second.

**Step 1 — prove one coder end-to-end**, while the trust prompt and the boot pitfall are cheap to fix:

```bash
git worktree add agents/codex-1 -b agents/codex-1 origin/alpha
(cd agents/codex-1 || exit 1
 case "$PWD" in */agents/*) ;; *) echo "refusing to trust $PWD"; exit 1;; esac
 bun "$HOME/.claude/skills/oracle-team/scripts/codex-setup.ts" 1 \
   && printf '\n[projects."%s"]\ntrust_level="trusted"\n' "$PWD" >> .codex/config.toml)
maw work agents/codex-1 --wt codex-1 -e omx   # this is what actually spawns the window
maw peek <session>:codex-1                    # must show the omx UI — not a shell, not a trust prompt
```

The `case` guard isn't paranoia: `trust_level="trusted"` disables codex's approval prompts for that
path. If the `cd` fails and you write `$PWD` from the repo root — or from `$HOME` — you have
permanently made a `--madmax` agent approval-free over your whole tree, and it survives every respawn.

**Step 2 — repeat worktree + setup + trust for every member**, then gate:

```bash
maw team preflight "$CHARTER"          # takes a FILE PATH
maw team load "$CHARTER" --no-spawn
maw team up "$TEAM" --dry-run          # takes the team NAME
maw team up "$TEAM"
```

`--dry-run` reports three states, not two: `live`/`skipped` → skip; `dead` → **resume in place** (old
session, re-reads nothing); `missing` → fresh wake. Real flags: `--session`, `--members`, `--only
<a,b>`, `--status`, `-e`, `--force`, `--gather`, `--split`, `--apply`, `--quick`, `--charter`. The
usage string omits `--force`; it does parse (`team_up_helpers.rs:86`) and really does `kill-window`
before waking. **Always scope it** — `maw team up "$TEAM" --only coder-2 --force --dry-run` first —
because unscoped it includes `lead`, which is you. You rarely need it: to make a coder re-ingest a
contract, `maw hey` it again.

Things that look like isolation but are not:

| Looks isolated | Reality |
| --- | --- |
| `maw swarm codex codex codex` | panes in *your* window, shared cwd and branch, not peek-addressable |
| `maw tile N --wt <slug>` | in the shipped wasm plugin: prints `(worktree:slug)`, creates **no worktree** — cosmetic. (The older maw-js TS impl in the same dir *does* create one; check which you have.) |
| `maw tile N --path <abs>` | fine: places panes in a worktree you already made |

What actually creates worktrees: `maw team up`, `maw team spawn <team> <role> --worktree <path>
--exec` (without `--exec` it only prints a plan), `maw work . --wt <slug> -e omx`, `maw worktree add
<name> --base <ref>`. Verify with `git worktree list` / `maw worktree ls` before dispatching anything.

## 3. Heal the boot, then deliver the contract

A fresh worktree has no `.envrc`, so an inherited `OMX_AUTO_UPDATE=0` may not take, omx self-updates,
and the pane lands somewhere other than the engine UI. Peek every coder right after `team up`:

| What the peek shows | Heal |
| --- | --- |
| bare shell `❯` | re-check §0 (`codex-setup.ts` present?), then `maw run <sess>:coder-N "OMX_AUTO_UPDATE=0 omx"` |
| codex update menu | read the menu, then `maw send-text <sess>:coder-N "<the number you read>"` — never a memorized index |
| your text sitting unsent in the composer | `maw send-enter <sess>:coder-N` |

Then **send the standing contract** — the step the charter cannot do for you:

```bash
maw ls -v                                  # the REAL lead window (usually 1); pasteable TARGET column
maw hey <sess>:coder-N "<full prompt, with Report: maw hey <sess>:1 …>"
```

Write the charter's `prompt:` with a placeholder report target; the real window index only exists after
`team up`, so fixing it is part of this send — bake `<sess>:lead` into your prompts and every
done-report goes nowhere. Peek again: `Context …% left` below 100% is your proof it was ingested. When
a coder misbehaves after a respawn, re-run `codex-setup.ts <N>` from inside its worktree rather than
hand-editing `.codex/` — setup generations drift, and regenerating beats diffing two config.tomls.

## 4. Dispatch with done-criteria

Vague dispatch returns polite garbage. A dispatch that reliably produces a clean PR carries all eight:
**(1)** issue ref + how to read it (`gh issue view N`, specs as US/FR/AC/OQ); **(2)** branch off
origin/alpha as `agents/<slug>-<issue>`; **(3)** diff ≤250 lines, and if it can't fit, the split
*pre-declared* ("PR-A then PR-B") before the coder starts; **(4)** exact gate commands with that
coder's own isolated build dir; **(5)** done-report format — PR link + gate evidence + root cause, to
your real target; **(6)** the ask-back rule verbatim: "If you need a decision, don't block on a picker
— `maw hey <session>:<lead-window>` with QUESTION + options + your recommendation, then proceed on your
recommendation or switch to other work until the lead replies."; **(7)** forbidden operations verbatim:
no `git clean -fdx`; no `git push --force` (use `--force-with-lease`, only on your own `agents/*`
branch); no `git worktree remove|prune`; no git operation outside your own worktree — `--madmax` means
nothing will stop you; **(8)** what changed since last dispatch ("the flaky trio is FIXED, a red test
is now real").

Two targeting facts save a wasted hour. `maw hey` accepts `<oracle-window>`, `local:<agent>`,
`<session>:<window>[.<pane>]`, `<node>:<session>[:<window>]` — and **not** `%pane-id`: `maw peek
%3001` works, `maw hey %3001` hard-errors, so never copy a pane id out of a peek into a hey. And
`maw hey <target> "probe" --dry-run` resolves without sending; the flag is real
(`send_federation.rs:452`) but missing from `--help`, and an unresolvable target prints an error while
still exiting 0 — read the output, not `$?`. `maw ls -v` stays the source of truth for targets.

**False negatives are normal.** omx often says "may not have submitted / still shows pending input"
after a `maw hey` that landed fine. Confirm with `maw peek`; only `maw send-enter` when the peek shows
your text actually sitting unsent. A reflexive Enter submits whatever the coder was mid-composing.

## 5. The peek / nudge loop

Cadence: **every ~10 minutes.** (The old skills disagreed — 10 in the lessons, 15–20 in codex-lead. 10
wins because a blocked picker burns the slot invisibly until your next peek.) Arm it with
**ScheduleWakeup** in dynamic loop mode — `delaySeconds: 600`, the same prompt verbatim each turn,
`reason: "peek-and-nudge coder loop"`. Re-arm on every wakeup, even when only a gate is running; stop
with `stop: true` when the user says stop or all coders are closed. No ScheduleWakeup → `/loop 10m`.

Each pass, classify every coder:

- **Working** (output scrolling, tool running) → leave it alone.
- **Idle, task assigned** → nudge with the exact blocker: `maw hey <sess>:<p> "status? if blocked say
  what's blocking; if done send done-report to <sess>:<lead-window>"`
- **Idle, no task** → dispatch the next queued item immediately. No-gap dispatch: put the next task in
  the same message that confirms the last one.
- **Stuck** (the *same* error two peeks running) → teach, don't edit. Send the command or the approach
  into the pane. Never the code.
- **Picker open** → **read it before answering.** In a `--madmax`/trusted pane the pickers that survive
  are the ones the agent could *not* auto-approve — i.e. the destructive ones. Send the option number
  you read; never a bare `send-enter` on an unread highlight. If it approves something destructive or
  outside the worktree, don't answer: `maw hey` the coder off that path, then re-send the ask-back rule.

Aids: `maw peek <target> --lines 200`, bare `maw peek` (fleet one-liner), `maw capture <target> --full`
(without `--full` you get a window, not the scrollback), `maw team status <team>`, `maw activity --all
--stuck-only` (bare `maw activity` only prints usage). `maw team status` with **no** name silently
resolves a team from context and exits 0 — pass the name or you'll read the wrong team.

**Never paste raw `peek`/`capture` output into a report, retro, commit, PR, or issue.** Coder scrollback
carries `.env` echoes and `gh auth token` output, and this repo is public — quote only lines you have
read and scrubbed. Report to the human **only when something changed**: a merge, a dispatch, a blocker.
Silence on no-change peeks.

## 6. Accounts and quota

A slot is a `CODEX_HOME` directory under `~/.codex-team/<N>` holding a valid `auth.json`. Slots are
shared across every codex team on the machine even when each coder gets a worktree-local `CODEX_HOME`
(`auth.json` is symlinked in; the SQLite state stays local).

**Creating a slot** (§0 said you had zero) — do it yourself, in a pane you own, once per account; never
delegate it to a coder. **Auditing the pool** — enumerate, never assume a range; pools have
non-numeric members (`hermes` here) and dead slots.

```bash
mkdir -p ~/.codex-team/7
CODEX_HOME=~/.codex-team/7 codex login          # browser flow, then:
CODEX_HOME=~/.codex-team/7 codex login status   # must print an authenticated account

ls -la ~/.codex-team/
for d in ~/.codex-team/*/; do
  [ -f "$d/auth.json" ] && printf '%s ' "$(basename "$d")" \
    && jq -r '"auth_mode=\(.auth_mode) last_refresh=\(.last_refresh)"' "$d/auth.json"
done
ps eww -o command= | grep -o 'CODEX_HOME=[^ ]*' | sort -u   # who already holds a slot, fleet-wide
```

A slot with only `auth.json.stale-*` is **dead** — a coder there boots unauthenticated and fails at the
first tool call, so skip it. Two slots can hold the **same account**, which is not two units of
capacity; discriminate by `last_refresh`, not by directory count or email. **Check the `ps` line before
claiming slot N**: your written-down mapping can't see the team another oracle started an hour ago, and
`refresh token already used` invalidates the credential for *both* teams — you take down a run that
isn't yours. One slot per coder in `engines:`, mapping written down; non-sequential is fine
(`cli=omx-1, auth=omx-6`), double-booking is not. After a codex CLI upgrade restart every coder —
upgrades reload stale on-disk tokens.

**Never `cat` or `jq .` an `auth.json`.** Top-level keys here are `OPENAI_API_KEY`, `auth_mode`,
`last_refresh`, `tokens` — a bare dump prints a live API key into your transcript. Never echo an env
line from `ps eww` either. For identity, select fields: `jq -r '.tokens.id_token' "$d/auth.json" | cut
-d. -f2 | base64 -d 2>/dev/null | jq -r '{email, plan: .["chatgpt_plan_type"]}'`

**Which rotation applies to you.** Engine points at `~/.codex-team/<N>` → you are on codex account N,
and `maw zai status` tells you nothing about your coders. Engine points at the `maw zai` gateway →
rotation is automatic: `fill_first` drains key #1 and overflows on 429, and that overflow *is* the
rotation (monitor with `maw zai status|mon|test`). Know which one you are on before you debug a 429.

## 7. Gate and merge

You are the only merge authority, and only with explicit or standing user authorization ("merge when
gates confirm"). Gate the **full workspace** in a fresh clone or worktree, isolated build dir, no
fail-fast (`--no-fail-fast` for cargo; your runner's equivalent otherwise), merged against **current**
alpha (merge preview), raw output to a log file — gating the PR branch alone against stale alpha hides
conflicts. **Read the FAIL NAMES, never the count**: "2 fails, probably the flakes" nearly shipped real
regressions twice. Merge only if the names are a subset of a written known-flaky list where each entry
was proven 3/3 green standalone, then spend a stabilization PR deleting the flakes — it pays for itself
in a day.

Check the **base branch** on every non-team PR before merging; one external PR based on `main` got
squashed there and needed a cherry-pick port back. Byte-frozen contracts + golden/parity tests catch
what a tired lead misses — a parity harness caught two coders independently widening the same frozen
JSON contract. Serialize rebases when parallel PRs touch the same zone. Write the scar down the same
day (`docs/agent-guides/*`, AGENTS.md, memory), scrubbed, because those files are public. Pilot before
batch: one unit end-to-end, with a rollback drill, before the next fourteen.

## 8. Teardown

**Look before you kill.** Nothing below recovers what this sweep would have shown you:

```bash
git worktree list --porcelain | awk '/^worktree /{print $2}' | while read -r wt; do
  echo "== $wt"; git -C "$wt" status --porcelain
  git -C "$wt" log --branches --not --remotes --oneline
done
maw team down "$TEAM" --dry-run
maw team down "$TEAM"
```

Both sweep outputs must be empty before you run the last line. Real `team down` flags are only `--all`,
`--keep <a,b>`, `--dry-run`, `--status`. There is **no `--clean`** — the old skill documented it, and
`team down` hard-errors on any unrecognized dash arg, so teardown fails outright.

`team down` keeps `lead` and `bridge` **by default** (`team_down_keep_reason`), so the plain form does
not kill your own pane. **`--all` is exactly the flag that removes that protection** and puts the lead
in the kill set — never type it. `--keep <role>` adds protection for others. For each killable member
`team down` runs `maw done <window>`, which does `git add -A`, `git commit -m "chore: auto-save before
done"`, **and `git push`** — but all three are fire-and-forget (`let _ = …`), so a failed push is
silent. Re-run the sweep after teardown rather than assuming the save landed.

Know which verb you want, because picking wrong strands or destroys work: `maw sleep <oracle> [window]`
stops gracefully and touches no worktree; `maw done <window> --dry-run` then for real does auto-save +
kill + remove worktree; `maw kill <target>` is immediate with **no auto-save** and leaves an orphaned
worktree; `maw kill <session> --pane N` takes one pane and keeps pane 0 (you), while `maw kill
<sess>:<N>` is window-scoped and would take your whole window with it.

**`maw done <window> --clean-branch` also deletes the branch.** Before typing it, all three must hold:
`git -C agents/<name> status --porcelain` empty; `git -C agents/<name> log origin/<branch>..<branch>
--oneline` empty; the PR is `MERGED`. Auto-saved commits whose push failed exist *only* on that local
branch, and removing the worktree takes its reflog with it. Never combine `--clean-branch` with
`--all` — `maw done --all --clean-branch` is fleet-scoped, not team-scoped.

Manual teardown — push first, maw verbs, never `/tmp` (macOS purges it, and build dirs live there):

```bash
git -C agents/<name> add -A && git -C agents/<name> commit -m "wip: manual teardown save" || true
git -C agents/<name> push -u origin HEAD
maw kill <session> --pane <N>
mv agents/<name> "$REPO/../attic/<name>-$(date +%s)"
git worktree prune
```

Never `rm -rf` a worktree, and never bare `tmux kill-window` — with no `-t` it kills the window you are
sitting in. Finally, verify: the charter is aspirational, the disk is truth. Diff `members:` against
`git worktree list` and `maw ls -v`. A leftover `agents/<name>/.codex` proves the team *ran*, not that
it is live.

## Anti-patterns

Lead writes code · merging on fail counts instead of names · shared build dirs · two coders sharing a
CODEX_HOME, slot, or account · bare `<repo>-team` names in a global registry · dispatch with no diff
budget · answering a picker without reading it · raw tmux instead of maw verbs · `--all` on `team down`
or `maw done` · charter tasks never verified against live code (coders block on task #1) · account
change without pausing the lead cycle · `maw team send` to an omx coder · assuming the charter
delivered the prompt.
