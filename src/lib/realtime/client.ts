/**
 * Client-side Pusher/Soketi configuration
 *
 * This module provides the client configuration for connecting to
 * either Soketi (self-hosted) or Pusher Channels (cloud).
 *
 * Note: The actual PusherJS instance is created in the React hook
 * to ensure proper lifecycle management.
 */

import type { RealtimeDriver } from "./config";

export interface ClientRealtimeConfig {
  driver: RealtimeDriver;
  key: string;
  cluster: string;
  wsHost?: string;
  wsPort?: number;
  wssPort?: number;
  forceTLS: boolean;
  enabledTransports: ("ws" | "wss")[];
  disableStats: boolean;
  authEndpoint: string;
}

/**
 * Get client-side Pusher configuration from environment variables
 *
 * These are NEXT_PUBLIC_ prefixed so they're available in the browser
 */
export function getClientConfig(): ClientRealtimeConfig {
  const driver = (process.env.NEXT_PUBLIC_REALTIME_DRIVER ||
    "disabled") as RealtimeDriver;

  if (driver === "disabled") {
    return {
      driver: "disabled",
      key: "",
      cluster: "",
      forceTLS: false,
      enabledTransports: [],
      disableStats: true,
      authEndpoint: "/api/pusher/auth",
    };
  }

  if (driver === "soketi") {
    const host = process.env.NEXT_PUBLIC_SOKETI_HOST || "127.0.0.1";
    const port = parseInt(process.env.NEXT_PUBLIC_SOKETI_PORT || "6001", 10);
    const useTLS = process.env.NEXT_PUBLIC_SOKETI_USE_TLS === "true";

    return {
      driver: "soketi",
      key: process.env.NEXT_PUBLIC_SOKETI_APP_KEY || "",
      cluster: "default",
      wsHost: host,
      wsPort: useTLS ? undefined : port,
      wssPort: useTLS ? port : undefined,
      forceTLS: useTLS,
      enabledTransports: useTLS ? ["wss"] : ["ws", "wss"],
      disableStats: true,
      authEndpoint: "/api/pusher/auth",
    };
  }

  // Pusher Channels
  return {
    driver: "pusher",
    key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "eu",
    forceTLS: true,
    enabledTransports: ["ws", "wss"],
    disableStats: true,
    authEndpoint: "/api/pusher/auth",
  };
}

/**
 * Check if realtime is enabled on the client
 */
export function isClientRealtimeEnabled(): boolean {
  const config = getClientConfig();
  return config.driver !== "disabled" && !!config.key;
}
