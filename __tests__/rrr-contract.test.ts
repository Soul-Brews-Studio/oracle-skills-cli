import { describe, expect, it } from "bun:test";
import { readFileSync } from "fs";
import { join } from "path";

const skillDir = join(process.cwd(), "skills", "rrr");
const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
const hosts = readFileSync(join(skillDir, "HOSTS.md"), "utf8");
const template = readFileSync(join(skillDir, "TEMPLATE.md"), "utf8");

describe("rrr execution contract", () => {
  it("exposes only three mutually-exclusive modes and defaults to foreground", () => {
    const hint = skill.match(/^argument-hint:.*$/m)?.[0] ?? "";
    expect(hint).toContain("[--fg | --bg | --combo]");
    expect(hint).not.toContain("--deep");
    expect(hint).not.toContain("--quick");
    expect(hint).not.toContain("--detail");
    expect(hint).not.toContain("--teammate");
    expect(skill).toContain("`--fg`, `--bg`, and `--combo` are mutually exclusive");
    expect(skill).toContain("When none is supplied, use the default foreground");
  });

  it("makes foreground current-session-only without persisted mining or hidden agents", () => {
    expect(skill).toContain("Do not inspect persisted session transcripts");
    expect(skill).toContain("Do not launch a hidden mining agent");
    expect(skill).toContain("Persisted session mining: disabled by --fg");
  });

  it("defines background as asynchronous persisted-session mining", () => {
    expect(skill).toContain("Mine the persisted host session");
    expect(skill).toContain("write asynchronously");
  });

  it("defines combo as live-session output followed by persisted enrichment", () => {
    expect(skill).toContain("write a complete, useful context-based retrospective synchronously");
    expect(skill).toContain("Then launch one background miner/writer");
    expect(skill).toContain("Session enrichment: pending");
  });

  it("uses the complete gist-inspired retrospective structure", () => {
    expect(skill).toContain("[TEMPLATE.md](TEMPLATE.md)");
    for (const heading of [
      "## Technical Details",
      "### Architecture Decisions",
      "## 📝 AI Diary",
      "## What Went Well",
      "## What Could Improve",
      "## Blockers & Resolutions",
      "## 💭 Honest Feedback",
      "## Lessons Learned",
      "## Next Steps",
      "## Related Resources",
      "## 🔍 Self-Audit",
    ]) expect(template).toContain(heading);
  });

  it("keeps the validation checklist as a silent gate, not a written report section", () => {
    // The written-report fence ends at Self-Audit and carries no checklist.
    const fence = template.split("```markdown")[1]?.split("```")[0] ?? "";
    expect(fence).toContain("## 🔍 Self-Audit");
    expect(fence).not.toContain("Validation Checklist");
    expect(fence).not.toContain("Metadata reflects the actual session");
    // The checklist lives OUTSIDE the fence as a gate with a do-not-write rule.
    expect(template).toContain("## Validation gate");
    expect(template).toContain("Metadata reflects the actual session");
    expect(template).toMatch(/do not (copy|write)/i);
    // SKILL.md instructs a silent verification, never a written checklist.
    expect(skill).toContain("validation gate");
    expect(skill).toContain("never write the checklist");
  });

  it("keeps host-specific session sources behind adapters", () => {
    expect(skill).toContain("HOSTS.md");
    expect(hosts).toContain("## Claude Code adapter");
    expect(hosts).toContain("## Codex adapter");
    expect(hosts).toContain("## Unknown hosts");
    expect(hosts).toContain("SessionEvidence");
  });

  it("does not hard-code vendor model tiers or team workflows", () => {
    expect(skill).not.toMatch(/model:\s*["']?(sonnet|opus|haiku)/i);
    expect(skill).toContain("Do not create coordinated teams or multi-agent analysis trees");
  });

  it("documents explicit capability fallbacks", () => {
    expect(skill).toContain("If background execution is unavailable");
    expect(skill).toContain("`--bg` falls back to `--fg`");
    expect(hosts).toContain("All fallbacks are explicit");
  });

  it("defaults to a cheap session clock rather than a background agent", () => {
    expect(skill).toContain("scripts/session-clock.py");
    expect(skill).toContain("message bodies are never parsed");
    // combo must NOT be the default
    expect(skill).not.toContain("`--combo`, default");
    expect(skill).toContain("no background agent");
  });

  it("bans estimated timestamps, tilde or not", () => {
    expect(skill).toContain("A tilde does not license a guess");
    expect(skill).toContain("Never interpolate a row time between two beats");
  });

  it("offers a light mode that drops reflection but keeps the timeline", () => {
    expect(skill).toContain("#### Light (`--light`)");
    expect(skill).toContain("mode: light");
  });
});
