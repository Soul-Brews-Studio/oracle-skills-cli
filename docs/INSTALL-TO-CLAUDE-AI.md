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
| `Zip must contain exactly one top-level folder` | you bundled several skills into one archive | one skill per zip — see [Installing many skills at once](#installing-many-skills-at-once) |
| `This skill name is already in use` and you can't see a clash | the name is reserved platform-wide (e.g. `learn`) | rename in the zip's frontmatter only, not in this repo |
| a large batch uploaded only partially | the batch halts at the first collision and drops the rest, naming nothing | submit alphabetically, see where it stopped, re-submit the remainder |

## Installing many skills at once

There is **no bundle format.** A zip containing several skills is rejected outright — the
validator is explicit:

```
Zip must contain exactly one top-level folder. Currently there are 3.
Zip must contain exactly one SKILL.md file. Currently there are 3.
```

One skill per archive, always. What *does* work is **multi-select**: the file input carries
`multiple`, so one picker action can take many single-skill zips.

```bash
# one zip per skill
cd skills
for d in */; do n="${d%/}"; zip -qr "/tmp/skills/$n.zip" "$n" -x '*.DS_Store'; done
```

Then **Add → Upload a skill** and select them all. Result: `Uploaded 10 skills`.

That is the closest thing to a one-click install the web UI offers. 22 skills is one action,
not 22.

### Trap: a batch stops at the first collision and drops the rest

This one costs real time. Uploading 19 skills produced 8 uploads and this message:

```
This skill name is already in use. Try a different name.
```

It does **not** say which name. The batch processes in order, halts at the first conflict,
and **silently discards everything after it** — 10 skills in that run went nowhere with no
per-file report.

Mitigation: submit in a known order (alphabetical is easiest). Whatever is present in the
list afterwards tells you where it stopped; the offender is the next name in your sequence.
Then re-submit the remainder without it.

### Trap: some names are reserved even though nothing shows them

`learn` fails with `already in use` while appearing **nowhere** in the skills list — not as
yours, not as Anthropic's. Verified by uploading `learn.zip` on its own. The namespace is
platform-wide, not per-account, and the UI gives you no way to enumerate what is taken.

Workaround: rename in the zip's `SKILL.md` frontmatter only — `oracle-learn` uploads fine.
Do **not** rename the skill in this repo; the CLI and plugin channels have no such conflict,
and renaming there would break `/learn` for every existing install.

### Measured result

Uploading all 22 shelf skills on 2026-08-23:

| | |
|---|---|
| uploaded | **21** |
| blocked | 1 — `learn` (reserved name) |
| actions taken | 3 picker actions (would have been 1 without the collision) |
| Anthropic skills already present | 3 — `import-memory`, `morning`, `skill-creator` |

## Which channel do I want?

Uploading here affects **claude.ai only**. It does not install into Claude Code, and it is
not how this repo normally ships.

| channel | command | reaches |
|---|---|---|
| **Claude Code plugin** | `/plugin marketplace add Soul-Brews-Studio/arra-oracle-skills-cli` | Claude Code |
| **CLI installer** | `bunx --bun github:Soul-Brews-Studio/arra-oracle-skills-cli#alpha install -g -y -p full` | 19 agents, local `~/.claude/skills/` |
| **claude.ai upload** | this document | the web app, one skill at a time |

Bulk is possible but crude: multi-select uploads many single-skill zips in one action
(there is no bundle format — see above). For everything at once with no collisions to
manage, the CLI or the plugin is still the better channel.

## Verified

| step | result |
|---|---|
| page located | `https://claude.ai/customize/skills` ✓ |
| accepted formats | `.zip,.skill,.md` (read off the input's `accept`) ✓ |
| uploaded `psi.zip` (12K, `psi/SKILL.md`) | "Uploaded psi" ✓ |
| listed in table | `psi · 8/23/26 · You` ✓ |
| multi-skill zip (3 skills) | ✗ rejected — `exactly one top-level folder` |
| multi-select (10 zips, one action) | ✓ `Uploaded 10 skills` |
| all 22 shelf skills | 21 uploaded, `learn` blocked by a reserved name |

Nothing needed fixing in this repo — the skills upload as-is. The one failure (`learn`) is a
platform-side name conflict, not a defect here.
