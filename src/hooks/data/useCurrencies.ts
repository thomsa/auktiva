import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export interface Currency {
  code: string;
  name: string;
  symbol: string;
}

export interface UseCurrenciesReturn {
  currencies: Currency[];
  isLoading: boolean;
  error: Error | undefined;
}

export function useCurrencies(): UseCurrenciesReturn {
  const { data, error, isLoading } = useSWR<Currency[]>(
    "/api/currencies",
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Cache for 1 minute
    },
  );

  return {
    currencies: data ?? [],
    isLoading,
    error,
  };
}
