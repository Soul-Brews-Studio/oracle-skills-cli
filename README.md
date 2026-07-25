# arra-oracle-skills-cli

32 skills for AI coding agents. Give your AI persistent memory, session awareness, and collaborative tools.

## Install

**Inside Claude Code** — nothing to install first, no bun, no git:

```
/plugin marketplace add Soul-Brews-Studio/arra-oracle-skills-cli
/plugin install oracle-skills@oracle-skills
```

**From the terminal** — for any other agent, or to pick a profile:

```bash
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y
```

That is the whole thing. Everything below is a variation on that one command.

<details>
<summary><strong>Variations</strong> — profiles, other agents, local installs</summary>

Append flags to the command above:

| want | add |
|---|---|
| a different profile | `-p standard` · `-p full` · `-p lab` (default: `minimal`) |
| just a few skills | `-s recap rrr trace` — adds them **on top of** the profile |
| a specific agent | `--agent claude-code` · `codex` · `cursor` · `opencode` · `gemini-cli` |
| several agents at once | `--agent claude-code codex opencode` |
| slash-command stubs too | `--with-commands` (Codex, OpenCode, Gemini need these) |
| this project only | drop `-g` — installs to `./.claude/skills/` instead of `~/.claude/skills/` |

So a full install for Codex with command stubs reads:

```bash
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -p full --agent codex --with-commands
```

**Shell note:** `-s` needs each name as its own word. zsh does not split `$VARS`, so
`-s $NAMES` arrives as one bogus argument and you silently get only the profile — write the
names literally, or use `${=NAMES}`.

**Federated agents** (thClaws, OpenCode, GitHub Copilot, OpenClaw) are never auto-detected —
ask for them by name (#330):

```bash
… install -g -y --with-thclaws     # or: -a thclaws        → ~/.config/thclaws/skills/
… install -g -y --all-detected     # every detected agent (CI escape hatch)
```

</details>

<details>
<summary><strong>Updating</strong>, and why npm is not the channel</summary>

Update the way you installed:

| installed via | update with |
|---|---|
| plugin | `/plugin update oracle-skills@oracle-skills` |
| terminal | re-run the install command |

Don't update through an already-installed `arra-oracle-skills` binary. It carries its own
frozen copy of the skills, so once it is older than what you have, "update" writes the old
set back over the new one. Always fetch from GitHub.

npm exists as a mirror (`npx arra-oracle-skills@latest …`) but publishing is manual, so it
lags `alpha`. Never pin an exact `-alpha` version from git history — not every CalVer bump is
published, and unpublished versions 404.

</details>

**19 agents supported:** Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Amp, Kilo Code, Roo Code, Goose, Antigravity, GitHub Copilot, OpenClaw, Droid, Windsurf, Cline, Aider, Continue, Zed, thClaws

Skills carry a marker in their description showing where they came from: `G-SKLL` global, `L-SKLL` local.

## Skills

<!-- skills:start -->

<details>
<summary>📚 <strong>32 skills installed</strong> — click to expand</summary>

| # | Skill | Type | Description |
|---|-------|------|-------------|
| 1 | **about-oracle** | skill + subagent | What is Oracle |
| 2 | **learn** | skill + subagent | Explore a codebase |
| 3 | **rrr** | skill + subagent | Create session retrospective with AI diary |
| - |  |  |  |
| 4 | **oracle-family-scan** | skill + code | Oracle Family Registry |
| 5 | **project** | skill + code | Clone and track external repos |
| 6 | **recap** | skill + code | Session orientation and awareness |
| - |  |  |  |
| 7 | **awaken** | skill | "Guided Oracle birth and awakening ritual |
| 8 | **bampenpien** | skill | "บำเพ็ญเพียร |
| 9 | **bud** | skill | 'Create a new oracle via maw bud |
| 10 | **calver** | skill | Show or bump the project's CalVer version |
| 11 | **codex-team** | skill | Spawn, lead |
| 12 | **create-shortcut** | skill | Create local skills as shortcuts |
| 13 | **dig** | skill | Mine Claude Code sessions |
| 14 | **dream** | skill | 'Speculative dreaming |
| 15 | **forward** | skill | Hand off the current session to the next one |
| 16 | **fyi** | skill | Log information for future reference |
| 17 | **go** | skill | Manage Oracle skills |
| 18 | **incubate** | skill | Clone or create repos for active development |
| 19 | **oracle-cheatsheet** | skill | "Generate a copy-paste cheat sheet from the |
| 20 | **oracle-combine-blogs** | skill | "Combine EXISTING finished blog posts into |
| 21 | **oracle-prism** | skill | 'Multi-perspective analysis |
| 22 | **oracle-title-forge** | skill | "Forge a title + subtitle (or reframe) for a |
| 23 | **oracle-write-complete-book** | skill | "Write a complete book from scratch |
| 24 | **philosophy** | skill | Display Oracle philosophy |
| 25 | **resonance** | skill | Capture a resonance moment |
| 26 | **talk-to** | skill | Talk to another Oracle agent |
| 27 | **team-agents** | skill | Spin up coordinated agent teams for any task |
| 28 | **trace** | skill | Find projects, code |
| 29 | **verification-gate-fail-closed** | skill | Reference for building verification gates |
| 30 | **watch** | skill | 'Extract YouTube video transcripts |
| 31 | **where-we-are** | skill | Session awareness |
| 32 | **who-are-you** | skill | Know ourselves |

</details>

<!-- skills:end -->

## Profiles

<!-- profiles:start -->

| Profile | Count | Skills |
|---------|-------|--------|
| **minimal** | 7 | `about-oracle`, `forward`, `go`, `recap`, `rrr`, `trace`, `who-are-you` |
| **standard** | 20 | `about-oracle`, `awaken`, `bampenpien`, `bud`, `create-shortcut`, `dig`, `forward`, `go`, `incubate`, `learn`, `oracle-cheatsheet`, `oracle-family-scan`, `oracle-prism`, `oracle-write-complete-book`, `recap`, `resonance`, `rrr`, `trace`, `where-we-are`, `who-are-you` |
| **full** | 32 | all |
| **lab** | 32 | all |

Switch anytime: `/go standard`, `/go full`, `/go lab`

<!-- profiles:end -->

## CLI

```
install [options]       # install skills (default: standard)
uninstall [options]     # remove installed skills
select [options]        # interactive skill picker
list [options]          # show installed skills
profiles [name]         # list profiles
agents                  # list 18 supported agents
about                   # version + status
```

<!-- secret-skills:start -->

## Zombie Skills

40 skills excluded from all profiles. Install by name:

```bash
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -s <name>
```

| Skill | What |
|-------|------|
| `/alpha-feature` | Full skill development pipeline — create, compile, test, ... |
| `/birth` | Prepare Oracle birth props for a new repo — Issue #1, MCP... |
| `/deep-research` | Deep Research via Gemini — opens new tab, selects Deep Re... |
| `/gemini` | Control Gemini browser tab via MQTT WebSocket — chat, tra... |
| `/handover` | Transfer work to another Oracle — forward + wake + tell i... |
| `/list-issues-pr-pulse` | Open issues, PRs, and Pulse board in one view. Use when u... |
| `/mine` | Extract a specific topic from a single session JSONL file... |
| `/new-issue` | Quick GitHub issue creation. Use when user says "new issu... |
| `/oracle-manage` | Skill and profile management — prepare tools, switch prof... |
| `/speak` | Text-to-speech using edge-tts neural voices with macOS sa... |
| `/what-we-done` | Facts-only progress report — commits, PRs merged, issues ... |
| `/whats-next` | Smart action suggestions — scan context, rank priorities,... |
| `/workon` | Work on a GitHub issue with worktree isolation, or resume... |
| `/i-believed` | Declare belief — looking back or leaping forward. 'I beli... |
| `/work-with` | Persistent cross-oracle collaboration with synchronic sco... |
| `/morpheus` | Speculative dreaming — background thinking, pre-computati... |
| `/retrospective` | Quick session retrospective — summary, lessons, next step... |
| `/skills-list` | List all Oracle skills with profile tier, type, and scrip... |
| `/fleet` | Deep fleet census — discover all oracles across all nodes... |
| `/machines` | Fleet machines — discover nodes from contacts, ping to pr... |
| `/warp` | Teleport to a remote oracle node via SSH+tmux. Interactiv... |
| `/release` | Automated release flow — bump version, changelog, tag, pu... |
| `/wormhole` | Federated query proxy — ask questions across oracle nodes... |
| `/harden` | Audit Oracle configuration for safety, governance, and ha... |
| `/vault` | Connect external knowledge bases (Obsidian, Logseq, markd... |
| `/dream-original` | Cross-repo pattern discovery with parallel agents. Finds ... |
| `/oracle-soul-sync-update` | Sync Oracle instruments with the family. Check and update... |
| `/forward-lite` | Lite variant killed 2026-05-14. Use /forward instead. |
| `/recap-lite` | Lite variant killed 2026-05-14. Use /recap instead. |
| `/rrr-lite` | Lite variant killed 2026-05-14. Use /rrr instead. |
| `/oracle-up` | G-SKLL | Bring up a whole oracle node on a remote host — ... |
| `/schedule` | Query schedule via Oracle API (Drizzle DB). Use when user... |
| `/worktree` | Work in an isolated git worktree — safe parallel editing,... |
| `/standup` | Daily standup check — pending tasks, appointments, recent... |
| `/xray` | X-ray deep scan — inspect Claude Code auto-memory, instal... |
| `/feel` | Capture how the system feels — energy, momentum, burnout,... |
| `/hey` | Talk to another oracle via maw federation. Uses fleet mac... |
| `/contacts` | Manage Oracle contacts — add, list, remove agents with th... |
| `/mailbox` | Persistent agent mailbox — store findings, standing order... |
| `/inbox` | Read and write to Oracle inbox — notes, tasks, messages, ... |
<!-- secret-skills:end -->

## Origin

[Nat Weerawan](https://github.com/nazt) — [Soul Brews Studio](https://github.com/Soul-Brews-Studio) · MIT
