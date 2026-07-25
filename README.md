# arra-oracle-skills-cli

30 skills for AI coding agents. Give your AI persistent memory, session awareness, and collaborative tools.

## Install

Installs run straight from the GitHub `alpha` branch — always the newest skills, no npm publish required:

```bash
# Claude Code — standard profile (default)
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y --agent claude-code

# Full profile (all skills)
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -p full --agent claude-code

# Lab profile (full + experimental)
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -p lab --agent claude-code

# Specific skills only
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -s recap rrr trace --agent claude-code

# Other agents (skills + commands)
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y --agent codex --with-commands
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y --agent opencode --with-commands
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y --agent cursor
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y --agent gemini-cli --with-commands

# Multiple agents
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y --agent claude-code codex opencode

# thClaws (federated agent — explicit opt-in)
bunx arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli install -y -g --with-thclaws
# OR target thclaws directly:
bunx arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli install -y -g -a thclaws
# Skills install to ~/.config/thclaws/skills/ when --with-thclaws is passed

# Install to ALL detected agents incl. federated (CI escape hatch)
bunx arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli install -y -g --all-detected
```

> **Claude Code plugin marketplace** (fewest prerequisites — no bun/git needed):
> `/plugin marketplace add Soul-Brews-Studio/arra-oracle-skills-cli` inside Claude Code installs the curated set from `.claude-plugin/marketplace.json`.
>
> **npm**: published releases may lag behind the `alpha` branch (publishing is manual). If you prefer npm: `npx arra-oracle-skills@latest install -g -y --agent claude-code`. Never pin an exact alpha version from git history — not every CalVer bump is published.

> **#330 note**: as of v26.5.14+, federated agents (thClaws, OpenCode, GitHub Copilot, OpenClaw) are NOT auto-installed by default — they require explicit `-a <name>`, `--with-<name>`, or `--all-detected`. Host Anthropic agents (Claude Code, Codex) continue to auto-detect.

### Local project install

By default (no `-g` flag), skills install to the current project's `.claude/skills/` instead of `~/.claude/skills/`:

```bash
# Local install (current project)
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -a claude-code -s trace -y

# Same with explicit -l flag (symmetric to -g)
bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -l -a claude-code -s trace -y
```

Use when:
- Testing skill changes before global rollout
- Different repos want different skill versions
- Committing project-specific skills to `.claude/skills/` in version control

The `L-SKLL` marker in the SKILL.md description distinguishes locally-installed skills from globally-installed ones (which get `G-SKLL`).

19 agents: Claude Code, Codex, OpenCode, Cursor, Gemini CLI, Amp, Kilo Code, Roo Code, Goose, Antigravity, GitHub Copilot, OpenClaw, Droid, Windsurf, Cline, Aider, Continue, Zed, thClaws

## Skills

<!-- skills:start -->

<details>
<summary>📚 <strong>30 skills installed</strong> — click to expand</summary>

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
| 11 | **create-shortcut** | skill | Create local skills as shortcuts |
| 12 | **dig** | skill | Mine Claude Code sessions |
| 13 | **dream** | skill | 'Speculative dreaming |
| 14 | **forward** | skill | Hand off the current session to the next one |
| 15 | **fyi** | skill | Log information for future reference |
| 16 | **go** | skill | Manage Oracle skills |
| 17 | **incubate** | skill | Clone or create repos for active development |
| 18 | **kien-thai** | skill | Write Thai-language prose (technical |
| 19 | **oracle-cheatsheet** | skill | "Generate a copy-paste cheat sheet from the |
| 20 | **oracle-combine-blogs** | skill | "Combine EXISTING finished blog posts into |
| 21 | **oracle-prism** | skill | 'Multi-perspective analysis |
| 22 | **oracle-title-forge** | skill | "Forge a title + subtitle (or reframe) for a |
| 23 | **resonance** | skill | Capture a resonance moment |
| 24 | **talk-to** | skill | Talk to another Oracle agent |
| 25 | **team-agents** | skill | Spin up coordinated agent teams for any task |
| 26 | **trace** | skill | Find projects, code |
| 27 | **verification-gate-fail-closed** | skill | Reference for building verification gates |
| 28 | **watch** | skill | 'Extract YouTube video transcripts |
| 29 | **where-we-are** | skill | Session awareness |
| 30 | **who-are-you** | skill | Know ourselves |

</details>

<!-- skills:end -->

## Profiles

<!-- profiles:start -->

| Profile | Count | Skills |
|---------|-------|--------|
| **minimal** | 7 | `about-oracle`, `forward`, `go`, `recap`, `rrr`, `trace`, `who-are-you` |
| **standard** | 20 | `about-oracle`, `awaken`, `bampenpien`, `bud`, `create-shortcut`, `dig`, `forward`, `go`, `incubate`, `kien-thai`, `learn`, `oracle-cheatsheet`, `oracle-family-scan`, `oracle-prism`, `recap`, `resonance`, `rrr`, `trace`, `where-we-are`, `who-are-you` |
| **full** | 30 | all |
| **lab** | 30 | all |

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

41 skills excluded from all profiles. Install by name:

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
| `/philosophy` | Display Oracle philosophy — the 5 Principles + Rule 6. Us... |
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

## Team Agent Scripts

`/team-agents` includes zero-token bash scripts for tmux pane lifecycle:

```bash
team-ops panes [team]      # See agent panes (/proc cmdline extraction)
team-ops spawn <team> ...  # Create ephemeral /agent skills
team-ops archive <team> .. # Archive skills to /tmp on shutdown
team-ops sweep             # Kill idle panes (safe)
team-ops nuke              # Kill ALL non-lead panes
team-ops mailbox <cmd>     # Persistent agent memory
team-ops status            # Show everything
```

## Origin

[Nat Weerawan](https://github.com/nazt) — [Soul Brews Studio](https://github.com/Soul-Brews-Studio) · MIT
