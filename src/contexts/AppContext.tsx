import React, { createContext, useContext, useMemo } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface AppContextData {
  isUserAuctionAdmin: boolean;
  adminAuctionIds: string[];
  isLoading: boolean;
}

interface AppContextValue extends AppContextData {
  mutate: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

interface AppProviderProps {
  children: React.ReactNode;
}

interface UserAppDataResponse {
  isAuctionAdmin: boolean;
  adminAuctionIds: string[];
}

export function AppProvider({ children }: AppProviderProps) {
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  // Fetch user app data (admin status, etc.)
  const { data, isLoading, mutate } = useSWR<UserAppDataResponse>(
    isAuthenticated ? "/api/user/app-data" : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      keepPreviousData: true,
    },
  );

  const value = useMemo(
    () => ({
      isUserAuctionAdmin: data?.isAuctionAdmin ?? false,
      adminAuctionIds: data?.adminAuctionIds ?? [],
      isLoading,
      mutate: async () => {
        await mutate();
      },
    }),
    [data, isLoading, mutate],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useAppContext must be used within an AppProvider");
  }
  return context;
}
