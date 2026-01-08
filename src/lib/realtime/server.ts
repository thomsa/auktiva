/**
 * Server-side Pusher/Soketi client
 *
 * This module provides a unified interface for publishing events
 * to either Soketi (self-hosted) or Pusher Channels (cloud).
 */

import Pusher from "pusher";
import { getRealtimeConfig, isRealtimeEnabled } from "./config";
import type { EventPayloadMap, ChannelName } from "./events";
import { Events } from "./events";

// Debug logging - enabled via REALTIME_DEBUG=true
const DEBUG =
  process.env.REALTIME_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[Realtime:Server] ${message}`, data !== undefined ? data : "");
  }
}

function logError(message: string, error?: unknown) {
  console.error(
    `[Realtime:Server] ${message}`,
    error !== undefined ? error : "",
  );
}

// Singleton instance
let pusherInstance: Pusher | null = null;
let connectionError: string | null = null;

/**
 * Get or create the Pusher server instance
 */
function getPusherInstance(): Pusher | null {
  if (!isRealtimeEnabled()) {
    log("Realtime is disabled");
    return null;
  }

  if (pusherInstance) {
    return pusherInstance;
  }

  const config = getRealtimeConfig();
  log("Initializing Pusher client", {
    driver: config.driver,
    host: config.host,
    port: config.port,
  });

  try {
    if (config.driver === "soketi") {
      pusherInstance = new Pusher({
        appId: config.appId,
        key: config.key,
        secret: config.secret,
        host: config.host || "127.0.0.1",
        port: String(config.port || 6001),
        useTLS: config.useTLS,
      });
      log("Soketi client initialized", {
        host: config.host,
        port: config.port,
      });
    } else if (config.driver === "pusher") {
      pusherInstance = new Pusher({
        appId: config.appId,
        key: config.key,
        secret: config.secret,
        cluster: config.cluster,
        useTLS: config.useTLS,
      });
      log("Pusher client initialized", { cluster: config.cluster });
    }

    connectionError = null;
  } catch (error) {
    connectionError = error instanceof Error ? error.message : "Unknown error";
    logError("Failed to initialize Pusher client:", error);
  }

  return pusherInstance;
}

/**
 * Publish an event to a channel
 *
 * @param channel - Channel name (use Channels helper)
 * @param event - Event name (use Events constant)
 * @param data - Event payload
 * @returns Promise that resolves when the event is published
 */
export async function publish<E extends keyof EventPayloadMap>(
  channel: ChannelName,
  event: E,
  data: EventPayloadMap[E],
): Promise<void> {
  const pusher = getPusherInstance();

  if (!pusher) {
    // Silently skip if realtime is not configured
    log(`Skipping publish (no client): ${event} → ${channel}`);
    return;
  }

  log(`Publishing: ${event} → ${channel}`, data);

  try {
    await pusher.trigger(channel, event, data);
    log(`Published successfully: ${event} → ${channel}`);
  } catch (error) {
    // Log error but don't throw - realtime failures shouldn't break the app
    logError(`Failed to publish ${event} to ${channel}:`, error);

    // Check for Pusher limit errors
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (
        message.includes("limit") ||
        message.includes("quota") ||
        message.includes("rate")
      ) {
        logError(
          "PUSHER LIMIT EXCEEDED - Consider upgrading your plan or switching to self-hosted Soketi",
        );
      }
    }
  }
}

/**
 * Publish to multiple channels at once
 */
export async function publishToMany<E extends keyof EventPayloadMap>(
  channels: ChannelName[],
  event: E,
  data: EventPayloadMap[E],
): Promise<void> {
  const pusher = getPusherInstance();

  if (!pusher || channels.length === 0) {
    log(`Skipping publishToMany (no client or empty channels): ${event}`);
    return;
  }

  log(`Publishing to ${channels.length} channels: ${event}`, { channels });

  try {
    // Pusher allows up to 100 channels per trigger
    const batchSize = 100;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      await pusher.trigger(batch, event, data);
    }
    log(`Published successfully to ${channels.length} channels: ${event}`);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    if (
      errorMessage.includes("limit") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("429")
    ) {
      logError(
        `PUSHER LIMIT EXCEEDED: ${errorMessage}. ` +
          `Consider upgrading your Pusher plan or switching to self-hosted Soketi.`,
      );
    } else {
      logError(`Failed to publish event ${event}:`, error);
    }
  }
}

/**
 * Authenticate a user for a private channel
 *
 * @param socketId - Socket ID from the client
 * @param channel - Channel name (must start with 'private-')
 * @returns Authentication response or null if not authorized
 */
export function authenticateChannel(
  socketId: string,
  channel: string,
): Pusher.AuthResponse | null {
  const pusher = getPusherInstance();

  if (!pusher) {
    return null;
  }

  try {
    return pusher.authorizeChannel(socketId, channel);
  } catch (error) {
    console.error("[Realtime] Channel authentication failed:", error);
    return null;
  }
}

/**
 * Get the current connection status
 */
export function getConnectionStatus(): {
  enabled: boolean;
  driver: string;
  error: string | null;
} {
  const config = getRealtimeConfig();
  return {
    enabled: isRealtimeEnabled(),
    driver: config.driver,
    error: connectionError,
  };
}

// Re-export events for convenience
export { Events };
