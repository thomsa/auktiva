/**
 * React hook for Pusher/Soketi realtime subscriptions
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { useSession } from "next-auth/react";
import PusherJS from "pusher-js";
import type { Channel, Options as PusherOptions } from "pusher-js";
import {
  getClientConfig,
  isClientRealtimeEnabled,
} from "@/lib/realtime/client";
import { Events, Channels } from "@/lib/realtime/events";
import type { EventPayloadMap, ChannelName } from "@/lib/realtime/events";
import { resolveRealtimeSWRConfig } from "@/lib/realtime/fallback";
import type { RealtimeSWRConfig } from "@/lib/realtime/fallback";

// Debug logging - enabled in development or via localStorage
// Use a function to avoid SSR/hydration issues with localStorage access
function isDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NODE_ENV === "development") return true;
  try {
    return localStorage.getItem("REALTIME_DEBUG") === "true";
  } catch {
    return false;
  }
}

function log(message: string, data?: unknown) {
  if (isDebugEnabled()) {
    console.log(
      `%c[Realtime:Client] ${message}`,
      "color: #9333ea",
      data !== undefined ? data : "",
    );
  }
}

function logError(message: string, error?: unknown) {
  console.error(
    `[Realtime:Client] ${message}`,
    error !== undefined ? error : "",
  );
}

// Singleton Pusher instance
let pusherInstance: PusherJS | null = null;
let connectionFailed = false;
let hasConnected = false;
let reconnectCount = 0;
const realtimeListeners = new Set<() => void>();

function notifyRealtimeListeners() {
  for (const listener of realtimeListeners) listener();
}

function handleConnectionState({
  previous,
  current,
}: {
  previous: string;
  current: string;
}) {
  log(`Connection state: ${previous} → ${current}`);

  if (current === "connected") {
    if (hasConnected) reconnectCount += 1;
    hasConnected = true;
    log("Connected successfully!");
  } else if (current === "unavailable") {
    logError("Connection unavailable. Retrying.");
  } else if (current === "failed") {
    connectionFailed = true;
    logError("Connection failed. Falling back to polling.");
  }

  notifyRealtimeListeners();
}

/**
 * Get or create the singleton Pusher client instance
 */
function getPusherClient(): PusherJS | null {
  if (typeof window === "undefined" || connectionFailed) {
    return null;
  }

  if (pusherInstance) {
    return pusherInstance;
  }

  const config = getClientConfig();
  if (config.driver === "disabled" || !config.key) {
    return null;
  }

  log("Initializing Pusher client", {
    driver: config.driver,
    wsHost: config.wsHost,
    wsPort: config.wsPort,
    forceTLS: config.forceTLS,
  });

  try {
    const options: PusherOptions = {
      cluster: config.cluster,
      forceTLS: config.forceTLS,
      enabledTransports: config.enabledTransports,
      disableStats: config.disableStats,
      authEndpoint: config.authEndpoint,
    };

    // Soketi-specific options
    if (config.driver === "soketi") {
      if (config.wsHost) {
        options.wsHost = config.wsHost;
      }
      if (config.wsPort) {
        options.wsPort = config.wsPort;
      }
      if (config.wssPort) {
        options.wssPort = config.wssPort;
      }
    }

    pusherInstance = new PusherJS(config.key, options);

    const connection = pusherInstance.connection;
    connection.bind("state_change", handleConnectionState);
    connection.bind("error", (error: unknown) => {
      logError("Connection error:", error);
    });
    // Pusher can synchronously report unsupported transports in its constructor.
    handleConnectionState({
      previous: "initialized",
      current: connection.state,
    });

    log("Pusher client created, connecting...");
  } catch (error) {
    logError("Failed to initialize Pusher client:", error);
    return null;
  }

  return connectionFailed ? null : pusherInstance;
}

function subscribeToRealtime(listener: () => void): () => void {
  realtimeListeners.add(listener);
  getPusherClient();
  return () => {
    realtimeListeners.delete(listener);
  };
}

/**
 * Hook to check if realtime is connected
 */
export function useRealtimeStatus(channel?: Channel | null): {
  isConnected: boolean;
  isEnabled: boolean;
} {
  const isConnected = useSyncExternalStore(
    subscribeToRealtime,
    () =>
      pusherInstance?.connection.state === "connected" &&
      (channel === undefined || channel?.subscribed === true),
    () => false,
  );

  return {
    isConnected,
    isEnabled: isClientRealtimeEnabled(),
  };
}

/** Counts successful connections after the first one in this browser session. */
export function useRealtimeReconnect(): number {
  return useSyncExternalStore(
    subscribeToRealtime,
    () => reconnectCount,
    () => 0,
  );
}

/** Refresh a mounted consumer once when the client reconnects. */
export function useOnRealtimeReconnect(
  channel: Channel | null,
  refresh: () => unknown,
  enabled = true,
) {
  const reconnect = useRealtimeReconnect();
  const { isConnected } = useRealtimeStatus(channel);
  const lastReconnect = useRef(reconnect);

  useEffect(() => {
    if (lastReconnect.current === reconnect || (enabled && !isConnected)) {
      return;
    }
    lastReconnect.current = reconnect;
    if (enabled) void refresh();
  }, [enabled, isConnected, reconnect, refresh]);
}

/**
 * Hook to subscribe to a channel and listen for events
 * @param channelName - Must be created using Channels.item(), Channels.privateUser(), or Channels.privateAuction()
 */
export function useChannel(channelName: ChannelName | null): Channel | null {
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!channelName) return () => {};

      const unsubscribe = subscribeToRealtime(listener);
      const pusher = pusherInstance;
      if (pusher && !connectionFailed && !pusher.channel(channelName)) {
        log(`Subscribing to channel: ${channelName}`);
        const channel = pusher.subscribe(channelName);
        channel.bind("pusher:subscription_succeeded", () => {
          log(`Subscribed to channel: ${channelName}`);
          notifyRealtimeListeners();
        });
        channel.bind("pusher:subscription_error", (error: unknown) => {
          logError(`Failed to subscribe to channel: ${channelName}`, error);
        });
        notifyRealtimeListeners();
      }
      return unsubscribe;
    },
    [channelName],
  );

  return useSyncExternalStore(
    subscribe,
    () => (channelName ? (pusherInstance?.channel(channelName) ?? null) : null),
    () => null,
  );
}

/**
 * Hook to subscribe to an event on a channel
 */
export function useEvent<E extends keyof EventPayloadMap>(
  channel: Channel | null,
  event: E,
  callback: (data: EventPayloadMap[E]) => void,
): void {
  useEffect(() => {
    if (!channel) {
      return;
    }

    log(`Binding event: ${event} on channel: ${channel.name}`);

    const wrappedCallback = (data: EventPayloadMap[E]) => {
      log(`Received event: ${event}`, data);
      callback(data);
    };

    channel.bind(event, wrappedCallback);

    return () => {
      log(`Unbinding event: ${event} from channel: ${channel.name}`);
      channel.unbind(event, wrappedCallback);
    };
  }, [callback, channel, event]);
}

/**
 * Hook to subscribe to the current user's private channel
 */
export function usePrivateUserChannel(): Channel | null {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  return useChannel(userId ? Channels.privateUser(userId) : null);
}

/**
 * Hook to subscribe to an auction's private channel (for members only)
 */
export function usePrivateAuctionChannel(
  auctionId: string | null,
): Channel | null {
  return useChannel(auctionId ? Channels.privateAuction(auctionId) : null);
}

/**
 * Hook to subscribe to an item's private channel (for bid updates)
 */
export function useItemChannel(itemId: string | null): Channel | null {
  return useChannel(itemId ? Channels.item(itemId) : null);
}

/**
 * Hook to subscribe to an auction's private channel
 */
export function useAuctionChannel(auctionId: string | null): Channel | null {
  return useChannel(auctionId ? Channels.privateAuction(auctionId) : null);
}

/**
 * Get the fallback polling interval when realtime is not available
 * Returns 0 if realtime is connected (no polling needed)
 */
export function useFallbackPollingInterval(baseInterval: number): number {
  return useRealtimeSWRConfig(baseInterval).refreshInterval;
}

/**
 * SWR configuration options based on realtime connection status
 * When realtime is connected, disables all automatic revalidation
 * When realtime is disconnected/disabled, enables polling and focus revalidation
 */
export function useRealtimeSWRConfig(
  baseInterval: number,
  channel?: Channel | null,
): RealtimeSWRConfig {
  const { isConnected, isEnabled } = useRealtimeStatus(channel);

  return useMemo(
    () => resolveRealtimeSWRConfig({ isConnected, isEnabled, baseInterval }),
    [isConnected, isEnabled, baseInterval],
  );
}

// Re-export for convenience
export { Events, Channels };
export type { RealtimeSWRConfig };
