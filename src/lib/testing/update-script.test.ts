import test, { after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "dotenv";

/**
 * scripts/update.sh exports the DATABASE_URL it resolves to the migration,
 * build and restart steps, so it must find the same URL as the app's tools:
 * the environment first, then .env as dotenv parses it, then file:./dev.db.
 * Runs the sourced function in bash. Skipped only when no bash binary can be
 * spawned at all, and never in CI; a bash that cannot source the script (for
 * example because of CRLF line endings) fails every test.
 */

const script = path
  .join(process.cwd(), "scripts", "update.sh")
  .replace(/\\/g, "/");
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "auktiva-update-sh-"));
const posix = (p: string) => p.replace(/\\/g, "/");

after(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

function bash(command: string, env: Record<string, string | undefined> = {}) {
  const childEnv: NodeJS.ProcessEnv = { ...process.env };
  delete childEnv.DATABASE_URL;
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete childEnv[key];
    else childEnv[key] = value;
  }
  return spawnSync("bash", ["-c", command], {
    env: childEnv,
    encoding: "utf8",
  });
}

const probe = bash(`cd "${posix(tmpDir)}" && source "${script}" && echo ok`);
const bashMissing =
  (probe.error as NodeJS.ErrnoException | undefined)?.code === "ENOENT";
const skip =
  bashMissing && process.env.CI !== "true"
    ? "no bash binary to run scripts/update.sh"
    : false;

/** Fails the test when bash could not be spawned or could not source the script. */
function assertProbe() {
  assert.equal(
    probe.error,
    undefined,
    `could not spawn bash: ${probe.error?.message}`,
  );
  assert.equal(
    probe.status,
    0,
    `bash could not source ${script} (exit ${probe.status}):
${probe.stderr}`,
  );
  assert.equal(
    probe.stdout.trim(),
    "ok",
    `unexpected output sourcing ${script}:
${probe.stdout}
${probe.stderr}`,
  );
}

let caseCount = 0;
function resolveIn(
  envFile: string | null,
  env: Record<string, string | undefined> = {},
  setup = "",
) {
  const dir = path.join(tmpDir, `case${++caseCount}`);
  fs.mkdirSync(dir);
  if (envFile !== null) fs.writeFileSync(path.join(dir, ".env"), envFile);
  return bash(
    `source "${script}" && cd "${posix(dir)}" && ${setup} resolve_database_url`,
    env,
  );
}

const ENV_FILES: [string, string, string][] = [
  [
    "double quotes and a comment",
    `DATABASE_URL="file:./a.db" # main db\n`,
    "file:./a.db",
  ],
  ["single quotes", `DATABASE_URL='file:./b.db'\n`, "file:./b.db"],
  [
    "unquoted with a comment",
    `DATABASE_URL=file:./c.db # main db\n`,
    "file:./c.db",
  ],
  [
    "CRLF line endings",
    `AUTH_SECRET=x\r\nDATABASE_URL="file:./d.db"\r\nOTHER=y\r\n`,
    "file:./d.db",
  ],
  [
    "export prefix",
    `export DATABASE_URL=libsql://db.example.turso.io\n`,
    "libsql://db.example.turso.io",
  ],
  [
    "the last of two lines",
    `DATABASE_URL=file:./old.db\nDATABASE_URL=file:./e.db\n`,
    "file:./e.db",
  ],
  ["no DATABASE_URL line", `AUTH_SECRET=x\n`, "file:./dev.db"],
  ["an empty value", `DATABASE_URL=\n`, "file:./dev.db"],
];

for (const [name, envFile, expected] of ENV_FILES) {
  test(`.env with ${name}`, { skip }, () => {
    assertProbe();
    const result = resolveIn(envFile);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${expected}\n`);
    // dotenv itself, which the tsx scripts and prisma.config.ts use.
    assert.equal(parse(envFile).DATABASE_URL || "file:./dev.db", expected);
  });
}

test("the environment wins over .env", { skip }, () => {
  assertProbe();
  const result = resolveIn(`DATABASE_URL=file:./from-env-file.db\n`, {
    DATABASE_URL: "file:./from-environment.db",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "file:./from-environment.db\n");
});

test(
  "an empty DATABASE_URL in the environment means the default, as for dotenv",
  { skip },
  () => {
    assertProbe();
    const result = resolveIn(`DATABASE_URL=file:./from-env-file.db\n`, {
      DATABASE_URL: "",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, "file:./dev.db\n");
  },
);

test("no .env means the default", { skip }, () => {
  assertProbe();
  const result = resolveIn(null);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, "file:./dev.db\n");
});

test("without dotenv installed it fails instead of guessing", { skip }, () => {
  assertProbe();
  const emptyRoot = path.join(tmpDir, "no-node-modules");
  fs.mkdirSync(emptyRoot);
  const result = resolveIn(
    `DATABASE_URL=file:./a.db\n`,
    {},
    `PROJECT_ROOT="${posix(emptyRoot)}";`,
  );
  assert.notEqual(result.status, 0);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /Run npm ci first/);
});
