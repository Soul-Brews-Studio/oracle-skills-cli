import { describe, it, expect } from "bun:test";
import { parseRepo, expandPath, matchesSlug, today, now } from "../src/skills/project/scripts/utils.ts";

describe("parseRepo", () => {
  it("parses full URL", () => {
    const r = parseRepo("https://github.com/owner/repo");
    expect(r).toEqual({ owner: "owner", name: "repo", slug: "owner/repo" });
  });

  it("parses owner/repo", () => {
    const r = parseRepo("acme/project");
    expect(r).toEqual({ owner: "acme", name: "project", slug: "acme/project" });
  });

  it("uses default org for short name", () => {
    const r = parseRepo("myrepo");
    expect(r).toEqual({ owner: "laris-co", name: "myrepo", slug: "laris-co/myrepo" });
  });

  it("uses custom default org", () => {
    const r = parseRepo("myrepo", "custom-org");
    expect(r).toEqual({ owner: "custom-org", name: "myrepo", slug: "custom-org/myrepo" });
  });

  it("strips .git from URL", () => {
    const r = parseRepo("https://github.com/owner/repo.git");
    expect(r).toEqual({ owner: "owner", name: "repo", slug: "owner/repo" });
  });
});

describe("expandPath", () => {
  it("expands ~ to home", () => {
    const home = process.env.HOME || "/home/user";
    expect(expandPath("~/test")).toBe(`${home}/test`);
  });

  it("leaves absolute paths alone", () => {
    expect(expandPath("/absolute/path")).toBe("/absolute/path");
  });
});

describe("matchesSlug", () => {
  const link = { path: "/p", org: "acme", repo: "project", slug: "acme/project" };

  it("matches full slug", () => {
    expect(matchesSlug(link, "acme/project")).toBe(true);
    expect(matchesSlug(link, "other/project")).toBe(false);
  });

  it("matches short name", () => {
    expect(matchesSlug(link, "project")).toBe(true);
    expect(matchesSlug(link, "other")).toBe(false);
  });
});

describe("date helpers", () => {
  it("today returns YYYY-MM-DD", () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("now returns HH:MM", () => {
    expect(now()).toMatch(/^\d{2}:\d{2}$/);
  });
});
