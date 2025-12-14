import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface AuctionItem {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  currentBid: number | null;
  endDate: string | null;
  createdAt: string;
  creatorId: string;
  thumbnailUrl: string | null;
  _count: {
    bids: number;
  };
}

export interface UseAuctionItemsReturn {
  items: AuctionItem[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
}

export function useAuctionItems(auctionId: string | undefined): UseAuctionItemsReturn {
  const { data, error, isLoading, mutate } = useSWR<AuctionItem[]>(
    auctionId ? `/api/auctions/${auctionId}/items` : null,
    fetcher
  );

  return {
    items: data ?? [],
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
  };
}
