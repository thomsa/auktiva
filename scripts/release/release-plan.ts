/**
 * Pure release logic for `npm run release`: argument parsing, version
 * resolution, precondition checks, and the command plan. Nothing here touches
 * git, npm, or the filesystem, so it is unit-tested directly.
 */

export const REMOTE = "origin";
export const MAIN_BRANCH = "main";
export const REMOTE_MAIN_REF = `refs/remotes/${REMOTE}/${MAIN_BRANCH}`;

export type Bump = "patch" | "minor" | "major";

export type ReleaseTarget =
  | { kind: "bump"; bump: Bump }
  | { kind: "explicit"; version: string };

export type ReleaseArgs =
  | { help: true }
  | { help: false; target: ReleaseTarget; dryRun: boolean };

export class ReleaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseError";
  }
}

export const USAGE = `Usage: npm run release -- <patch|minor|major|X.Y.Z> [--dry-run]

Bumps package.json and package-lock.json, commits "chore: release vX.Y.Z",
creates the annotated tag vX.Y.Z, and pushes the commit to ${MAIN_BRANCH} and
the tag to ${REMOTE} in one atomic push.

Run it from a clean checkout whose HEAD equals ${REMOTE}/${MAIN_BRANCH}.

Options:
  --dry-run   Run every check (including fetch and the remote tag check) and
              print the plan without changing anything.
  -h, --help  Show this help.`;

const BUMPS: readonly Bump[] = ["patch", "minor", "major"];

// Semantic Versioning 2.0.0 without build metadata: numeric identifiers have
// no leading zeros, prerelease identifiers are dot-separated.
const NUMERIC = "0|[1-9]\\d*";
const PRERELEASE_ID = "(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)";
const SEMVER_RE = new RegExp(
  `^(${NUMERIC})\\.(${NUMERIC})\\.(${NUMERIC})(?:-(${PRERELEASE_ID}(?:\\.${PRERELEASE_ID})*))?$`,
);

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  prerelease: string[];
}

export function parseSemver(value: string): SemVer | null {
  const match = SEMVER_RE.exec(value);
  if (!match) return null;
  const parts = [match[1], match[2], match[3]].map(Number);
  if (!parts.every(Number.isSafeInteger)) return null;
  return {
    major: parts[0],
    minor: parts[1],
    patch: parts[2],
    prerelease: match[4] ? match[4].split(".") : [],
  };
}

function compareIdentifiers(a: string, b: string): number {
  const aNumeric = /^\d+$/.test(a);
  const bNumeric = /^\d+$/.test(b);
  if (aNumeric && bNumeric) return Number(a) - Number(b);
  if (aNumeric) return -1;
  if (bNumeric) return 1;
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Semver precedence: negative if a < b, 0 if equal, positive if a > b. */
export function compareSemver(a: SemVer, b: SemVer): number {
  for (const key of ["major", "minor", "patch"] as const) {
    if (a[key] !== b[key]) return a[key] - b[key];
  }
  if (a.prerelease.length === 0 || b.prerelease.length === 0) {
    // A release has higher precedence than any of its prereleases.
    return b.prerelease.length - a.prerelease.length;
  }
  const length = Math.max(a.prerelease.length, b.prerelease.length);
  for (let i = 0; i < length; i++) {
    if (a.prerelease[i] === undefined) return -1;
    if (b.prerelease[i] === undefined) return 1;
    const order = compareIdentifiers(a.prerelease[i], b.prerelease[i]);
    if (order !== 0) return order;
  }
  return 0;
}

export function formatSemver(version: SemVer): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  return version.prerelease.length > 0
    ? `${core}-${version.prerelease.join(".")}`
    : core;
}

export function parseArgs(argv: readonly string[]): ReleaseArgs {
  let dryRun = false;
  let help = false;
  let endOfOptions = false;
  const positionals: string[] = [];

  for (const arg of argv) {
    if (!endOfOptions && arg === "--") {
      endOfOptions = true;
    } else if (!endOfOptions && arg === "--dry-run") {
      dryRun = true;
    } else if (!endOfOptions && (arg === "-h" || arg === "--help")) {
      help = true;
    } else if (!endOfOptions && arg.startsWith("-")) {
      throw new ReleaseError(`Unknown option: ${arg}`);
    } else {
      positionals.push(arg);
    }
  }

  if (help) return { help: true };
  if (positionals.length === 0) {
    throw new ReleaseError(
      "Missing release type: pass patch, minor, major, or an explicit X.Y.Z.",
    );
  }
  if (positionals.length > 1) {
    throw new ReleaseError(
      `Expected one release type, got ${positionals.length}: ${positionals.join(" ")}`,
    );
  }

  const value = positionals[0];
  if ((BUMPS as readonly string[]).includes(value)) {
    return {
      help: false,
      dryRun,
      target: { kind: "bump", bump: value as Bump },
    };
  }
  if (/^v\d/.test(value) && parseSemver(value.slice(1))) {
    throw new ReleaseError(
      `Pass the version without the "v" prefix: ${value.slice(1)}`,
    );
  }
  if (!parseSemver(value)) {
    throw new ReleaseError(
      `"${value}" is not patch, minor, major, or a semantic version X.Y.Z (optionally X.Y.Z-prerelease, no build metadata).`,
    );
  }
  return { help: false, dryRun, target: { kind: "explicit", version: value } };
}

/**
 * True when npm consumed a `--dry-run` meant for the script: `npm run release
 * patch --dry-run` (without `--`) sets npm_config_dry_run instead of passing
 * the flag on. The release then has to stay a dry run.
 */
export function npmConsumedDryRun(
  env: Readonly<Record<string, string | undefined>>,
): boolean {
  const value = env.npm_config_dry_run?.trim().toLowerCase();
  return value === "true" || value === "1";
}

export const NPM_DRY_RUN_WARNING = `Warning: npm consumed --dry-run (npm_config_dry_run is set), so this run stays a dry run.
Pass script options after "--": npm run release -- <patch|minor|major|X.Y.Z> --dry-run`;

/** Computes the next version and rejects anything that is not an increase. */
export function resolveVersion(current: string, target: ReleaseTarget): string {
  const currentVersion = parseSemver(current);
  if (!currentVersion) {
    throw new ReleaseError(
      `package.json version "${current}" is not a semantic version X.Y.Z.`,
    );
  }

  if (target.kind === "explicit") {
    const next = parseSemver(target.version);
    if (!next) {
      throw new ReleaseError(`"${target.version}" is not a semantic version.`);
    }
    if (compareSemver(next, currentVersion) <= 0) {
      throw new ReleaseError(
        `Version ${target.version} must be greater than the current version ${current}.`,
      );
    }
    return formatSemver(next);
  }

  if (currentVersion.prerelease.length > 0) {
    throw new ReleaseError(
      `The current version ${current} is a prerelease; pass the next version explicitly (X.Y.Z).`,
    );
  }
  const { major, minor, patch } = currentVersion;
  switch (target.bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
  }
}

export function tagName(version: string): string {
  return `v${version}`;
}

/** What the runner read from git after `git fetch`. */
export interface RepoState {
  /** `git status --porcelain` lines (tracked changes and untracked files). */
  statusLines: string[];
  head: string;
  /** Commit of refs/remotes/origin/main, or null if it does not exist. */
  originMain: string | null;
  localTagExists: boolean;
  remoteTagExists: boolean;
}

/** Returns every reason the release must not proceed; empty means go. */
export function checkPreconditions(
  state: RepoState,
  version: string,
): string[] {
  const tag = tagName(version);
  const problems: string[] = [];

  if (state.statusLines.length > 0) {
    const shown = state.statusLines.slice(0, 10).map((line) => `    ${line}`);
    if (state.statusLines.length > shown.length) {
      shown.push(`    ... and ${state.statusLines.length - shown.length} more`);
    }
    problems.push(
      [
        "The working tree is not clean (commit, stash, or remove these first):",
        ...shown,
      ].join("\n"),
    );
  }
  if (state.originMain === null) {
    problems.push(
      `${REMOTE}/${MAIN_BRANCH} was not found after fetching; check the "${REMOTE}" remote.`,
    );
  } else if (state.head !== state.originMain) {
    problems.push(
      `HEAD (${state.head}) is not ${REMOTE}/${MAIN_BRANCH} (${state.originMain}). Check out the latest ${REMOTE}/${MAIN_BRANCH} first, e.g. git switch --detach ${REMOTE}/${MAIN_BRANCH}.`,
    );
  }
  if (state.localTagExists) {
    problems.push(`Tag ${tag} already exists locally.`);
  }
  if (state.remoteTagExists) {
    problems.push(`Tag ${tag} already exists on ${REMOTE}.`);
  }
  return problems;
}

export interface PlanStep {
  description: string;
  command: string[];
}

export function releaseCommitMessage(version: string): string {
  return `chore: release ${tagName(version)}`;
}

export function pushCommand(version: string, source = "HEAD"): string[] {
  return [
    "git",
    "push",
    "--atomic",
    "--no-follow-tags",
    REMOTE,
    `${source}:refs/heads/${MAIN_BRANCH}`,
    `refs/tags/${tagName(version)}`,
  ];
}

/** The ordered commands that perform the release after checks pass. */
export function buildPlan(version: string): PlanStep[] {
  const tag = tagName(version);
  return [
    {
      description: `Set the version to ${version} in package.json and package-lock.json`,
      command: [
        "npm",
        "version",
        version,
        "--no-git-tag-version",
        "--ignore-scripts",
      ],
    },
    {
      description: "Stage the version files",
      command: ["git", "add", "--", "package.json", "package-lock.json"],
    },
    {
      description: "Commit the release",
      command: ["git", "commit", "-m", releaseCommitMessage(version)],
    },
    {
      description: `Create the annotated tag ${tag}`,
      command: ["git", "tag", "-a", tag, "-m", version],
    },
    {
      description: `Push the commit to ${MAIN_BRANCH} and the tag to ${REMOTE} atomically`,
      command: pushCommand(version),
    },
  ];
}

/** Quotes a command for display so it can be pasted into a POSIX shell. */
export function formatCommand(command: readonly string[]): string {
  return command
    .map((part) =>
      /^[\w@%+=:,./-]+$/.test(part) ? part : `'${part.replace(/'/g, `'\\''`)}'`,
    )
    .join(" ");
}

export interface RecoveryContext {
  version: string;
  /** HEAD before the release started (origin/main at that time). */
  baseCommit: string;
  /** The release commit, once it exists. */
  releaseCommit?: string;
}

/**
 * Explains the local state after the plan step at index `failedStep` (in
 * `buildPlan` order) failed, and how to retry or undo it.
 */
export function recoveryInstructions(
  failedStep: number,
  context: RecoveryContext,
): string {
  const tag = tagName(context.version);
  const restoreFiles = `git checkout ${context.baseCommit} -- package.json package-lock.json`;
  const undoCommit = `git reset --keep ${context.baseCommit}`;

  if (failedStep <= 2) {
    return [
      "No release commit or tag was created and nothing was pushed.",
      "Restore the version files with:",
      `  ${restoreFiles}`,
    ].join("\n");
  }
  if (failedStep === 3) {
    return [
      `The release commit ${context.releaseCommit ?? "(HEAD)"} exists locally, but tag ${tag} was not created. Nothing was pushed.`,
      "Undo the local commit with:",
      `  ${undoCommit}`,
    ].join("\n");
  }
  const commit = context.releaseCommit ?? "HEAD";
  return [
    "The push failed. An atomic push updates both refs or neither, so nothing was published.",
    `The release commit ${commit} and the annotated tag ${tag} exist locally.`,
    "",
    "To retry the push (for example after fixing credentials):",
    `  ${formatCommand(pushCommand(context.version, commit))}`,
    "",
    `To undo the local release instead (for example because ${REMOTE}/${MAIN_BRANCH} moved), then rerun npm run release:`,
    `  git tag -d ${tag}`,
    `  ${undoCommit}`,
  ].join("\n");
}
