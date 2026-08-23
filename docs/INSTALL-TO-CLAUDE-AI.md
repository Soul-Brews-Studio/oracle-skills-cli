# Installing a skill into claude.ai (web)

How to get a skill from this repo into the **claude.ai web app**. Verified end-to-end on
2026-08-23 by uploading `skills/psi` — it appeared in the list as author **You**.

This is a *different channel* from the CLI. See [Which channel do I want?](#which-channel-do-i-want)
before following these steps.

---

## Where the page is

Skills used to live under Settings → Capabilities. **They moved.** That section now shows
only a pointer:

> Skills have moved to Customize.

The live location:

```
https://claude.ai/customize/skills
```

Opening that URL redirects to `https://claude.ai/new#settings/customize-skills` — the
Skills panel is a **modal over the new-chat page**, not a standalone page. That is normal;
the modal is the real UI.

Reaching it by click: **Settings → Customize → Skills** (the sidebar's lower group, below
Claude in Chrome).

## What the page offers

| control | what it does |
|---|---|
| **Browse** | Anthropic's skill catalogue |
| **Add ⌄** | dropdown with three ways to add |
| table | `Skill` · `Last updated` · `Author` — your uploads show Author = **You** |

The **Add** dropdown:

| option | use when |
|---|---|
| Create with Claude | you want Claude to write the skill for you |
| Write skill instructions | paste/author instructions in the browser |
| **Upload a skill** | you already have one — **this is the path for this repo** |

## Uploading a skill from this repo

### 1. Build the archive

The upload accepts `.zip`, `.skill`, or `.md`. For anything with more than one file, zip
the **skill directory itself** so `SKILL.md` sits one level down:

```bash
cd skills
zip -r ~/psi.zip psi -x '*.DS_Store'
```

Verify the layout before uploading — the archive must contain `<name>/SKILL.md`:

```bash
unzip -l ~/psi.zip
#   psi/
#   psi/SKILL.md      ← required
```

### 2. Upload

1. Open `https://claude.ai/customize/skills`
2. **Add** → **Upload a skill**
3. Drag the `.zip` in, or click to pick it

### 3. Wait for the scan

> After upload, your skill goes through a brief security scan (usually 1–2 minutes)
> before it's ready to use.

The row appears immediately with Author **You**; it becomes usable when the scan finishes.

## File requirements (verbatim from the upload dialog)

- `.md` file must contain skill name and description formatted in YAML
- `.zip` or `.skill` file must include a `SKILL.md` file

Every skill in this repo already satisfies the YAML requirement — `bun run compile`
enforces `name` and `description` on every `SKILL.md` and fails the build without them.

## Traps

| symptom | cause | fix |
|---|---|---|
| Settings → Capabilities shows no skill manager | the section moved | go to Customize → Skills, or `/customize/skills` |
| `/customize/skills` "redirects" to `/new#…` | the panel is a modal over new-chat | expected — not an error |
| zip uploads but the skill misbehaves | `SKILL.md` zipped at the archive root | zip the **directory**, not its contents (`zip -r x.zip psi`, not `cd psi && zip -r x.zip .`) |
| skill not usable right after upload | security scan still running | wait 1–2 minutes |
| uploading a skill with `scripts/` | web skills do not get your local shell | prefer prose-only skills for web; script-driven ones belong in the CLI |

## Which channel do I want?

Uploading here affects **claude.ai only**. It does not install into Claude Code, and it is
not how this repo normally ships.

| channel | command | reaches |
|---|---|---|
| **Claude Code plugin** | `/plugin marketplace add Soul-Brews-Studio/arra-oracle-skills-cli` | Claude Code |
| **CLI installer** | `bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -p full` | 19 agents, local `~/.claude/skills/` |
| **claude.ai upload** | this document | the web app, one skill at a time |

There is **no bulk upload** — the web UI takes one file per action, so all 22 shelf skills
means 22 uploads. If you want everything, use the CLI or the plugin.

## Verified

| step | result |
|---|---|
| page located | `https://claude.ai/customize/skills` ✓ |
| accepted formats | `.zip,.skill,.md` (read off the input's `accept`) ✓ |
| uploaded `psi.zip` (12K, `psi/SKILL.md`) | "Uploaded psi" ✓ |
| listed in table | `psi · 8/23/26 · You` ✓ |

Nothing needed fixing — the repo's skills upload as-is.
