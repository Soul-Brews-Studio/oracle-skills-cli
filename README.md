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
| 2 | **awaken** | skill | Guided Oracle birth and awakening ritual |
| 3 | **bampenpien** | skill | บำเพ็ญเพียร |
| 4 | **bud** | skill | Create a new oracle via maw bud |
| 5 | **create-shortcut** | skill | Create local skills as shortcuts |
| 6 | **dig** | skill | Mine Claude Code sessions |
| 7 | **forward** | skill | Hand off the current session to the next one |
| 8 | **go** | skill | Manage Oracle skills |
| 9 | **incubate** | skill | Clone or create repos for active development |
| 10 | **learn** | skill + subagent | Explore a codebase with parallel Haiku… |
| 11 | **oracle-cheatsheet** | skill | Generate a copy-paste cheat sheet from the… |
| 12 | **oracle-family-scan** | skill + code | Oracle Family Registry |
| 13 | **oracle-prism** | skill | Multi-perspective analysis |
| 14 | **philosophy** | skill | Display Oracle philosophy |
| 15 | **project** | skill + code | Clone and track external repos |
| 16 | **psi** | skill | Attach a code repo's ψ vault to a caretaker… |
| 17 | **recap** | skill + code | Session orientation and awareness |
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

39 archived skills — excluded from every profile — now live in their own repository:

**→ https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive**

They were moved out of this repo on 2026-08-22. Nothing was deleted: their full
history remains in this git log, and `src/skills/.archive/MOVED.md` is the breadcrumb.

```bash
git clone https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive
cp -R arra-oracle-skills-archive/skills/<name> ~/.claude/skills/
```

`arra install -s <zombie-name>` no longer resolves — those skills are not bundled
in the CLI any more. That path was removed deliberately, not by accident.
<!-- secret-skills:end -->

## Origin

[Nat Weerawan](https://github.com/nazt) — [Soul Brews Studio](https://github.com/Soul-Brews-Studio) · MIT
