/**
 * End-to-end checks for `npm run release` against a throwaway bare repository
 * acting as "origin", all inside the OS temp directory. Git runs with an
 * empty global config so the developer's signing, hooks, and aliases do not
 * leak in.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";
import { runRelease } from "./run-release";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-release-"));
const emptyGitConfig = path.join(tmpRoot, "gitconfig");
fs.writeFileSync(emptyGitConfig, "");

const env = Object.fromEntries(
  Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")),
) as NodeJS.ProcessEnv;
Object.assign(env, {
  GIT_CONFIG_GLOBAL: emptyGitConfig,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_TERMINAL_PROMPT: "0",
  GIT_AUTHOR_NAME: "Release Test",
  GIT_AUTHOR_EMAIL: "release-test@example.invalid",
  GIT_COMMITTER_NAME: "Release Test",
  GIT_COMMITTER_EMAIL: "release-test@example.invalid",
});
// Each test sets npm's dry-run config explicitly when it needs it.
delete env.npm_config_dry_run;

after(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function git(cwd: string, ...args: string[]): string {
  const result = spawnSync("git", args, { cwd, env, encoding: "utf8" });
  assert.equal(
    result.status,
    0,
    `git ${args.join(" ")} failed in ${cwd}:\n${result.stderr}`,
  );
  return result.stdout.trim();
}

function gitStatus(cwd: string, ...args: string[]): number | null {
  return spawnSync("git", args, { cwd, env, encoding: "utf8" }).status;
}

let fixtureCount = 0;

/** Creates origin.git (bare) and a clone at version 1.0.0 in sync with it. */
function createFixture(): { origin: string; work: string } {
  const dir = path.join(tmpRoot, `case-${++fixtureCount}`);
  const origin = path.join(dir, "origin.git");
  const work = path.join(dir, "work");
  fs.mkdirSync(work, { recursive: true });
  git(dir, "init", "--quiet", "--bare", "--initial-branch=main", origin);
  git(work, "init", "--quiet", "--initial-branch=main");
  git(work, "remote", "add", "origin", origin);
  fs.writeFileSync(
    path.join(work, "package.json"),
    `${JSON.stringify({ name: "release-fixture", version: "1.0.0", private: true }, null, 2)}\n`,
  );
  fs.writeFileSync(
    path.join(work, "package-lock.json"),
    `${JSON.stringify(
      {
        name: "release-fixture",
        version: "1.0.0",
        lockfileVersion: 3,
        requires: true,
        packages: { "": { name: "release-fixture", version: "1.0.0" } },
      },
      null,
      2,
    )}\n`,
  );
  git(work, "add", "package.json", "package-lock.json");
  git(work, "commit", "--quiet", "-m", "initial");
  git(work, "push", "--quiet", "origin", "main");
  git(work, "fetch", "--quiet", "origin");
  return { origin, work };
}

function release(work: string, ...argv: string[]) {
  return releaseWithEnv(work, env, ...argv);
}

function releaseWithEnv(
  work: string,
  runEnv: NodeJS.ProcessEnv,
  ...argv: string[]
) {
  const out: string[] = [];
  const err: string[] = [];
  const code = runRelease(argv, {
    cwd: work,
    env: runEnv,
    log: (line) => out.push(line),
    error: (line) => err.push(line),
  });
  return { code, out: out.join("\n"), err: err.join("\n") };
}

function versions(work: string) {
  const read = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(work, file), "utf8"));
  const lock = read("package-lock.json");
  return {
    pkg: read("package.json").version,
    lock: lock.version,
    lockRoot: lock.packages[""].version,
  };
}

test("--dry-run checks everything and changes nothing", () => {
  const { origin, work } = createFixture();
  const head = git(work, "rev-parse", "HEAD");

  const result = release(work, "patch", "--dry-run");

  assert.equal(result.code, 0, result.err);
  assert.match(result.out, /Next version:\s+1\.0\.1 \(tag v1\.0\.1\)/);
  assert.match(
    result.out,
    /git push --atomic --no-follow-tags origin HEAD:refs\/heads\/main refs\/tags\/v1\.0\.1/,
  );
  assert.match(result.out, /Dry run: nothing was changed/);
  assert.equal(git(work, "rev-parse", "HEAD"), head);
  assert.equal(git(work, "status", "--porcelain"), "");
  assert.equal(git(work, "tag", "--list"), "");
  assert.equal(git(origin, "rev-parse", "refs/heads/main"), head);
  assert.equal(git(origin, "tag", "--list"), "");
  assert.deepEqual(versions(work), {
    pkg: "1.0.0",
    lock: "1.0.0",
    lockRoot: "1.0.0",
  });
});

test("a release commits, tags, and pushes both refs from a detached HEAD", () => {
  const { origin, work } = createFixture();
  git(work, "switch", "--quiet", "--detach", "origin/main");

  const result = release(work, "minor");

  assert.equal(result.code, 0, `${result.out}\n${result.err}`);
  const head = git(work, "rev-parse", "HEAD");
  assert.equal(git(work, "log", "-1", "--format=%s"), "chore: release v1.1.0");
  assert.deepEqual(versions(work), {
    pkg: "1.1.0",
    lock: "1.1.0",
    lockRoot: "1.1.0",
  });
  assert.equal(git(work, "status", "--porcelain"), "");

  assert.equal(git(origin, "rev-parse", "refs/heads/main"), head);
  assert.equal(git(origin, "cat-file", "-t", "refs/tags/v1.1.0"), "tag");
  assert.equal(git(origin, "rev-parse", "refs/tags/v1.1.0^{commit}"), head);
  assert.equal(
    git(
      origin,
      "for-each-ref",
      "--format=%(contents:subject)",
      "refs/tags/v1.1.0",
    ),
    "1.1.0",
  );
  assert.equal(
    git(origin, "show", "refs/heads/main:package.json").includes(
      '"version": "1.1.0"',
    ),
    true,
  );
});

test("a --dry-run consumed by npm keeps the run a dry run", () => {
  const { origin, work } = createFixture();
  const head = git(work, "rev-parse", "HEAD");

  // npm run release patch --dry-run (without --) sets npm_config_dry_run.
  const result = releaseWithEnv(
    work,
    { ...env, npm_config_dry_run: "true" },
    "patch",
  );

  assert.equal(result.code, 0, result.err);
  assert.match(result.err, /npm consumed --dry-run/);
  assert.match(
    result.err,
    /npm run release -- <patch\|minor\|major\|X\.Y\.Z> --dry-run/,
  );
  assert.match(result.out, /Dry run: nothing was changed/);
  assert.equal(git(work, "rev-parse", "HEAD"), head);
  assert.equal(git(work, "status", "--porcelain"), "");
  assert.equal(git(work, "tag", "--list"), "");
  assert.equal(git(origin, "rev-parse", "refs/heads/main"), head);
  assert.equal(git(origin, "tag", "--list"), "");
});

test("npm_config_dry_run=false does not turn a release into a dry run", () => {
  const { origin, work } = createFixture();

  const result = releaseWithEnv(
    work,
    { ...env, npm_config_dry_run: "false" },
    "patch",
  );

  assert.equal(result.code, 0, `${result.out}\n${result.err}`);
  assert.doesNotMatch(result.err, /npm consumed --dry-run/);
  assert.equal(
    git(origin, "rev-parse", "refs/heads/main"),
    git(work, "rev-parse", "HEAD"),
  );
  assert.equal(git(origin, "cat-file", "-t", "refs/tags/v1.0.1"), "tag");
});

test("refuses when HEAD is not origin/main or the tree is dirty", () => {
  const { origin, work } = createFixture();
  const originHead = git(origin, "rev-parse", "refs/heads/main");
  fs.writeFileSync(path.join(work, "extra.txt"), "local only\n");
  git(work, "add", "extra.txt");
  git(work, "commit", "--quiet", "-m", "local only");
  fs.writeFileSync(path.join(work, "untracked.txt"), "x\n");
  const head = git(work, "rev-parse", "HEAD");

  const result = release(work, "1.0.1");

  assert.equal(result.code, 1);
  assert.match(result.err, /Refusing to release/);
  assert.match(result.err, /working tree is not clean/);
  assert.match(result.err, /\?\? untracked\.txt/);
  assert.match(
    result.err,
    new RegExp(`HEAD \\(${head}\\) is not origin/main \\(${originHead}\\)`),
  );
  assert.equal(git(work, "rev-parse", "HEAD"), head);
  assert.equal(git(work, "tag", "--list"), "");
  assert.equal(git(origin, "rev-parse", "refs/heads/main"), originHead);
});

test("refuses when the tag already exists on origin", () => {
  const { origin, work } = createFixture();
  git(work, "tag", "-a", "v1.0.1", "-m", "1.0.1");
  git(work, "push", "--quiet", "origin", "refs/tags/v1.0.1");
  git(work, "tag", "-d", "v1.0.1");
  const head = git(work, "rev-parse", "HEAD");

  const result = release(work, "patch", "--dry-run");

  assert.equal(result.code, 1);
  assert.match(result.err, /Tag v1\.0\.1 already exists on origin/);
  assert.equal(git(work, "rev-parse", "HEAD"), head);
  assert.equal(git(origin, "rev-parse", "refs/heads/main"), head);
});

test("rejects invalid arguments and versions that do not increase", () => {
  const { work } = createFixture();
  const unknown = release(work, "patch", "--yes");
  assert.equal(unknown.code, 1);
  assert.match(unknown.err, /Unknown option: --yes/);
  assert.match(unknown.err, /Usage: npm run release/);

  const lower = release(work, "0.9.0", "--dry-run");
  assert.equal(lower.code, 1);
  assert.match(lower.err, /must be greater than the current version 1\.0\.0/);
});

test("a rejected push publishes nothing and explains how to recover", () => {
  const { origin, work } = createFixture();
  const base = git(work, "rev-parse", "HEAD");
  const hook = path.join(origin, "hooks", "pre-receive");
  fs.writeFileSync(
    hook,
    "#!/bin/sh\necho 'rejected by test hook' >&2\nexit 1\n",
  );
  fs.chmodSync(hook, 0o755);

  const result = release(work, "major");

  assert.equal(result.code, 1);
  assert.match(result.err, /Step 5 failed/);
  assert.match(result.err, /nothing was published/);
  assert.match(result.err, /git tag -d v2\.0\.0/);
  assert.match(result.err, new RegExp(`git reset --keep ${base}`));
  const releaseCommit = git(work, "rev-parse", "HEAD");
  assert.notEqual(releaseCommit, base);
  assert.equal(
    git(work, "rev-parse", "refs/tags/v2.0.0^{commit}"),
    releaseCommit,
  );
  assert.equal(git(origin, "rev-parse", "refs/heads/main"), base);
  assert.notEqual(
    gitStatus(origin, "rev-parse", "--quiet", "--verify", "refs/tags/v2.0.0"),
    0,
  );

  // The printed undo commands restore the pre-release state.
  git(work, "tag", "-d", "v2.0.0");
  git(work, "reset", "--quiet", "--keep", base);
  assert.equal(git(work, "rev-parse", "HEAD"), base);
  assert.equal(git(work, "status", "--porcelain"), "");
});
