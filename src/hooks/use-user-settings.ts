import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface UserSettings {
  id: string;
  userId: string;
  itemSidebarCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useUserSettings() {
  const { data, error, isLoading, mutate } = useSWR<UserSettings>(
    "/api/user/settings",
    fetcher,
  );

  const updateSettings = async (
    updates: Partial<Pick<UserSettings, "itemSidebarCollapsed">>,
  ) => {
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        throw new Error("Failed to update settings");
      }

      const updated = await res.json();
      mutate(updated, false);
      return updated;
    } catch (err) {
      console.error("Update settings error:", err);
      throw err;
    }
  };

  const toggleItemSidebar = async () => {
    const newValue = !data?.itemSidebarCollapsed;
    return updateSettings({ itemSidebarCollapsed: newValue });
  };

  return {
    settings: data,
    isLoading,
    error,
    updateSettings,
    toggleItemSidebar,
    itemSidebarCollapsed: data?.itemSidebarCollapsed ?? false,
  };
}
