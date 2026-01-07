/**
 * React hook for Pusher/Soketi realtime subscriptions
 */

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import PusherJS from "pusher-js";
import type { Channel, Options as PusherOptions } from "pusher-js";
import {
  getClientConfig,
  isClientRealtimeEnabled,
} from "@/lib/realtime/client";
import { Events, Channels } from "@/lib/realtime/events";
import type { EventPayloadMap } from "@/lib/realtime/events";

// Debug logging - enabled in development or via localStorage
const DEBUG =
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" ||
    localStorage.getItem("REALTIME_DEBUG") === "true");

function log(message: string, data?: unknown) {
  if (DEBUG) {
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
let connectionAttempted = false;
let connectionFailed = false;

/**
 * Get or create the singleton Pusher client instance
 */
function getPusherClient(): PusherJS | null {
  if (!isClientRealtimeEnabled()) {
    log("Realtime is disabled");
    return null;
  }

  if (connectionFailed) {
    log("Connection previously failed, returning null");
    return null;
  }

  if (pusherInstance) {
    return pusherInstance;
  }

  if (connectionAttempted) {
    log("Connection already attempted, returning null");
    return null;
  }

  connectionAttempted = true;
  const config = getClientConfig();
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

    // Handle connection state changes
    pusherInstance.connection.bind(
      "state_change",
      (states: { previous: string; current: string }) => {
        log(`Connection state: ${states.previous} → ${states.current}`);
      },
    );

    pusherInstance.connection.bind("connected", () => {
      log("Connected successfully!");
    });

    // Handle connection errors
    pusherInstance.connection.bind("error", (err: Error) => {
      logError("Connection error:", err);
      connectionFailed = true;
    });

    pusherInstance.connection.bind("failed", () => {
      logError("Connection failed. Falling back to polling.");
      connectionFailed = true;
    });

    log("Pusher client created, connecting...");
  } catch (error) {
    logError("Failed to initialize Pusher client:", error);
    connectionFailed = true;
    return null;
  }

  return pusherInstance;
}

/**
 * Hook to check if realtime is connected
 */
export function useRealtimeStatus(): {
  isConnected: boolean;
  isEnabled: boolean;
} {
  const [isConnected, setIsConnected] = useState(() => {
    // Initialize based on current state (avoids setState in effect)
    const pusher = getPusherClient();
    return pusher?.connection.state === "connected" || false;
  });

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) {
      return;
    }

    const handleStateChange = (states: { current: string }) => {
      setIsConnected(states.current === "connected");
    };

    pusher.connection.bind("state_change", handleStateChange);

    return () => {
      pusher.connection.unbind("state_change", handleStateChange);
    };
  }, []);

  return {
    isConnected,
    isEnabled: isClientRealtimeEnabled(),
  };
}

// Simple channel cache - no external store needed
const channelCache = new Map<string, Channel>();

/**
 * Hook to subscribe to a channel and listen for events
 */
export function useChannel(channelName: string | null): Channel | null {
  // Use useMemo to get/create channel - this is derived state based on channelName
  const channel = useMemo(() => {
    if (!channelName) return null;

    const pusher = getPusherClient();
    if (!pusher) return null;

    // Check cache first
    let ch = channelCache.get(channelName);
    if (!ch) {
      log(`Subscribing to channel: ${channelName}`);
      ch = pusher.subscribe(channelName);
      channelCache.set(channelName, ch);
    }

    return ch;
  }, [channelName]);

  return channel;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, event]);
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
  const { isConnected, isEnabled } = useRealtimeStatus();

  // If realtime is enabled and connected, no polling needed
  if (isEnabled && isConnected) {
    return 0;
  }

  // If realtime is enabled but not connected, use longer interval
  if (isEnabled && !isConnected) {
    return Math.max(baseInterval, 60000); // At least 60s when falling back
  }

  // Realtime disabled, use base interval
  return baseInterval;
}

/**
 * SWR configuration options based on realtime connection status
 * When realtime is connected, disables all automatic revalidation
 * When realtime is disconnected/disabled, enables polling and focus revalidation
 */
export interface RealtimeSWRConfig {
  refreshInterval: number;
  revalidateOnFocus: boolean;
  revalidateOnReconnect: boolean;
  revalidateIfStale: boolean;
}

export function useRealtimeSWRConfig(baseInterval: number): RealtimeSWRConfig {
  const { isConnected, isEnabled } = useRealtimeStatus();

  // Memoize the config to prevent unnecessary re-renders
  return useMemo(() => {
    // Realtime is enabled and connected - disable all automatic revalidation
    // SWR will only fetch on mount, all updates come via realtime
    if (isEnabled && isConnected) {
      return {
        refreshInterval: 0,
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
        revalidateIfStale: false,
      };
    }

    // Realtime is enabled but not connected - use longer polling as fallback
    if (isEnabled && !isConnected) {
      return {
        refreshInterval: Math.max(baseInterval, 60000), // At least 60s
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        revalidateIfStale: true,
      };
    }

    // Realtime disabled - use normal polling
    return {
      refreshInterval: baseInterval,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateIfStale: false,
    };
  }, [isConnected, isEnabled, baseInterval]);
}

// Re-export for convenience
export { Events, Channels };
