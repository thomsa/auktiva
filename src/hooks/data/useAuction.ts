import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface Auction {
  id: string;
  name: string;
  description: string | null;
  joinMode: string;
  memberCanInvite: boolean;
  bidderVisibility: string;
  endDate: string | null;
  itemEndMode: string;
  inviteToken: string | null;
  createdAt: string;
  thumbnailUrl: string | null;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
  _count: {
    items: number;
    members: number;
  };
}

export interface UseAuctionReturn {
  auction: Auction | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
}

export function useAuction(auctionId: string | undefined): UseAuctionReturn {
  const { data, error, isLoading, mutate } = useSWR<Auction>(
    auctionId ? `/api/auctions/${auctionId}` : null,
    fetcher,
  );

  return {
    auction: data,
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
  };
}
