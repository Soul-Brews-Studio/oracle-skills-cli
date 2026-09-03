import { afterAll, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

const ROOT = join(import.meta.dir, "..");
const TMP = mkdtempSync(join(tmpdir(), "arra-git-lifecycle-"));
const TEST_HOME = join(TMP, "home");
mkdirSync(TEST_HOME, { recursive: true });
const GIT_ENV = {
  ...process.env,
  HOME: TEST_HOME,
  XDG_CONFIG_HOME: join(TEST_HOME, ".config"),
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_SYSTEM: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
};

afterAll(() => rmSync(TMP, { recursive: true, force: true }));

function run(cwd: string, args: string[], expectSuccess = true): string {
  const result = Bun.spawnSync(["git", ...args], { cwd, env: GIT_ENV });
  const stdout = new TextDecoder().decode(result.stdout).trim();
  const stderr = new TextDecoder().decode(result.stderr).trim();
  if (expectSuccess && result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed (${result.exitCode}): ${stderr}`);
  }
  return stdout;
}

function commitFile(repo: string, name: string, content: string, message: string): string {
  writeFileSync(join(repo, name), content);
  run(repo, ["add", "--", name]);
  run(repo, ["commit", "-m", message]);
  return run(repo, ["rev-parse", "HEAD"]);
}

function makeRemoteFixture(label: string) {
  const dir = join(TMP, label);
  const remote = join(dir, "origin.git");
  const root = join(dir, "root");
  run(TMP, ["init", "--bare", remote]);
  run(TMP, ["init", "--initial-branch=main", root]);
  run(root, ["config", "user.name", "Lifecycle Test"]);
  run(root, ["config", "user.email", "lifecycle@example.invalid"]);
  const initial = commitFile(root, "base.txt", "base\n", "base");
  run(root, ["remote", "add", "origin", remote]);
  run(root, ["push", "-u", "origin", "main"]);
  run(remote, ["symbolic-ref", "HEAD", "refs/heads/main"]);
  return { dir, remote, root, initial };
}

function resolveBase(root: string, remote = "origin", policyBranch?: string) {
  const remotes = run(root, ["remote"]).split("\n").filter(Boolean);
  if (!remotes.includes(remote)) return { ok: false, reason: "missing-remote" };

  let branch = policyBranch;
  if (!branch) {
    const advertised = Bun.spawnSync(["git", "ls-remote", "--symref", remote, "HEAD"], {
      cwd: root,
      env: GIT_ENV,
    });
    if (advertised.exitCode !== 0) return { ok: false, reason: "remote-head-failed" };
    const text = new TextDecoder().decode(advertised.stdout);
    branch = /^ref:\s+refs\/heads\/([^\s]+)\s+HEAD$/m.exec(text)?.[1];
    if (!branch) return { ok: false, reason: "remote-head-missing" };
    if (branch !== "main") return { ok: false, reason: "non-main-needs-policy", branch };
  }

  const fetched = Bun.spawnSync(["git", "fetch", remote, branch], { cwd: root, env: GIT_ENV });
  if (fetched.exitCode !== 0) return { ok: false, reason: "fetch-failed", branch };
  return {
    ok: true,
    remote,
    branch,
    base: run(root, ["rev-parse", `${remote}/${branch}^{commit}`]),
  };
}

function preflightRoot(root: string, remote = "origin", branch = "main") {
  const selected = resolveBase(root, remote, branch);
  if (!selected.ok) return selected;
  const current = run(root, ["branch", "--show-current"]);
  if (!current) return { ok: false, reason: "detached" };
  if (current !== branch) return { ok: false, reason: "wrong-root-branch" };
  if (run(root, ["status", "--porcelain"])) return { ok: false, reason: "dirty" };
  const counts = run(root, ["rev-list", "--left-right", "--count", `HEAD...${remote}/${branch}`]);
  const [ahead, behind] = counts.split(/\s+/).map(Number);
  if (ahead > 0 && behind > 0) return { ok: false, reason: "diverged", counts };
  if (ahead > 0) return { ok: false, reason: "ahead", counts };
  if (behind > 0) return { ok: false, reason: "behind", counts };
  return { ok: true, base: run(root, ["rev-parse", `${remote}/${branch}^{commit}`]) };
}

async function skill(name: string): Promise<string> {
  const shelf = join(ROOT, "skills", name, "SKILL.md");
  const vault = join(ROOT, "src", "skills", name, "SKILL.md");
  const path = existsSync(shelf) ? shelf : vault;
  return Bun.file(path).text();
}

describe("canonical skill bytes encode one authority contract", () => {
  it("binds workon and worktree to a freshly fetched explicit base, never current HEAD", async () => {
    for (const name of ["workon", "worktree"]) {
      const body = await skill(name);
      expect(body).toContain("origin/main");
      expect(body).toContain("git ls-remote --symref origin HEAD");
      expect(body).toContain("BASE_SHA=");
      expect(body).toMatch(/Never\s+(?:fall\s+back\s+to|branch\s+from\s+implicit)\s+current\s+HEAD/i);
      expect(body).toContain("git worktree list --porcelain");
      for (const state of ["dirty", "ahead", "behind", "diverged"]) expect(body).toContain(state);
    }
  });

  it("keeps staging, push, merge, deployment, and remote deletion separate", async () => {
    const bodies = await Promise.all(["workon", "merged", "forward"].map(skill));
    const joined = bodies.join("\n");
    expect(joined).toContain("git add -A");
    expect(joined).toContain("exact task-owned paths");
    expect(joined).toContain("live-root update/deploy");
    expect(joined).toContain("remote-ref deletion");
    expect(joined).toContain("exact head SHA");
  });

  it("makes forward asap/now timing-only and unable to manufacture authority", async () => {
    const body = await skill("forward");
    expect(body).toContain("`asap` and `now` change handoff timing only");
    expect(body).toContain("never manufacture permission");
    expect(body).not.toMatch(/no approval needed|immediately commit/i);
  });

  it("denies automatic remote deletion and covers merge, rebase, and squash", async () => {
    const body = await skill("merged");
    expect(body).toContain("merge commit or fast-forward");
    expect(body).toContain("rebase merge");
    expect(body).toContain("squash merge");
    expect(body).toContain("Never run `git push --delete`");
    expect(body).toMatch(/(?:requires its own|directly names the) current-session.*scope|current session directly names the remote-ref deletion scope/);
  });
});

describe("Git fixtures falsify unsafe base and root assumptions", () => {
  it("accepts a clean root equal to freshly fetched origin/main", () => {
    const fx = makeRemoteFixture("clean");
    expect(preflightRoot(fx.root)).toEqual({ ok: true, base: fx.initial });
  });

  it("rejects dirty, detached, missing-remote, fetch-failed, and wrong-branch roots", () => {
    const dirty = makeRemoteFixture("dirty");
    writeFileSync(join(dirty.root, "untracked.txt"), "dirty\n");
    expect(preflightRoot(dirty.root)).toMatchObject({ ok: false, reason: "dirty" });

    const detached = makeRemoteFixture("detached");
    run(detached.root, ["checkout", "--detach", detached.initial]);
    expect(preflightRoot(detached.root)).toMatchObject({ ok: false, reason: "detached" });

    const missing = makeRemoteFixture("missing");
    expect(preflightRoot(missing.root, "upstream")).toEqual({ ok: false, reason: "missing-remote" });

    const failedFetch = makeRemoteFixture("fetch-failed");
    expect(preflightRoot(failedFetch.root, "origin", "missing")).toMatchObject({
      ok: false,
      reason: "fetch-failed",
    });

    const wrongBranch = makeRemoteFixture("wrong-branch");
    run(wrongBranch.root, ["checkout", "-b", "topic"]);
    expect(preflightRoot(wrongBranch.root)).toMatchObject({ ok: false, reason: "wrong-root-branch" });
  });

  it("classifies ahead-only, behind-only, and true divergence separately", () => {
    const ahead = makeRemoteFixture("ahead");
    commitFile(ahead.root, "ahead.txt", "ahead\n", "ahead");
    expect(preflightRoot(ahead.root)).toMatchObject({ ok: false, reason: "ahead", counts: "1\t0" });

    const behind = makeRemoteFixture("behind");
    const behindPeer = join(behind.dir, "peer");
    run(behind.dir, ["clone", "--branch", "main", behind.remote, behindPeer]);
    run(behindPeer, ["config", "user.name", "Lifecycle Peer"]);
    run(behindPeer, ["config", "user.email", "peer@example.invalid"]);
    commitFile(behindPeer, "behind.txt", "behind\n", "remote advance");
    run(behindPeer, ["push", "origin", "main"]);
    expect(preflightRoot(behind.root)).toMatchObject({ ok: false, reason: "behind", counts: "0\t1" });

    const diverged = makeRemoteFixture("diverged");
    const peer = join(diverged.dir, "peer");
    run(diverged.dir, ["clone", "--branch", "main", diverged.remote, peer]);
    run(peer, ["config", "user.name", "Lifecycle Peer"]);
    run(peer, ["config", "user.email", "peer@example.invalid"]);
    commitFile(peer, "remote.txt", "remote\n", "remote advance");
    run(peer, ["push", "origin", "main"]);
    commitFile(diverged.root, "local.txt", "local\n", "local advance");
    expect(preflightRoot(diverged.root)).toMatchObject({ ok: false, reason: "diverged", counts: "1\t1" });
  });

  it("selects fork/upstream policy base by exact fetched ref, not stale origin/main", () => {
    const fx = makeRemoteFixture("fork-upstream");
    const upstream = join(fx.dir, "upstream.git");
    run(fx.dir, ["init", "--bare", upstream]);
    run(fx.root, ["remote", "add", "upstream", upstream]);
    run(fx.root, ["branch", "alpha", fx.initial]);
    run(fx.root, ["checkout", "alpha"]);
    const alphaHead = commitFile(fx.root, "alpha.txt", "alpha integration\n", "alpha integration");
    run(fx.root, ["push", "upstream", "alpha"]);
    run(upstream, ["symbolic-ref", "HEAD", "refs/heads/alpha"]);

    const selected = resolveBase(fx.root, "upstream", "alpha");
    expect(selected).toMatchObject({ ok: true, remote: "upstream", branch: "alpha", base: alphaHead });
    expect(selected.base).not.toBe(run(fx.root, ["rev-parse", "origin/main^{commit}"]));
    expect(preflightRoot(fx.root, "upstream", "alpha")).toEqual({ ok: true, base: alphaHead });
  });

  it("requires explicit policy when a remote HEAD is not main", () => {
    const fx = makeRemoteFixture("non-main-head");
    run(fx.root, ["branch", "alpha", fx.initial]);
    run(fx.root, ["push", "origin", "alpha"]);
    run(fx.remote, ["symbolic-ref", "HEAD", "refs/heads/alpha"]);
    expect(resolveBase(fx.root)).toEqual({
      ok: false,
      reason: "non-main-needs-policy",
      branch: "alpha",
    });
  });

  it("refuses path or branch reuse when concurrent worktrees are registered", () => {
    const fx = makeRemoteFixture("concurrent");
    const first = join(fx.dir, "task-a");
    run(fx.root, ["worktree", "add", "-b", "task-a", first, fx.initial]);
    const sameBranch = Bun.spawnSync(
      ["git", "worktree", "add", join(fx.dir, "task-b"), "task-a"],
      { cwd: fx.root, env: GIT_ENV },
    );
    const samePath = Bun.spawnSync(
      ["git", "worktree", "add", "-b", "task-b", first, fx.initial],
      { cwd: fx.root, env: GIT_ENV },
    );
    expect(sameBranch.exitCode).not.toBe(0);
    expect(samePath.exitCode).not.toBe(0);
  });
});

describe("ancestry evidence is merge-method aware", () => {
  it("proves a merge commit by ancestry", () => {
    const fx = makeRemoteFixture("merge");
    run(fx.root, ["checkout", "-b", "task"]);
    const task = commitFile(fx.root, "task.txt", "task\n", "task");
    run(fx.root, ["checkout", "main"]);
    run(fx.root, ["merge", "--no-ff", "task", "-m", "merge task"]);
    expect(Bun.spawnSync(["git", "merge-base", "--is-ancestor", task, "HEAD"], { cwd: fx.root, env: GIT_ENV }).exitCode).toBe(0);
  });

  it("shows why rebased and squashed PRs need API plus diff evidence", () => {
    const rebase = makeRemoteFixture("rebase");
    run(rebase.root, ["checkout", "-b", "task"]);
    const original = commitFile(rebase.root, "task.txt", "task\n", "task");
    run(rebase.root, ["checkout", "main"]);
    commitFile(rebase.root, "main.txt", "main\n", "main advance");
    // Model a hosting-provider rebase merge: replay the task change onto the
    // advanced base while the source branch keeps its original commit ID.
    run(rebase.root, ["cherry-pick", original]);
    const rebased = run(rebase.root, ["rev-parse", "HEAD"]);
    expect(original).not.toBe(rebased);
    expect(Bun.spawnSync(["git", "merge-base", "--is-ancestor", original, "HEAD"], { cwd: rebase.root, env: GIT_ENV }).exitCode).not.toBe(0);
    expect(Bun.spawnSync(["git", "branch", "-d", "task"], { cwd: rebase.root, env: GIT_ENV }).exitCode).not.toBe(0);

    const squash = makeRemoteFixture("squash");
    run(squash.root, ["checkout", "-b", "task"]);
    const task = commitFile(squash.root, "task.txt", "task\n", "task");
    run(squash.root, ["checkout", "main"]);
    run(squash.root, ["merge", "--squash", "task"]);
    run(squash.root, ["commit", "-m", "squash task"]);
    expect(Bun.spawnSync(["git", "merge-base", "--is-ancestor", task, "HEAD"], { cwd: squash.root, env: GIT_ENV }).exitCode).not.toBe(0);
    expect(Bun.spawnSync(["git", "branch", "-d", "task"], { cwd: squash.root, env: GIT_ENV }).exitCode).not.toBe(0);
    expect(run(squash.root, ["show", "HEAD:task.txt"])).toBe("task");
  });
});
