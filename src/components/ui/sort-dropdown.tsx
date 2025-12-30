import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

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
  const t = useTranslations("sort");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

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
    setIsOpen(false);
  };

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const menuWidth = 208; // w-52 = 13rem = 208px
      let left = rect.right - menuWidth;

      // Ensure menu doesn't go off left edge
      if (left < 8) left = 8;
      // Ensure menu doesn't go off right edge
      if (left + menuWidth > window.innerWidth - 8) {
        left = window.innerWidth - menuWidth - 8;
      }

      setPosition({
        top: rect.bottom + 4,
        left,
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node) &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const currentOption =
    options.find((o) => o.value === currentSort) || options[0];
  const currentLabel = currentOption ? t(currentOption.label) : "";

  return (
    <div className={className}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`btn btn-ghost btn-sm gap-1 ${
          fullWidth ? "w-full justify-between" : ""
        }`}
      >
        <span className="icon-[tabler--arrows-sort] size-4"></span>
        <span className="text-sm">{currentLabel}</span>
        <span className="icon-[tabler--chevron-down] size-4"></span>
      </button>
      {isOpen &&
        typeof window !== "undefined" &&
        createPortal(
          <ul
            ref={menuRef}
            className="fixed z-50 menu p-2 shadow-lg bg-base-100 rounded-box w-52 border border-base-content/10"
            style={{ top: position.top, left: position.left }}
          >
            {options.map((option) => (
              <li key={option.value}>
                <button
                  onClick={() => handleSortChange(option.value)}
                  className={currentSort === option.value ? "active" : ""}
                >
                  {t(option.label)}
                  {currentSort === option.value && (
                    <span className="icon-[tabler--check] size-4"></span>
                  )}
                </button>
              </li>
            ))}
          </ul>,
          document.body,
        )}
    </div>
  );
}

// Sort option keys for translation lookup
export const itemSortOptions: SortOption[] = [
  { value: "date-desc", label: "newestFirst" },
  { value: "date-asc", label: "oldestFirst" },
  { value: "price-desc", label: "priceHighToLow" },
  { value: "price-asc", label: "priceLowToHigh" },
  { value: "name-asc", label: "nameAZ" },
  { value: "name-desc", label: "nameZA" },
  { value: "end-asc", label: "endingSoon" },
  { value: "end-desc", label: "endingLater" },
  { value: "bids-desc", label: "mostBids" },
  { value: "bids-asc", label: "leastBids" },
];

export const auctionSortOptions: SortOption[] = [
  { value: "date-desc", label: "newestFirst" },
  { value: "date-asc", label: "oldestFirst" },
  { value: "name-asc", label: "nameAZ" },
  { value: "name-desc", label: "nameZA" },
  { value: "end-asc", label: "endingSoon" },
  { value: "end-desc", label: "endingLater" },
];

export const sidebarItemSortOptions: SortOption[] = [
  { value: "date-desc", label: "newestFirst" },
  { value: "date-asc", label: "oldestFirst" },
  { value: "price-desc", label: "priceHighToLow" },
  { value: "price-asc", label: "priceLowToHigh" },
  { value: "name-asc", label: "nameAZ" },
  { value: "name-desc", label: "nameZA" },
  { value: "end-asc", label: "endingSoon" },
  { value: "end-desc", label: "endingLater" },
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

export function sortListings<
  T extends {
    name: string;
    createdAt?: string;
    endDate?: string | null;
    currentBid?: number | null;
    startingBid?: number;
    bidCount?: number;
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
      return sorted.sort((a, b) => (b.bidCount ?? 0) - (a.bidCount ?? 0));
    case "bids-asc":
      return sorted.sort((a, b) => (a.bidCount ?? 0) - (b.bidCount ?? 0));
    default:
      return sorted;
  }
}

export const listingSortOptions: SortOption[] = [
  { value: "date-desc", label: "newestFirst" },
  { value: "date-asc", label: "oldestFirst" },
  { value: "price-desc", label: "priceHighToLow" },
  { value: "price-asc", label: "priceLowToHigh" },
  { value: "name-asc", label: "nameAZ" },
  { value: "name-desc", label: "nameZA" },
  { value: "bids-desc", label: "mostBids" },
  { value: "bids-asc", label: "leastBids" },
];

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
