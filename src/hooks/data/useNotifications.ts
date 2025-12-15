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

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

export function useNotifications(limit = 20): UseNotificationsReturn {
  const { data, error, isLoading, mutate } = useSWR<NotificationsResponse>(
    `/api/notifications?limit=${limit}`,
    fetcher,
    { refreshInterval: 30000 },
  );

  const markAsRead = async (id: string): Promise<void> => {
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
  };

  const markAllAsRead = async (): Promise<void> => {
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
  };

  return {
    notifications: data?.notifications ?? [],
    unreadCount: data?.unreadCount ?? 0,
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
    markAsRead,
    markAllAsRead,
  };
}
