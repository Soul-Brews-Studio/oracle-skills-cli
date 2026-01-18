import { describe, test, expect, beforeAll } from "bun:test";
import { $ } from "bun";
import { resolve, dirname } from "path";

// Run from repo root
const REPO_ROOT = resolve(dirname(import.meta.path), "../../../..");
const QUERY = resolve(dirname(import.meta.path), "query.sh");

describe("/schedule skill", () => {
  beforeAll(() => {
    $.cwd(REPO_ROOT);
  });

  test("today returns current date rows", async () => {
    const result = await $`${QUERY} today`.text();
    expect(result).toContain("Jan 13");
  });

  test("tomorrow returns next day rows", async () => {
    const result = await $`${QUERY} tomorrow`.text();
    expect(result).toContain("Jan 14");
  });

  test("january returns schedule table", async () => {
    const result = await $`${QUERY} january`.text();
    expect(result).toContain("Date");
  });

  test("keyword search finds bitkub", async () => {
    const result = await $`${QUERY} bitkub`.text();
    expect(result).toContain("Bitkub");
  });

  test("keyword search finds block mountain", async () => {
    const result = await $`${QUERY} block`.text();
    expect(result).toContain("Block Mountain");
  });

  test("upcoming shows schedule", async () => {
    const result = await $`${QUERY} upcoming`.text();
    expect(result).toContain("Date");
  });
});
