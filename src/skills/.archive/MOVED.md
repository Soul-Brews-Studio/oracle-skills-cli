# The archive moved

The 39 zombie skills that lived here were moved out on **2026-08-22**.

**They now live at → https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive**

Nothing was deleted. This file is the forwarding address, and every one of those skills
still has its full history in *this* repository's git log — `git log --all -- src/skills/.archive/<name>`
still works.

## Why they left

A zombie is excluded from every profile and never listed in the marketplace. Keeping 39 of
them inside the CLI meant the graveyard was larger than the shelf (39 archived vs 22 live)
and coupled to 15 files here. They are self-contained skill directories; they did not need
to live in the tool that no longer ships them.

## Installing one now

```bash
git clone https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive
cp -R arra-oracle-skills-archive/skills/<name> ~/.claude/skills/
```

`arra install -s <zombie-name>` no longer resolves — those skills are not bundled in the
CLI's VFS any more. That path was removed deliberately, not by accident.

## Reviving one

`git mv` the directory from the archive repo into `skills/` (public shelf) or `src/skills/`
(vault), drop its `zombie: true` flag, and add it to a profile in `src/profiles.ts`.
`bun run compile` enforces the shelf/vault invariants either way.
