import { describe, it, expect } from "bun:test";
import { profiles, labOnly, minimalOnly, MINIMAL_SKILLS, STANDARD_SKILLS, LAB_SKILLS, MINIMAL_ONLY_SKILLS, ZOMBIE_SKILLS, resolveProfile } from "../src/profiles";
import { selectableInitialValues, selectableSkills } from "../src/cli/commands/select";

// Simulated full skill list — must include all standard + lab + zombie + minimal-only + other discovered skills
const ALL_SKILLS = [
  ...STANDARD_SKILLS,
  ...LAB_SKILLS,
  ...ZOMBIE_SKILLS,
  ...MINIMAL_ONLY_SKILLS,
  // Full/other skills (not standard, not lab-only, not minimal-only, not zombie)
  // (standup moved to zombie 2026-07-06 — now covered by the ZOMBIE_SKILLS spread)
  "about-oracle", "create-shortcut", "incubate",
  "oracle-family-scan", "project",
  "talk-to", "team-agents", "oracle-write-complete-book", "where-we-are", "who-are-you",
].sort();

const ZOMBIE_LIST = [...ZOMBIE_SKILLS] as string[];

describe("profiles", () => {
  it("minimal has 7 skills", () => {
    expect(MINIMAL_SKILLS).toHaveLength(7);
    expect(profiles.minimal.include).toHaveLength(7);
  });

  it("minimal includes go for upgrade path", () => {
    expect(MINIMAL_SKILLS).toContain("go");
  });

  it("standard has 22 skills", () => {
    // 20 -> 22 on 2026-08-23: feel + psi promoted. Both are shelf-resident with
    // no scripts, no fleet requirement and no external toolchain.
    expect(STANDARD_SKILLS).toHaveLength(22);
    expect(profiles.standard.include).toHaveLength(22);
  });

  // TIER LADDER (Nat, 2026-07-25): upgrading a profile must never REMOVE a
  // skill. about-oracle was demoted out of standard by the 2026-04 usage audit
  // while staying in minimal, so `-p standard` silently shipped one skill FEWER
  // than `-p minimal` — caught the day before a workshop that demoed
  // /about-oracle with the standard profile.
  it("minimal is a subset of standard (upgrading never loses a skill)", () => {
    const std = new Set<string>(STANDARD_SKILLS);
    const lost = [...MINIMAL_SKILLS].filter((s) => !std.has(s));
    expect(lost).toEqual([]);
  });

  it("full excludes lab-only AND minimal-only skills (post-#285)", () => {
    expect(profiles.full.exclude).toEqual([...labOnly, ...minimalOnly]);
  });

  it("lab has no include list but excludes minimal-only skills (post-#285)", () => {
    expect(profiles.lab.include).toBeUndefined();
    expect(profiles.lab.exclude).toEqual(minimalOnly);
  });

  it("standard includes dig", () => {
    expect(STANDARD_SKILLS).toContain("dig");
  });

  it("standard excludes lab-only skills but now includes feel and psi", () => {
    // feel was excluded while it was a zombie; it returned to the shelf on
    // 2026-08-23 and was promoted the same day. dream stays lab-only.
    expect([...STANDARD_SKILLS]).not.toContain("dream");
    expect([...STANDARD_SKILLS]).toContain("feel");
    expect([...STANDARD_SKILLS]).toContain("psi");
  });

  it("LAB_SKILLS has 3 experimental skills (zombie round 2 archived 8 of 11)", () => {
    expect(LAB_SKILLS).toHaveLength(3);
  });

  it("ZOMBIE_SKILLS is empty — the 39 moved to arra-oracle-skills-archive 2026-08-22", () => {
    // Kept as a constant (not deleted) so the tier stays expressible if a skill
    // is retired in place again. src/skills/.archive/MOVED.md is the breadcrumb.
    expect(ZOMBIE_SKILLS).toHaveLength(0);
  });

  it("labOnly matches LAB_SKILLS", () => {
    expect(labOnly).toEqual([...LAB_SKILLS]);
  });

  it("no overlap between STANDARD_SKILLS and LAB_SKILLS", () => {
    const standardSet = new Set(STANDARD_SKILLS);
    for (const skill of LAB_SKILLS) {
      expect(standardSet.has(skill)).toBe(false);
    }
  });

  it("no overlap between ZOMBIE_SKILLS and other tiers", () => {
    const standardSet = new Set(STANDARD_SKILLS);
    const labSet = new Set(LAB_SKILLS);
    const minimalSet = new Set<string>(MINIMAL_SKILLS);
    const minimalOnlySet = new Set<string>(MINIMAL_ONLY_SKILLS);
    for (const skill of ZOMBIE_SKILLS) {
      expect(standardSet.has(skill)).toBe(false);
      expect(labSet.has(skill)).toBe(false);
      expect(minimalSet.has(skill)).toBe(false);
      expect(minimalOnlySet.has(skill)).toBe(false);
    }
  });

  // Lites killed 2026-05-14: MINIMAL_ONLY_SKILLS is now empty
  it("MINIMAL_ONLY_SKILLS is empty (lites zombied)", () => {
    expect(MINIMAL_ONLY_SKILLS).toHaveLength(0);
  });

  it("minimal uses full forward/recap/rrr (not lite)", () => {
    expect(MINIMAL_SKILLS).toContain("forward");
    expect(MINIMAL_SKILLS).toContain("recap");
    expect(MINIMAL_SKILLS).toContain("rrr");
  });

  it("full profile excludes both lab and minimal-only skills", () => {
    expect(profiles.full.exclude).toEqual([...labOnly, ...minimalOnly]);
  });

  it("lab profile excludes minimal-only skills", () => {
    expect(profiles.lab.exclude).toEqual(minimalOnly);
  });

  it("MINIMAL_ONLY is empty (backward compat alias)", () => {
    expect(MINIMAL_ONLY_SKILLS).toHaveLength(0);
    expect(minimalOnly).toHaveLength(0);
  });
});

describe("resolveProfile", () => {
  it("minimal returns 7 skills", () => {
    const result = resolveProfile("minimal", ALL_SKILLS);
    expect(result).toHaveLength(7);
  });

  it("standard returns 22 skills", () => {
    const result = resolveProfile("standard", ALL_SKILLS);
    expect(result).toHaveLength(22);
  });

  it("full returns all minus lab-only, minimal-only, and zombies", () => {
    const result = resolveProfile("full", ALL_SKILLS, [], ZOMBIE_LIST)!;
    expect(result).not.toBeNull();
    expect(result.length).toBe(ALL_SKILLS.length - labOnly.length - minimalOnly.length - ZOMBIE_LIST.length);
    for (const name of labOnly) {
      expect(result).not.toContain(name);
    }
    for (const name of minimalOnly) {
      expect(result).not.toContain(name);
    }
    for (const name of ZOMBIE_LIST) {
      expect(result).not.toContain(name);
    }
  });

  it("lab excludes whatever zombie list it is given", () => {
    // Uses a SYNTHETIC zombie list, not ZOMBIE_SKILLS. Since the archive moved out
    // (2026-08-22) the real constant is empty, and passing it here made this test
    // vacuous — resolveProfile returned null (no exclusions) and the loop body
    // never ran. Testing the resolver instead of the current inventory keeps the
    // exclusion logic covered no matter how many zombies exist today.
    const synthetic = [ALL_SKILLS[0], ALL_SKILLS[1]];
    const result = resolveProfile("lab", ALL_SKILLS, [], synthetic)!;
    expect(result).not.toBeNull();
    for (const name of synthetic) {
      expect(result).not.toContain(name);
    }
    expect(result.length).toBe(ALL_SKILLS.length - synthetic.length);
  });

  it("lab returns null (all skills) when no secrets/zombies — lites killed, no exclusions", () => {
    // Post lite-kill: minimalOnly is empty, lab has no exclusions, returns null = "all skills"
    const result = resolveProfile("lab", ALL_SKILLS);
    expect(result).toBeNull();
  });

  it("excludes explicit-only skills from every profile while preserving exact-name install", () => {
    const explicitOnly = ["workon", "worktree", "merged"];
    const names = [...ALL_SKILLS, ...explicitOnly];
    for (const profile of ["minimal", "standard", "full", "lab"]) {
      const result = resolveProfile(profile, names, [], [], explicitOnly) ?? names;
      for (const skill of explicitOnly) expect(result).not.toContain(skill);
    }
  });

  it("unknown profile returns null", () => {
    const result = resolveProfile("nonexistent", ALL_SKILLS);
    expect(result).toBeNull();
  });

  it("standard skills are a subset of all skills", () => {
    const result = resolveProfile("standard", ALL_SKILLS)!;
    for (const skill of result) {
      expect(ALL_SKILLS).toContain(skill);
    }
  });

  it("full includes everything standard has", () => {
    const full = resolveProfile("full", ALL_SKILLS, [], ZOMBIE_LIST)!;
    const standard = resolveProfile("standard", ALL_SKILLS)!;
    for (const skill of standard) {
      expect(full).toContain(skill);
    }
  });

  it("zombies are excluded from all profiles", () => {
    const standard = resolveProfile("standard", ALL_SKILLS, [], ZOMBIE_LIST)!;
    const full = resolveProfile("full", ALL_SKILLS, [], ZOMBIE_LIST)!;
    const lab = resolveProfile("lab", ALL_SKILLS, [], ZOMBIE_LIST)!;
    for (const name of ZOMBIE_LIST) {
      expect(standard).not.toContain(name);
      expect(full).not.toContain(name);
      expect(lab).not.toContain(name);
    }
  });

  // Lites killed — MINIMAL_ONLY is empty so these loops are no-ops.
  // Kept as a regression guard: if someone re-adds lites, these fire.
  it("full does NOT include any MINIMAL_ONLY skills", () => {
    const result = resolveProfile("full", ALL_SKILLS, [], ZOMBIE_LIST)!;
    expect(result).not.toBeNull();
    for (const lite of MINIMAL_ONLY_SKILLS) {
      expect(result).not.toContain(lite);
    }
  });

  it("minimal includes forward/recap/rrr (full versions, not lites)", () => {
    const result = resolveProfile("minimal", ALL_SKILLS)!;
    expect(result).toContain("forward");
    expect(result).toContain("recap");
    expect(result).toContain("rrr");
  });
});

describe("interactive selector curation", () => {
  it("excludes secret and explicit-only skills but not ordinary hidden skills", () => {
    const skills = [
      { name: "public", description: "public", path: "/public" },
      { name: "hidden-profile-skill", description: "hidden", path: "/hidden", hidden: true },
      { name: "internal", description: "internal", path: "/internal", explicitOnly: true },
      { name: "secret", description: "secret", path: "/secret", secret: true },
    ];
    expect(selectableSkills(skills).map((skill) => skill.name)).toEqual([
      "public",
      "hidden-profile-skill",
    ]);
  });

  it("pre-ticks only names that are actually visible options", () => {
    const visible = selectableSkills([
      { name: "public", description: "public", path: "/public" },
      { name: "worktree", description: "internal", path: "/worktree", explicitOnly: true },
    ]);
    expect(selectableInitialValues(
      new Set(["public", "worktree", "third-party-not-an-option"]),
      visible,
    )).toEqual(["public"]);
  });
});
