import React, { createContext, useContext, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

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

  // Determine polling interval based on current route
  const refreshInterval = useMemo(() => {
    // Check if user is on an auction page
    const isAuctionPage = router.pathname.startsWith("/auctions/");

    // 5 seconds on auction pages, 30 seconds elsewhere
    return isAuctionPage ? 5000 : 30000;
  }, [router.pathname]);

  // Single shared SWR instance with smart polling configuration
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    "/api/notifications?limit=20",
    fetcher,
    {
      refreshInterval,
      // Revalidate on focus (when user returns to tab)
      revalidateOnFocus: true,
      // Don't revalidate on mount if data exists (avoid duplicate requests)
      revalidateOnMount: true,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
      // Keep previous data while revalidating
      keepPreviousData: true,
      // Retry on error with exponential backoff
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Don't revalidate when window is hidden (tab inactive)
      revalidateIfStale: false,
      // Focus throttle - prevent too many requests on rapid focus changes
      focusThrottleInterval: 5000,
    },
  );

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
