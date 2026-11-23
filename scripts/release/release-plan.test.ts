import assert from "node:assert/strict";
import test from "node:test";
import {
  ReleaseError,
  buildPlan,
  checkPreconditions,
  compareSemver,
  formatCommand,
  npmConsumedDryRun,
  parseArgs,
  parseSemver,
  recoveryInstructions,
  resolveVersion,
  type RepoState,
} from "./release-plan";

const SHA_A = "a".repeat(40);
const SHA_B = "b".repeat(40);

test("parseArgs accepts bump keywords and --dry-run in any position", () => {
  assert.deepEqual(parseArgs(["patch"]), {
    help: false,
    dryRun: false,
    target: { kind: "bump", bump: "patch" },
  });
  assert.deepEqual(parseArgs(["--dry-run", "minor"]), {
    help: false,
    dryRun: true,
    target: { kind: "bump", bump: "minor" },
  });
  assert.deepEqual(parseArgs(["major", "--dry-run"]), {
    help: false,
    dryRun: true,
    target: { kind: "bump", bump: "major" },
  });
});

test("parseArgs accepts an explicit semantic version", () => {
  assert.deepEqual(parseArgs(["1.24.0"]), {
    help: false,
    dryRun: false,
    target: { kind: "explicit", version: "1.24.0" },
  });
  assert.deepEqual(parseArgs(["--", "2.0.0-rc.1"]), {
    help: false,
    dryRun: false,
    target: { kind: "explicit", version: "2.0.0-rc.1" },
  });
});

test("parseArgs returns help without requiring a release type", () => {
  assert.deepEqual(parseArgs(["--help"]), { help: true });
  assert.deepEqual(parseArgs(["-h", "patch"]), { help: true });
});

test("parseArgs rejects missing, extra, unknown, and malformed arguments", () => {
  const cases: Array<[string[], RegExp]> = [
    [[], /Missing release type/],
    [["--dry-run"], /Missing release type/],
    [["patch", "minor"], /Expected one release type/],
    [["patch", "--force"], /Unknown option: --force/],
    [["--dry-run=true", "patch"], /Unknown option/],
    [["-n", "patch"], /Unknown option: -n/],
    [["v1.24.0"], /without the "v" prefix: 1\.24\.0/],
    [["1.24"], /not patch, minor, major, or a semantic version/],
    [["01.2.3"], /not patch/],
    [["1.2.3+build.5"], /not patch/],
    [["Patch"], /not patch/],
    [["prerelease"], /not patch/],
  ];
  for (const [argv, message] of cases) {
    assert.throws(
      () => parseArgs(argv),
      (error: unknown) =>
        error instanceof ReleaseError && message.test(error.message),
      `argv ${JSON.stringify(argv)}`,
    );
  }
});

test("parseSemver and compareSemver follow semver precedence", () => {
  assert.equal(parseSemver("1.2"), null);
  assert.equal(parseSemver("1.2.3-"), null);
  assert.equal(parseSemver("1.2.3-01"), null);
  const ordered = [
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-alpha.beta",
    "1.0.0-beta",
    "1.0.0-beta.2",
    "1.0.0-beta.11",
    "1.0.0-rc.1",
    "1.0.0",
    "1.0.1",
    "1.1.0",
    "1.10.0",
    "2.0.0",
  ].map((value) => {
    const parsed = parseSemver(value);
    assert.ok(parsed, value);
    return parsed;
  });
  for (let i = 1; i < ordered.length; i++) {
    assert.ok(compareSemver(ordered[i - 1], ordered[i]) < 0, `index ${i}`);
    assert.ok(compareSemver(ordered[i], ordered[i - 1]) > 0, `index ${i}`);
  }
  assert.equal(compareSemver(ordered[3], parseSemver("1.0.0-beta")!), 0);
});

test("resolveVersion bumps patch, minor, and major", () => {
  assert.equal(
    resolveVersion("1.23.0", { kind: "bump", bump: "patch" }),
    "1.23.1",
  );
  assert.equal(
    resolveVersion("1.23.4", { kind: "bump", bump: "minor" }),
    "1.24.0",
  );
  assert.equal(
    resolveVersion("1.23.4", { kind: "bump", bump: "major" }),
    "2.0.0",
  );
});

test("resolveVersion accepts only explicit versions greater than the current one", () => {
  assert.equal(
    resolveVersion("1.23.0", { kind: "explicit", version: "1.23.1" }),
    "1.23.1",
  );
  assert.equal(
    resolveVersion("1.23.0", { kind: "explicit", version: "2.0.0-rc.1" }),
    "2.0.0-rc.1",
  );
  assert.equal(
    resolveVersion("2.0.0-rc.1", { kind: "explicit", version: "2.0.0" }),
    "2.0.0",
  );
  for (const version of ["1.23.0", "1.22.9", "1.23.0-rc.1", "0.1.0"]) {
    assert.throws(
      () => resolveVersion("1.23.0", { kind: "explicit", version }),
      /must be greater than the current version 1\.23\.0/,
      version,
    );
  }
});

test("resolveVersion refuses bump keywords from a prerelease or invalid current version", () => {
  assert.throws(
    () => resolveVersion("2.0.0-rc.1", { kind: "bump", bump: "patch" }),
    /prerelease; pass the next version explicitly/,
  );
  assert.throws(
    () => resolveVersion("1.2", { kind: "bump", bump: "patch" }),
    /is not a semantic version/,
  );
});

function state(overrides: Partial<RepoState> = {}): RepoState {
  return {
    statusLines: [],
    head: SHA_A,
    originMain: SHA_A,
    localTagExists: false,
    remoteTagExists: false,
    ...overrides,
  };
}

test("checkPreconditions passes a clean HEAD at origin/main with a free tag", () => {
  assert.deepEqual(checkPreconditions(state(), "1.23.1"), []);
});

test("checkPreconditions reports every failed precondition", () => {
  const problems = checkPreconditions(
    state({
      statusLines: [" M package.json", "?? notes.txt"],
      head: SHA_B,
      localTagExists: true,
      remoteTagExists: true,
    }),
    "1.23.1",
  );
  assert.equal(problems.length, 4);
  assert.match(problems[0], /working tree is not clean/);
  assert.match(problems[0], / M package\.json/);
  assert.match(problems[0], /\?\? notes\.txt/);
  assert.match(
    problems[1],
    new RegExp(`HEAD \\(${SHA_B}\\) is not origin/main \\(${SHA_A}\\)`),
  );
  assert.match(problems[2], /Tag v1\.23\.1 already exists locally/);
  assert.match(problems[3], /Tag v1\.23\.1 already exists on origin/);
});

test("checkPreconditions truncates long status output and reports a missing origin/main", () => {
  const statusLines = Array.from({ length: 13 }, (_, i) => `?? file-${i}`);
  const problems = checkPreconditions(
    state({ statusLines, originMain: null }),
    "1.0.0",
  );
  assert.equal(problems.length, 2);
  assert.match(problems[0], /file-9/);
  assert.doesNotMatch(problems[0], /file-10/);
  assert.match(problems[0], /\.\.\. and 3 more/);
  assert.match(problems[1], /origin\/main was not found/);
});

test("checkPreconditions flags a tag that exists only on the remote", () => {
  assert.deepEqual(
    checkPreconditions(state({ remoteTagExists: true }), "1.23.1"),
    ["Tag v1.23.1 already exists on origin."],
  );
});

test("buildPlan bumps, commits, tags, and pushes atomically in order", () => {
  assert.deepEqual(
    buildPlan("1.23.1").map((step) => step.command),
    [
      ["npm", "version", "1.23.1", "--no-git-tag-version", "--ignore-scripts"],
      ["git", "add", "--", "package.json", "package-lock.json"],
      ["git", "commit", "-m", "chore: release v1.23.1"],
      ["git", "tag", "-a", "v1.23.1", "-m", "1.23.1"],
      [
        "git",
        "push",
        "--atomic",
        "--no-follow-tags",
        "origin",
        "HEAD:refs/heads/main",
        "refs/tags/v1.23.1",
      ],
    ],
  );
});

test("formatCommand quotes arguments with spaces or quotes", () => {
  assert.equal(
    formatCommand(["git", "commit", "-m", "chore: release v1.0.0"]),
    "git commit -m 'chore: release v1.0.0'",
  );
  assert.equal(formatCommand(["echo", "it's"]), "echo 'it'\\''s'");
});

test("recoveryInstructions explains each failure point", () => {
  const context = { version: "1.23.1", baseCommit: SHA_A };

  const beforeCommit = recoveryInstructions(0, context);
  assert.match(beforeCommit, /No release commit or tag was created/);
  assert.match(
    beforeCommit,
    new RegExp(`git checkout ${SHA_A} -- package\\.json package-lock\\.json`),
  );
  assert.equal(recoveryInstructions(2, context), beforeCommit);

  const tagFailed = recoveryInstructions(3, {
    ...context,
    releaseCommit: SHA_B,
  });
  assert.match(tagFailed, new RegExp(`release commit ${SHA_B} exists locally`));
  assert.match(tagFailed, new RegExp(`git reset --keep ${SHA_A}`));

  const pushFailed = recoveryInstructions(4, {
    ...context,
    releaseCommit: SHA_B,
  });
  assert.match(pushFailed, /nothing was published/);
  assert.match(
    pushFailed,
    new RegExp(
      `git push --atomic --no-follow-tags origin ${SHA_B}:refs/heads/main refs/tags/v1\\.23\\.1`,
    ),
  );
  assert.match(pushFailed, /git tag -d v1\.23\.1/);
  assert.match(pushFailed, new RegExp(`git reset --keep ${SHA_A}`));
});

test("npmConsumedDryRun detects a --dry-run that npm kept for itself", () => {
  for (const value of ["true", "TRUE", "True", " true ", "1"]) {
    assert.equal(npmConsumedDryRun({ npm_config_dry_run: value }), true, value);
  }
  for (const value of ["false", "FALSE", "0", "", "yes"]) {
    assert.equal(
      npmConsumedDryRun({ npm_config_dry_run: value }),
      false,
      JSON.stringify(value),
    );
  }
  assert.equal(npmConsumedDryRun({}), false);
});
