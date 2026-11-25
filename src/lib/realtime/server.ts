/**
 * Server-side Pusher/Soketi client
 *
 * This module provides a unified interface for publishing events
 * to either Soketi (self-hosted) or Pusher Channels (cloud).
 */

import { Agent as HttpAgent } from "node:http";
import { Agent as HttpsAgent } from "node:https";
import Pusher from "pusher";
import { createLogger } from "../logger";
import {
  DEFAULT_SOKETI_PORT,
  getRealtimeConfig,
  isRealtimeEnabled,
  REALTIME_PUBLISH_TIMEOUT_MS,
} from "./config";
import type { EventPayloadMap, ChannelName } from "./events";
import { Events } from "./events";

const logger = createLogger("realtime");
const PUBLISH_TIMEOUT_MESSAGE = `Publish timed out after ${REALTIME_PUBLISH_TIMEOUT_MS} ms`;

// Debug logging - enabled via REALTIME_DEBUG=true
const DEBUG =
  process.env.REALTIME_DEBUG === "true" ||
  process.env.NODE_ENV === "development";

function log(message: string, data?: unknown) {
  if (DEBUG) {
    console.log(`[Realtime:Server] ${message}`, data !== undefined ? data : "");
  }
}

function logPublishError(message: string, error: unknown) {
  // SDK errors can include signed URLs or arbitrary provider response bodies.
  const status =
    typeof error === "object" &&
    error &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : undefined;

  if (status === 429) {
    logger.error(
      { status },
      `${message}. Realtime provider rate limit exceeded.`,
    );
  } else if (status !== undefined) {
    logger.error({ status }, message);
  } else if (
    error instanceof Error &&
    error.message === PUBLISH_TIMEOUT_MESSAGE
  ) {
    logger.error(`${message}. ${PUBLISH_TIMEOUT_MESSAGE}.`);
  } else {
    logger.error(`${message}. Realtime request failed.`);
  }
}

let channelSigner: Pusher | null = null;
let connectionError: string | null = null;

function getPusherOptions(): Pusher.Options | null {
  const config = getRealtimeConfig();
  if (config.driver === "disabled" || !config.key || !config.secret) {
    return null;
  }

  const baseOptions = {
    appId: config.appId,
    key: config.key,
    secret: config.secret,
    useTLS: config.useTLS,
    timeout: REALTIME_PUBLISH_TIMEOUT_MS,
  };
  return config.driver === "soketi"
    ? {
        ...baseOptions,
        host: config.host || "127.0.0.1",
        port: String(config.port ?? DEFAULT_SOKETI_PORT),
      }
    : { ...baseOptions, cluster: config.cluster };
}

function createPusher(options: Pusher.Options): Pusher {
  try {
    const pusher = new Pusher(options);
    connectionError = null;
    return pusher;
  } catch {
    connectionError = "Failed to initialize Pusher client";
    throw new Error(connectionError);
  }
}

async function trigger<E extends keyof EventPayloadMap>(
  options: Pusher.Options,
  channels: ChannelName | ChannelName[],
  event: E,
  data: EventPayloadMap[E],
): Promise<void> {
  // The SDK clears its timeout at response headers, before reading error bodies.
  // Give each publish its own agent so cancellation only closes its sockets.
  const agent = options.useTLS ? new HttpsAgent() : new HttpAgent();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timeout = setTimeout(
      () => reject(new Error(PUBLISH_TIMEOUT_MESSAGE)),
      REALTIME_PUBLISH_TIMEOUT_MS,
    );
  });
  try {
    const pusher = createPusher({ ...options, agent });
    await Promise.race([deadline, pusher.trigger(channels, event, data)]);
  } finally {
    clearTimeout(timeout);
    agent.destroy();
  }
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
  const options = getPusherOptions();

  if (!options) {
    // Silently skip if realtime is not configured
    log(`Skipping publish (no client): ${event} → ${channel}`);
    return;
  }

  log(`Publishing: ${event} → ${channel}`, data);

  try {
    await trigger(options, channel, event, data);
    log(`Published successfully: ${event} → ${channel}`);
  } catch (error) {
    // Log error but don't throw - realtime failures shouldn't break the app
    logPublishError(`Failed to publish ${event} to ${channel}`, error);
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
  const options = getPusherOptions();

  if (!options || channels.length === 0) {
    log(`Skipping publishToMany (no client or empty channels): ${event}`);
    return;
  }

  log(`Publishing to ${channels.length} channels: ${event}`, { channels });

  try {
    // Pusher allows up to 100 channels per trigger
    const batchSize = 100;
    for (let i = 0; i < channels.length; i += batchSize) {
      const batch = channels.slice(i, i + batchSize);
      await trigger(options, batch, event, data);
    }
    log(`Published successfully to ${channels.length} channels: ${event}`);
  } catch (error) {
    logPublishError(`Failed to publish event ${event}`, error);
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
  const options = getPusherOptions();

  if (!options) {
    return null;
  }

  try {
    channelSigner ??= createPusher(options);
    return channelSigner.authorizeChannel(socketId, channel);
  } catch {
    logger.error("Channel authentication failed");
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
