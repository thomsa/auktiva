import { useRouter } from "next/router";
import { useCallback } from "react";

export interface UseSortFilterReturn {
  currentSort: string;
  setSort: (sort: string) => void;
}

export function useSortFilter(
  paramName = "sort",
  defaultSort = "date-desc",
): UseSortFilterReturn {
  const router = useRouter();
  const currentSort = (router.query[paramName] as string) || defaultSort;

  const setSort = useCallback(
    (sort: string) => {
      router.push(
        {
          pathname: router.pathname,
          query: { ...router.query, [paramName]: sort },
        },
        undefined,
        { shallow: true },
      );
    },
    [router, paramName],
  );

  return {
    currentSort,
    setSort,
  };
}
