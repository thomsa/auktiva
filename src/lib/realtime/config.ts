/**
 * Realtime configuration
 *
 * Supports two drivers:
 * - soketi: Self-hosted Pusher-compatible server (recommended for self-hosted)
 * - pusher: Pusher Channels cloud service (for Vercel deployments)
 */

export type RealtimeDriver = "soketi" | "pusher" | "disabled";

export const DEFAULT_SOKETI_PORT = 6001;
export const REALTIME_PUBLISH_TIMEOUT_MS = 5000;

const DEFAULT_SOKETI_HOST = "127.0.0.1";
const warnedDriverValues = new Set<string | undefined>();

export interface RealtimeConfig {
  driver: RealtimeDriver;
  appId: string;
  key: string;
  secret: string;
  cluster: string;
  host?: string;
  port?: number;
  useTLS: boolean;
}

export function parseRealtimeDriver(raw: string | undefined): RealtimeDriver {
  const driver = raw?.trim().toLowerCase();
  return driver === "soketi" || driver === "pusher" ? driver : "disabled";
}

export function parseRealtimePort(raw: string | undefined): number | undefined {
  const value = raw?.trim();
  if (!value || !/^\d+$/.test(value)) return undefined;

  const port = Number(value);
  return port >= 1 && port <= 65535 ? port : undefined;
}

export function parseRealtimeTLS(raw: string | undefined): boolean | undefined {
  switch (raw?.trim().toLowerCase()) {
    case "true":
      return true;
    case "false":
      return false;
  }
}

export function getPublicSoketiEndpoint(
  rawHost: string | undefined,
  rawPort: string | undefined,
  rawTLS: string | undefined,
) {
  return {
    host: rawHost?.trim() || DEFAULT_SOKETI_HOST,
    port: parseRealtimePort(rawPort) ?? DEFAULT_SOKETI_PORT,
    useTLS: parseRealtimeTLS(rawTLS) ?? false,
  };
}

/**
 * Get realtime configuration from environment variables
 */
export function getRealtimeConfig(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): RealtimeConfig {
  const rawDriver = env.NEXT_PUBLIC_REALTIME_DRIVER;
  const driver = parseRealtimeDriver(rawDriver);

  if (driver === "disabled") {
    if (
      typeof process.emitWarning === "function" &&
      rawDriver?.trim().toLowerCase() !== "disabled" &&
      !warnedDriverValues.has(rawDriver)
    ) {
      warnedDriverValues.add(rawDriver);
      process.emitWarning(
        `NEXT_PUBLIC_REALTIME_DRIVER is ${rawDriver === undefined ? "unset" : `unrecognized (${JSON.stringify(rawDriver)})`}. Realtime is disabled.`,
        "RealtimeWarning",
      );
    }

    return {
      driver: "disabled",
      appId: "",
      key: "",
      secret: "",
      cluster: "",
      useTLS: false,
    };
  }

  if (driver === "soketi") {
    const publicEndpoint = getPublicSoketiEndpoint(
      env.NEXT_PUBLIC_SOKETI_HOST,
      env.NEXT_PUBLIC_SOKETI_PORT,
      env.NEXT_PUBLIC_SOKETI_USE_TLS,
    );

    return {
      driver: "soketi",
      appId: env.SOKETI_APP_ID || "auktiva",
      key: env.NEXT_PUBLIC_SOKETI_APP_KEY || "",
      secret: env.SOKETI_APP_SECRET || "",
      cluster: "default",
      host: env.SOKETI_HOST?.trim() || publicEndpoint.host,
      port: parseRealtimePort(env.SOKETI_PORT) ?? publicEndpoint.port,
      useTLS: parseRealtimeTLS(env.SOKETI_USE_TLS) ?? publicEndpoint.useTLS,
    };
  }

  // Pusher Channels
  return {
    driver: "pusher",
    appId: env.PUSHER_APP_ID || "",
    key: env.NEXT_PUBLIC_PUSHER_KEY || "",
    secret: env.PUSHER_SECRET || "",
    cluster: env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    useTLS: true,
  };
}

/**
 * Get client-side realtime configuration (safe to expose)
 */
export function getClientRealtimeConfig(): {
  driver: RealtimeDriver;
  key: string;
  cluster: string;
  host?: string;
  port?: number;
  useTLS: boolean;
} {
  const config = getRealtimeConfig();
  const endpoint =
    config.driver === "soketi"
      ? getPublicSoketiEndpoint(
          process.env.NEXT_PUBLIC_SOKETI_HOST,
          process.env.NEXT_PUBLIC_SOKETI_PORT,
          process.env.NEXT_PUBLIC_SOKETI_USE_TLS,
        )
      : { host: undefined, port: undefined, useTLS: config.useTLS };

  return {
    driver: config.driver,
    key: config.key,
    cluster: config.cluster,
    ...endpoint,
  };
}

/**
 * Check if realtime is enabled
 */
export function isRealtimeEnabled(): boolean {
  const config = getRealtimeConfig();
  return config.driver !== "disabled" && !!config.key && !!config.secret;
}
