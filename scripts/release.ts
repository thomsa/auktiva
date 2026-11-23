/**
 * Cuts an Auktiva release. See scripts/release/release-plan.ts for the rules.
 *
 * Usage: npm run release -- <patch|minor|major|X.Y.Z> [--dry-run]
 */
import { runRelease } from "./release/run-release";

process.exitCode = runRelease(process.argv.slice(2));
