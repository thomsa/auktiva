import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  isAnonymous: boolean;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface ItemDetail {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  currency: {
    code: string;
    name: string;
    symbol: string;
  };
  startingBid: number;
  minBidIncrement: number;
  currentBid: number | null;
  highestBidderId: string | null;
  bidderAnonymous: boolean;
  endDate: string | null;
  createdAt: string;
  creator: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface ItemResponse {
  item: ItemDetail;
  bids: Bid[];
}

export interface UseItemReturn {
  item: ItemDetail | undefined;
  bids: Bid[];
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => Promise<void>;
}

export function useItem(
  auctionId: string | undefined,
  itemId: string | undefined,
  initialData?: ItemResponse,
  options?: { refreshInterval?: number },
): UseItemReturn {
  const { data, error, isLoading, mutate } = useSWR<ItemResponse>(
    auctionId && itemId ? `/api/auctions/${auctionId}/items/${itemId}` : null,
    fetcher,
    {
      fallbackData: initialData,
      refreshInterval: options?.refreshInterval ?? 0,
      revalidateOnFocus: true,
    },
  );

  return {
    item: data?.item,
    bids: data?.bids ?? [],
    isLoading,
    error,
    mutate: async () => {
      await mutate();
    },
  };
}
