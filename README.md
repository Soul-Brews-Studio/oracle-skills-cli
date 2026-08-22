# arra-oracle-skills-cli

22 skills for AI coding agents — persistent memory, session awareness, and collaborative tools.

## Install

**In Claude Code** — no bun, no git, nothing installed first:

```
/plugin marketplace add Soul-Brews-Studio/arra-oracle-skills-cli
/plugin install oracle-skills@oracle-skills
```

**In a terminal** — for any of the 19 supported agents:

```bash
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -p full
```

`-p full` gives you every stable skill — see the Profiles table below for the current count. Everything else is a flag on that same command.

<details>
<summary>Flags, other agents, updating</summary>

| want | add |
|---|---|
| a smaller set | `-p standard` (20) · `-p minimal` (7) |
| experimental too | `-p lab` — same as `full` whenever nothing is currently flagged experimental |
| a few extra skills | `-s recap rrr trace` — added **on top of** the profile |
| a specific agent | `--agent codex` · `cursor` · `opencode` · `gemini-cli` · `claude-code` |
| several at once | `--agent claude-code codex opencode` |
| slash-command stubs | `--with-commands` — Codex, OpenCode and Gemini need these |
| this project only | drop `-g` → installs to `./.claude/skills/` |
| federated agents | `--with-thclaws` / `-a thclaws` / `--all-detected` — never auto-detected (#330) |

**Update** the way you installed: plugin → `/plugin update oracle-skills@oracle-skills`; terminal → re-run the command. Don't update *through* an installed `arra-oracle-skills` binary — it carries its own frozen copy of the skills, so once it's older than yours, "update" writes the old set back. Always fetch from GitHub.

**npm** is a lagging mirror (publishing is manual). `npx arra-oracle-skills@latest` works; never pin an exact `-alpha` version from git history — not every bump is published.

**zsh note:** `-s` needs each name as its own word, and zsh doesn't split `$VARS` — write names literally or use `${=NAMES}`, or you'll silently get only the profile.

**19 agents:** Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Amp, Kilo Code, Roo Code, Goose, Antigravity, GitHub Copilot, OpenClaw, Droid, Windsurf, Cline, Aider, Continue, Zed, thClaws

</details>

## Skills

<!-- skills:start -->

📚 **22 skills**

| # | Skill | Type | Description |
|---|-------|------|-------------|
| 1 | **about-oracle** | skill + subagent | What is Oracle |
| 2 | **learn** | skill + subagent | Explore a codebase with parallel Haiku… |
| - |  |  |  |
| 3 | **oracle-family-scan** | skill + code | Oracle Family Registry |
| 4 | **project** | skill + code | Clone and track external repos |
| 5 | **recap** | skill + code | Session orientation and awareness |
| - |  |  |  |
| 6 | **awaken** | skill | Guided Oracle birth and awakening ritual |
| 7 | **bampenpien** | skill | บำเพ็ญเพียร |
| 8 | **bud** | skill | Create a new oracle via maw bud |
| 9 | **create-shortcut** | skill | Create local skills as shortcuts |
| 10 | **dig** | skill | Mine Claude Code sessions |
| 11 | **forward** | skill | Hand off the current session to the next one |
| 12 | **go** | skill | Manage Oracle skills |
| 13 | **incubate** | skill | Clone or create repos for active development |
| 14 | **oracle-cheatsheet** | skill | Generate a copy-paste cheat sheet from the… |
| 15 | **oracle-prism** | skill | Multi-perspective analysis |
| 16 | **philosophy** | skill | Display Oracle philosophy |
| 17 | **psi** | skill | Attach a code repo's ψ vault to a caretaker… |
| 18 | **resonance** | skill | Capture a resonance moment |
| 19 | **rrr** | skill | Create a session retrospective with an AI… |
| 20 | **trace** | skill | Find projects, code, and knowledge across… |
| 21 | **where-we-are** | skill | Session awareness |
| 22 | **who-are-you** | skill | Know ourselves |

<!-- skills:end -->

## Profiles

<!-- profiles:start -->

| Profile | Count | Skills |
|---------|-------|--------|
| **minimal** | 7 | `about-oracle`, `forward`, `go`, `recap`, `rrr`, `trace`, `who-are-you` |
| **standard** | 20 | `about-oracle`, `awaken`, `bampenpien`, `bud`, `create-shortcut`, `dig`, `forward`, `go`, `incubate`, `learn`, `oracle-cheatsheet`, `oracle-family-scan`, `oracle-prism`, `oracle-write-complete-book`, `recap`, `resonance`, `rrr`, `trace`, `where-we-are`, `who-are-you` |
| **full** | 22 | all |
| **lab** | 22 | all |

Switch anytime: `/go standard`, `/go full`, `/go lab`

<!-- profiles:end -->

## CLI

```
install [options]     # install skills (default profile: minimal)
uninstall [options]   # remove installed skills
select [options]      # interactive skill picker
list [options]        # show installed skills
profiles [name]       # list profiles
agents                # list supported agents
about                 # version + status
```

<!-- secret-skills:start -->

## Zombie Skills

39 skills excluded from all profiles. Install by name:

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
