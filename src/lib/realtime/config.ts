/**
 * Realtime configuration
 *
 * Supports two drivers:
 * - soketi: Self-hosted Pusher-compatible server (recommended for self-hosted)
 * - pusher: Pusher Channels cloud service (for Vercel deployments)
 */

export type RealtimeDriver = "soketi" | "pusher" | "disabled";

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

/**
 * Get realtime configuration from environment variables
 */
export function getRealtimeConfig(): RealtimeConfig {
  // Use NEXT_PUBLIC_ driver so it's shared between server and client
  const driver = (process.env.NEXT_PUBLIC_REALTIME_DRIVER ||
    "disabled") as RealtimeDriver;

  if (driver === "disabled") {
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
    return {
      driver: "soketi",
      appId: process.env.SOKETI_APP_ID || "auktiva",
      // Use NEXT_PUBLIC_ vars for shared config (key, port, tls)
      key: process.env.NEXT_PUBLIC_SOKETI_APP_KEY || "",
      secret: process.env.SOKETI_APP_SECRET || "",
      cluster: "default",
      // Server connects internally, so use separate SOKETI_HOST (defaults to 127.0.0.1)
      host: process.env.SOKETI_HOST || "127.0.0.1",
      port: parseInt(process.env.NEXT_PUBLIC_SOKETI_PORT || "6001", 10),
      useTLS: process.env.NEXT_PUBLIC_SOKETI_USE_TLS === "true",
    };
  }

  // Pusher Channels
  return {
    driver: "pusher",
    appId: process.env.PUSHER_APP_ID || "",
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
    secret: process.env.PUSHER_SECRET || "",
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
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
  return {
    driver: config.driver,
    key: config.key,
    cluster: config.cluster,
    host: config.host,
    port: config.port,
    useTLS: config.useTLS,
  };
}

/**
 * Check if realtime is enabled
 */
export function isRealtimeEnabled(): boolean {
  const config = getRealtimeConfig();
  return config.driver !== "disabled" && !!config.key && !!config.secret;
}
