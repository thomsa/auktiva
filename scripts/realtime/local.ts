import { spawnSync } from "node:child_process";

const action = process.argv[2] ?? "up";
const actions: Record<string, string[]> = {
  up: ["up", "-d", "--wait", "--wait-timeout", "45", "realtime-local"],
  stop: ["stop", "realtime-local"],
  down: ["down"],
};

if (!Object.hasOwn(actions, action) || process.argv.length > 3) {
  console.error("Usage: npm run realtime:local -- [up|stop|down]");
  process.exitCode = 1;
} else {
  const result = spawnSync(
    "docker",
    [
      "compose",
      "--project-name",
      "auktiva-realtime-local",
      "--file",
      "deploy/realtime/docker-compose.yml",
      "--profile",
      "no-proxy",
      ...actions[action],
    ],
    {
      env: {
        ...process.env,
        REALTIME_HOSTNAME: "localhost",
        ACME_EMAIL: "dev@example.org",
        REALTIME_APP_ID: "auktiva",
        REALTIME_APP_KEY: "dev-key",
        REALTIME_APP_SECRET: "dev-secret",
        REALTIME_ALLOWED_ORIGINS:
          process.env.REALTIME_ALLOWED_ORIGINS || "http://localhost:3000",
        REALTIME_BIND: "6001",
      },
      stdio: "inherit",
    },
  );

  if (result.error) console.error("Could not run Docker Compose.");
  process.exitCode = result.status ?? 1;
}
