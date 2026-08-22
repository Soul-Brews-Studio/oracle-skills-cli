/**
 * Skill profiles — 3 tiers, single source of truth.
 *
 * minimal: newcomer essentials — 7 skills (lifecycle + trace + identity)
 * standard: daily driver — 20 skills (usage-driven, re-cut 2026-07-25)
 * full: all stable skills (excludes lab-only experiments AND minimal-only lite variants)
 * lab: everything including experimental / bleeding edge (still excludes minimal-only lite variants)
 *
 * TIER INVARIANT (Nat, 2026-07-25): **minimal ⊆ standard**. The tiers are a
 * ladder — upgrading a profile must never REMOVE a skill you already had.
 * Locked by __tests__/profiles.test.ts ("minimal is a subset of standard").
 *
 * Profile audit: 120 sessions mined (2026-04-15). Skills earning standard
 * must have 10+ session appearances. Demoted: create-shortcut (6),
 * oracle-soul-sync-update (6), standup (10), skills-list (3), oracle-family-scan (8).
 * These move to full (still installable, not lab-gated).
 * about-oracle (5 appearances) was demoted the same way — but it lives in
 * MINIMAL, so demoting it broke the ladder: `arra install -p standard` silently
 * dropped a skill that `-p minimal` installs. Restored 2026-07-25; the usage
 * threshold does not apply to skills minimal already ships.
 *
 * Lites killed 2026-05-14: forward-lite/recap-lite/rrr-lite moved to zombie.
 * 900 chars of description savings wasn't worth 4 PRs of cleanup bugs (#368, #382, #384, #387).
 * Minimal now uses full forward/recap/rrr — same skills, fewer of them.
 */

/** Minimal profile — essential lifecycle + trace + identity.
 *  about-oracle ("what is Oracle") and who-are-you ("who am I talking to")
 *  are the orientation pair every newcomer asks first. */
export const MINIMAL_SKILLS = [
  'about-oracle', 'forward', 'go', 'recap', 'rrr', 'trace', 'who-are-you',
] as const;

/** Standard profile — daily driver skills (always installed).
 *  MUST be a superset of MINIMAL_SKILLS — see TIER INVARIANT above.
 *
 *  Re-cut 2026-07-25 (Nat). Rule: **if the census says people use it, it ships
 *  in standard** — the old "10+ appearances, else demote to full" threshold was
 *  hiding daily-driver skills behind an opt-in nobody opts into. The only
 *  exception is skills that can't work alone: talk-to and team-agents need
 *  other oracles / a federation configured first, so they read as broken to a
 *  newcomer with nobody to talk to — those moved OUT to full.
 *  In (with census counts): oracle-prism 74, where-we-are 68,
 *  oracle-family-scan 63, oracle-cheatsheet 51, create-shortcut 32,
 *  resonance 25, incubate 20, oracle-write-complete-book 20.
 *
 *  NOT ours to ship: kien-thai was briefly added here and to skills/ on
 *  2026-07-25 — it is a third-party skill that happened to be installed in
 *  ~/.claude/skills on this machine, and it was packaged without checking
 *  authorship. Removed the same day. Before promoting anything out of a local
 *  skills dir, confirm WE wrote it. */
export const STANDARD_SKILLS = [
  'about-oracle', 'awaken', 'bampenpien', 'bud', 'create-shortcut', 'dig',
  'forward', 'go', 'incubate', 'learn', 'oracle-cheatsheet',
  'oracle-family-scan', 'oracle-prism', 'oracle-write-complete-book', 'recap',
  'resonance', 'rrr', 'trace', 'where-we-are', 'who-are-you',
] as const;

/** Lab-only skills — experimental, not in standard or full.
 *  2026-07-06 zombie round 2 removed: contacts, feel, hey, inbox, mailbox,
 *  schedule, xray (usage census over 15,895 sessions). */
export const LAB_SKILLS = [
  'dream', 'fyi', 'watch',
] as const;

/** Minimal-only — DEPRECATED, kept as empty for backward compat with imports.
 *  Lites moved to zombie 2026-05-14. See ZOMBIE_SKILLS for forward-lite etc. */
export const MINIMAL_ONLY_SKILLS = [] as const;

/** Zombie skills — MOVED OUT 2026-08-22.
 *
 *  All 39 archived skills now live in their own repository:
 *      https://github.com/Soul-Brews-Studio/arra-oracle-skills-archive
 *
 *  `src/skills/.archive/MOVED.md` is the breadcrumb left behind, and their full
 *  history remains in this repo's git log. Nothing was deleted.
 *
 *  This constant is now EMPTY on purpose. `arra install -s <zombie-name>` no
 *  longer resolves — those skills are not bundled in the VFS any more. That path
 *  was removed deliberately; see the breadcrumb for how to install one now.
 *
 *  Keep the constant (rather than deleting it) so the zombie tier stays a real
 *  concept the code can express if a skill is ever retired again. */
export const ZOMBIE_SKILLS = [] as const;

/** Return the source directory for a skill by name under a given root —
 *  `.archive/<name>` for zombies, plain `<root>/<name>` for everything else.
 *  Callers pass the VAULT root (src/skills) for zombies/secrets; curated
 *  skills live on the public shelf (skills/) — see skill-source.ts
 *  resolveSkillDir for the shelf→vault→archive runtime resolution.
 *  Pure-function helper used by installer + VFS generator + tooling.
 *  Falls back to the active path so callers can still test existence via
 *  fs.existsSync. */
export function skillDirFor(name: string, skillsRoot: string): string {
  const isZombie = (ZOMBIE_SKILLS as readonly string[]).includes(name);
  // Use string concatenation here to avoid a node:path import in this pure module.
  const sep = skillsRoot.endsWith('/') ? '' : '/';
  return isZombie
    ? `${skillsRoot}${sep}.archive/${name}`
    : `${skillsRoot}${sep}${name}`;
}

// Backwards-compatible aliases
export const labOnly = [...LAB_SKILLS] as string[];
export const minimalOnly = [...MINIMAL_ONLY_SKILLS] as string[];

export const profiles: Record<string, { include?: string[]; exclude?: string[] }> = {
  minimal: {
    include: [...MINIMAL_SKILLS],
  },
  standard: {
    include: [...STANDARD_SKILLS],
  },
  full: {
    exclude: [...labOnly, ...minimalOnly],  // all skills except lab-only + minimal-only lite variants
  },
  lab: {
    exclude: minimalOnly,                    // everything except minimal-only lite variants (full versions present)
  },
};

/**
 * Resolve a profile to a filtered list of skill names.
 * Returns null for profiles that mean "all skills" (lab) — unless secrets/zombies exist.
 * Secret and zombie skills are excluded from ALL profiles; install by name only (-s flag).
 */
export function resolveProfile(
  profileName: string,
  allSkillNames: string[],
  secretSkillNames?: string[],
  zombieSkillNames?: string[]
): string[] | null {
  const excluded = new Set([...(secretSkillNames || []), ...(zombieSkillNames || [])]);
  const profile = profiles[profileName];
  if (!profile) return null;

  if (profile.include && profile.include.length > 0) {
    return profile.include.filter((s) => !excluded.has(s));
  }

  if (profile.exclude && profile.exclude.length > 0) {
    return allSkillNames.filter((s) => !profile.exclude!.includes(s) && !excluded.has(s));
  }

  // Empty = all skills (lab) — but still exclude secrets + zombies
  return excluded.size > 0
    ? allSkillNames.filter((s) => !excluded.has(s))
    : null;
}
