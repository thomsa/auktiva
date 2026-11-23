/**
 * Executes `npm run release`: reads the repository state through git, checks
 * the preconditions from release-plan.ts, and runs the plan unless --dry-run.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import {
  MAIN_BRANCH,
  REMOTE,
  REMOTE_MAIN_REF,
  NPM_DRY_RUN_WARNING,
  ReleaseError,
  USAGE,
  buildPlan,
  checkPreconditions,
  formatCommand,
  npmConsumedDryRun,
  parseArgs,
  recoveryInstructions,
  resolveVersion,
  tagName,
  type RepoState,
} from "./release-plan";

export interface RunOptions {
  /** Directory inside the repository to release. Defaults to process.cwd(). */
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  log?: (line: string) => void;
  error?: (line: string) => void;
}

interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

function run(
  command: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  inherit = false,
): CommandResult {
  const [program, ...args] = command;
  let executable = program;
  let finalArgs = args;
  let shell = false;
  if (program === "npm") {
    // Prefer the npm that is running this script (npm run release); a bare
    // `npm` on Windows is a .cmd shim that needs a shell.
    const npmCli = env.npm_execpath;
    if (npmCli && /npm-cli\.c?js$/.test(npmCli)) {
      executable = process.execPath;
      finalArgs = [npmCli, ...args];
    } else {
      shell = process.platform === "win32";
    }
  }
  const result = spawnSync(executable, finalArgs, {
    cwd,
    env,
    encoding: "utf8",
    shell,
    stdio: inherit ? ["ignore", "inherit", "inherit"] : "pipe",
  });
  if (result.error) {
    throw new ReleaseError(
      `Could not run ${formatCommand(command)}: ${result.error.message}`,
    );
  }
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

function capture(
  command: readonly string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
): string {
  const result = run(command, cwd, env);
  if (result.status !== 0) {
    throw new ReleaseError(
      `${formatCommand(command)} failed (exit ${result.status}):\n${result.stderr.trim()}`,
    );
  }
  return result.stdout.trim();
}

function refCommit(
  ref: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
): string | null {
  const result = run(
    ["git", "rev-parse", "--quiet", "--verify", `${ref}^{commit}`],
    cwd,
    env,
  );
  return result.status === 0 ? result.stdout.trim() : null;
}

function readVersion(root: string): string {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  ) as { version?: unknown };
  if (typeof pkg.version !== "string") {
    throw new ReleaseError("package.json has no version field.");
  }
  return pkg.version;
}

function readRepoState(
  root: string,
  version: string,
  env: NodeJS.ProcessEnv,
): RepoState {
  const tag = tagName(version);
  const status = capture(
    ["git", "status", "--porcelain", "--untracked-files=normal"],
    root,
    env,
  );
  const remoteTags = capture(
    ["git", "ls-remote", "--tags", REMOTE, `refs/tags/${tag}`],
    root,
    env,
  );
  return {
    statusLines: status ? status.split(/\r?\n/) : [],
    head: capture(["git", "rev-parse", "HEAD"], root, env),
    originMain: refCommit(REMOTE_MAIN_REF, root, env),
    localTagExists:
      run(
        ["git", "rev-parse", "--quiet", "--verify", `refs/tags/${tag}`],
        root,
        env,
      ).status === 0,
    remoteTagExists: remoteTags.length > 0,
  };
}

/** Runs the release CLI and returns the process exit code. */
export function runRelease(
  argv: readonly string[],
  options: RunOptions = {},
): number {
  const env = options.env ?? process.env;
  const log = options.log ?? ((line: string) => console.log(line));
  const error = options.error ?? ((line: string) => console.error(line));

  let args: ReturnType<typeof parseArgs>;
  try {
    args = parseArgs(argv);
  } catch (caught) {
    if (!(caught instanceof ReleaseError)) throw caught;
    error(caught.message);
    error("");
    error(USAGE);
    return 1;
  }
  if (args.help) {
    log(USAGE);
    return 0;
  }
  // Never escalate a dry run that npm swallowed into a real release.
  const npmDryRun = npmConsumedDryRun(env);
  if (npmDryRun) error(NPM_DRY_RUN_WARNING);
  const dryRun = args.dryRun || npmDryRun;

  try {
    const root = capture(
      ["git", "rev-parse", "--show-toplevel"],
      options.cwd ?? process.cwd(),
      env,
    );

    log(`Fetching ${REMOTE} (${MAIN_BRANCH} and tags)...`);
    capture(
      [
        "git",
        "fetch",
        "--tags",
        REMOTE,
        `+refs/heads/${MAIN_BRANCH}:${REMOTE_MAIN_REF}`,
      ],
      root,
      env,
    );

    const current = readVersion(root);
    const version = resolveVersion(current, args.target);
    const tag = tagName(version);
    const state = readRepoState(root, version, env);
    const problems = checkPreconditions(state, version);
    const plan = buildPlan(version);

    log("");
    log(`Current version: ${current}`);
    log(`Next version:    ${version} (tag ${tag})`);
    log(`HEAD:            ${state.head}`);
    log(`${REMOTE}/${MAIN_BRANCH}:     ${state.originMain ?? "(missing)"}`);
    log("");
    log(dryRun ? "Plan (dry run, nothing will run):" : "Plan:");
    plan.forEach((step, index) => {
      log(`  ${index + 1}. ${step.description}`);
      log(`     ${formatCommand(step.command)}`);
    });
    log("");

    if (problems.length > 0) {
      error("Refusing to release:");
      for (const problem of problems) error(`  - ${problem}`);
      return 1;
    }

    if (dryRun) {
      log(
        "All checks passed. Dry run: nothing was changed. Rerun without --dry-run to release.",
      );
      return 0;
    }

    const baseCommit = state.head;
    let releaseCommit: string | undefined;
    for (const [index, step] of plan.entries()) {
      log(`> ${formatCommand(step.command)}`);
      const result = run(step.command, root, env, true);
      if (result.status !== 0) {
        error("");
        error(
          `Step ${index + 1} failed (exit ${result.status}): ${step.description}`,
        );
        error(
          recoveryInstructions(index, { version, baseCommit, releaseCommit }),
        );
        return 1;
      }
      if (index === 0) {
        const written = readVersion(root);
        if (written !== version) {
          error(
            `npm version wrote ${written} to package.json, expected ${version}.`,
          );
          error(recoveryInstructions(index, { version, baseCommit }));
          return 1;
        }
      }
      if (index === 2) {
        releaseCommit = capture(["git", "rev-parse", "HEAD"], root, env);
      }
    }

    log("");
    log(
      `Released ${tag}: pushed ${releaseCommit} to ${REMOTE}/${MAIN_BRANCH} and tag ${tag}.`,
    );
    log(
      "The tag starts .github/workflows/vercel-release.yml (deploy hooks) and .github/workflows/release.yml (GitHub Release notes).",
    );
    return 0;
  } catch (caught) {
    if (caught instanceof ReleaseError) {
      error(caught.message);
      return 1;
    }
    throw caught;
  }
}
