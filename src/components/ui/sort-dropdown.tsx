import { useRouter } from "next/router";

export interface SortOption {
  value: string;
  label: string;
}

interface SortDropdownProps {
  options: SortOption[];
  currentSort: string;
  paramName?: string;
  className?: string;
  fullWidth?: boolean;
}

export function SortDropdown({
  options,
  currentSort,
  paramName = "sort",
  className = "",
  fullWidth = false,
}: SortDropdownProps) {
  const router = useRouter();

  const handleSortChange = (value: string) => {
    const query = { ...router.query, [paramName]: value };
    router.push(
      {
        pathname: router.pathname,
        query,
      },
      undefined,
      { shallow: true },
    );
  };

  const currentLabel =
    options.find((o) => o.value === currentSort)?.label || options[0]?.label;

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <label
        tabIndex={0}
        className={`btn btn-ghost btn-sm gap-1 ${fullWidth ? "w-full justify-between" : ""}`}
      >
        <span className="icon-[tabler--arrows-sort] size-4"></span>
        <span className="text-sm">{currentLabel}</span>
        <span className="icon-[tabler--chevron-down] size-4"></span>
      </label>
      <ul
        tabIndex={0}
        className="dropdown-content z-20 menu p-2 shadow-lg bg-base-100 rounded-box w-52"
      >
        {options.map((option) => (
          <li key={option.value}>
            <button
              onClick={() => handleSortChange(option.value)}
              className={currentSort === option.value ? "active" : ""}
            >
              {option.label}
              {currentSort === option.value && (
                <span className="icon-[tabler--check] size-4"></span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Predefined sort options for reuse
export const itemSortOptions: SortOption[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "end-asc", label: "Ending Soon" },
  { value: "end-desc", label: "Ending Later" },
  { value: "bids-desc", label: "Most Bids" },
  { value: "bids-asc", label: "Least Bids" },
];

export const auctionSortOptions: SortOption[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "end-asc", label: "Ending Soon" },
  { value: "end-desc", label: "Ending Later" },
];

export const sidebarItemSortOptions: SortOption[] = [
  { value: "date-desc", label: "Newest First" },
  { value: "date-asc", label: "Oldest First" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
  { value: "end-asc", label: "Ending Soon" },
  { value: "end-desc", label: "Ending Later" },
];

// Sort helper functions
export function sortItems<
  T extends {
    name: string;
    createdAt?: string;
    currentBid?: number | null;
    startingBid?: number;
    endDate?: string | null;
    _count?: { bids: number };
  },
>(items: T[], sortValue: string): T[] {
  const sorted = [...items];

  switch (sortValue) {
    case "date-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
    case "date-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      );
    case "price-desc":
      return sorted.sort(
        (a, b) =>
          (b.currentBid ?? b.startingBid ?? 0) -
          (a.currentBid ?? a.startingBid ?? 0),
      );
    case "price-asc":
      return sorted.sort(
        (a, b) =>
          (a.currentBid ?? a.startingBid ?? 0) -
          (b.currentBid ?? b.startingBid ?? 0),
      );
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "end-asc":
      return sorted.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    case "end-desc":
      return sorted.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return -1;
        if (!b.endDate) return 1;
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      });
    case "bids-desc":
      return sorted.sort(
        (a, b) => (b._count?.bids ?? 0) - (a._count?.bids ?? 0),
      );
    case "bids-asc":
      return sorted.sort(
        (a, b) => (a._count?.bids ?? 0) - (b._count?.bids ?? 0),
      );
    default:
      return sorted;
  }
}

export function sortAuctions<
  T extends {
    name: string;
    createdAt?: string;
    endDate?: string | null;
  },
>(auctions: T[], sortValue: string): T[] {
  const sorted = [...auctions];

  switch (sortValue) {
    case "date-desc":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() -
          new Date(a.createdAt || 0).getTime(),
      );
    case "date-asc":
      return sorted.sort(
        (a, b) =>
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime(),
      );
    case "name-asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name));
    case "end-asc":
      return sorted.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    case "end-desc":
      return sorted.sort((a, b) => {
        if (!a.endDate && !b.endDate) return 0;
        if (!a.endDate) return -1;
        if (!b.endDate) return 1;
        return new Date(b.endDate).getTime() - new Date(a.endDate).getTime();
      });
    default:
      return sorted;
  }
}
