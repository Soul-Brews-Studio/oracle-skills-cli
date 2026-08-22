import { describe, it, expect } from "bun:test";
import { $ } from "bun";

// Public shelf (curated skills); zombies stay in the vault archive below.
const S = "skills";

// Helper: run script and get stdout+stderr
const run = async (cmd: string) => {
  const p = Bun.spawn(["bun", ...cmd.split(" ")], { stdout: "pipe", stderr: "pipe" });
  const [out, err] = await Promise.all([
    new Response(p.stdout).text(),
    new Response(p.stderr).text(),
  ]);
  return out + err;
};

describe("project scripts", () => {
  it("create.ts", async () => expect(await run(`${S}/project/scripts/create.ts`)).toContain("Usage"));
  it("history.ts", async () => expect(await run(`${S}/project/scripts/history.ts`)).toContain("Usage"));
  it("incubate.ts", async () => expect(await run(`${S}/project/scripts/incubate.ts`)).toContain("Usage"));
  it("index.ts", async () => expect(await run(`${S}/project/scripts/index.ts --help`)).toContain("Usage"));
  it("learn.ts", async () => expect(await run(`${S}/project/scripts/learn.ts`)).toContain("Usage"));
  it("offload.ts", async () => expect(await run(`${S}/project/scripts/offload.ts`)).toContain("Usage"));
  it("resolve-slug.ts", async () => expect(await run(`${S}/project/scripts/resolve-slug.ts`)).toContain("Usage"));
  it("reunion.ts", async () => expect(await run(`${S}/project/scripts/reunion.ts`)).toContain("Usage"));
  it("search.ts", async () => expect(await run(`${S}/project/scripts/search.ts`)).toContain("Usage"));
  it("spinoff.ts", async () => expect(await run(`${S}/project/scripts/spinoff.ts`)).toContain("Usage"));
});

describe("recap scripts", () => {
  it("recap-rich.ts", async () => expect(await run(`${S}/recap/recap-rich.ts`)).toContain("RECAP"));
  it("recap.ts", async () => expect(await run(`${S}/recap/recap.ts`)).toContain("RECAP"));
});

// schedule/ scripts moved to Soul-Brews-Studio/arra-oracle-skills-archive on
// 2026-08-22 with the rest of the zombie tier. Nothing here to smoke-test any
// more; the breadcrumb invariant is covered by archive-integrity.test.ts.

// watch scripts moved to arra-symbiosis-skills
