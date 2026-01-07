import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { usePollingInterval, type PollingPriority } from "@/hooks/ui";
import {
  usePrivateUserChannel,
  useEvent,
  useRealtimeSWRConfig,
  Events,
} from "@/hooks/realtime";
import type {
  NotificationNewEvent,
  NotificationCountEvent,
} from "@/lib/realtime/events";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  imageUrl: string | null;
  auctionId: string | null;
  itemId: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
}

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(
  undefined,
);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Subscribe to user's private channel for realtime notifications
  const userChannel = usePrivateUserChannel();

  // Determine polling priority based on current route
  const priority = useMemo((): PollingPriority => {
    // High priority on auction pages, low elsewhere
    const isAuctionPage = router.pathname.startsWith("/auctions/");
    return isAuctionPage ? "high" : "low";
  }, [router.pathname]);

  // Use polling hook - pauses when tab hidden, adjusts by priority
  const baseRefreshInterval = usePollingInterval({
    priority,
    disabled: !isAuthenticated,
  });

  // Get SWR config based on realtime connection status
  // When realtime is connected: disables all auto-revalidation (no polling, no focus refresh)
  // When realtime is disconnected: enables fallback polling
  const swrConfig = useRealtimeSWRConfig(baseRefreshInterval);

  // Single shared SWR instance with realtime-aware configuration
  // Only fetch if user is authenticated (pass null key to disable)
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    isAuthenticated ? "/api/notifications?limit=20" : null,
    fetcher,
    {
      // Realtime-aware config - disables polling when connected
      refreshInterval: isAuthenticated ? swrConfig.refreshInterval : 0,
      revalidateOnFocus: swrConfig.revalidateOnFocus,
      revalidateOnReconnect: swrConfig.revalidateOnReconnect,
      revalidateIfStale: swrConfig.revalidateIfStale,
      // Always fetch on mount to get initial data
      revalidateOnMount: true,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Retry on error with exponential backoff
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Focus throttle - prevent too many requests on rapid focus changes
      focusThrottleInterval: 5000,
    },
  );

  // Handle realtime notification events - add new notification to list
  const handleNewNotification = useCallback(
    (event: NotificationNewEvent) => {
      mutate(
        (current) =>
          current
            ? {
                ...current,
                notifications: [
                  {
                    id: event.id,
                    type: event.type,
                    title: event.title,
                    message: event.message,
                    imageUrl: event.imageUrl,
                    auctionId: event.auctionId,
                    itemId: event.itemId,
                    read: false,
                    createdAt: event.createdAt,
                  },
                  ...current.notifications,
                ].slice(0, 20), // Keep max 20
                unreadCount: current.unreadCount + 1,
              }
            : current,
        false,
      );
    },
    [mutate],
  );

  // Handle realtime count update events
  const handleCountUpdate = useCallback(
    (event: NotificationCountEvent) => {
      mutate(
        (current) =>
          current
            ? {
                ...current,
                unreadCount: event.unreadCount,
              }
            : current,
        false,
      );
    },
    [mutate],
  );

  // Subscribe to realtime events
  useEvent(userChannel, Events.NOTIFICATION_NEW, handleNewNotification);
  useEvent(userChannel, Events.NOTIFICATION_COUNT, handleCountUpdate);

  const markAsRead = useCallback(
    async (id: string): Promise<void> => {
      // Optimistic update
      mutate(
        (current) =>
          current
            ? {
                ...current,
                notifications: current.notifications.map((n) =>
                  n.id === id ? { ...n, read: true } : n,
                ),
                unreadCount: Math.max(0, current.unreadCount - 1),
              }
            : current,
        false,
      );

      try {
        await fetch(`/api/notifications/${id}`, { method: "PATCH" });
        await mutate();
      } catch (err) {
        console.error("Failed to mark as read:", err);
        await mutate();
      }
    },
    [mutate],
  );

  const markAllAsRead = useCallback(async (): Promise<void> => {
    // Optimistic update
    mutate(
      (current) =>
        current
          ? {
              ...current,
              notifications: current.notifications.map((n) => ({
                ...n,
                read: true,
              })),
              unreadCount: 0,
            }
          : current,
      false,
    );

    try {
      await fetch("/api/notifications/read-all", { method: "POST" });
      await mutate();
    } catch (err) {
      console.error("Failed to mark all as read:", err);
      await mutate();
    }
  }, [mutate]);

  const value = useMemo(
    () => ({
      notifications: data?.notifications ?? [],
      unreadCount: data?.unreadCount ?? 0,
      isLoading,
      error,
      mutate: async () => {
        await mutate();
      },
      markAsRead,
      markAllAsRead,
    }),
    [data, isLoading, error, mutate, markAsRead, markAllAsRead],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotifications must be used within a NotificationProvider",
    );
  }
  return context;
}
