"use client";

import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  SortDropdown,
  sidebarItemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";

export interface SidebarItem {
  id: string;
  name: string;
  currentBid: number | null;
  startingBid: number;
  thumbnailUrl: string | null;
  endDate: string | null;
  createdAt: string;
  highestBidderId: string | null;
  userHasBid: boolean;
  currency: {
    symbol: string;
  };
}

interface ItemsSidebarProps {
  items: SidebarItem[];
  auctionId: string;
  currentItemId: string;
  userId: string;
  collapsed: boolean;
  onToggle: () => void;
}

export function ItemsSidebar({
  items,
  auctionId,
  currentItemId,
  userId,
  collapsed,
  onToggle,
}: ItemsSidebarProps) {
  const t = useTranslations("item");
  const router = useRouter();

  const sidebarSort = (router.query.sidebarSort as string) || "date-desc";
  const sortedItems = useMemo(() => {
    return sortItems(items, sidebarSort);
  }, [items, sidebarSort]);

  return (
    <>
      {/* Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-base-100/80 backdrop-blur-xl border-r border-base-content/10 transition-all duration-300 ${
          collapsed ? "w-0 overflow-hidden" : "w-80"
        }`}
      >
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-sm uppercase tracking-wider text-base-content/60 flex items-center gap-2">
                <span className="icon-[tabler--list] size-4"></span>
                {t("sidebar.title")}
              </h2>
              <span className="badge badge-sm badge-ghost">{items.length}</span>
            </div>
            <div className="sticky top-0 bg-base-100/95 backdrop-blur z-10 pb-4">
              <SortDropdown
                options={sidebarItemSortOptions}
                currentSort={sidebarSort}
                paramName="sidebarSort"
                fullWidth
              />
            </div>
            <div className="space-y-2">
              {sortedItems.map((item) => (
                <SidebarItemCard
                  key={item.id}
                  item={item}
                  auctionId={auctionId}
                  isActive={item.id === currentItemId}
                  userId={userId}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="hidden lg:flex fixed z-20 bg-base-100 border border-base-content/10 rounded-r-lg p-1.5 shadow-md hover:bg-base-200 transition-all items-center justify-center top-24"
        style={{ left: collapsed ? 0 : "20rem" }}
        aria-label={collapsed ? t("sidebar.show") : t("sidebar.hide")}
      >
        <span
          className={`icon-[tabler--chevron-${collapsed ? "right" : "left"}] size-4 text-base-content/60`}
        ></span>
      </button>
    </>
  );
}

function SidebarItemCard({
  item,
  auctionId,
  isActive,
  userId,
}: {
  item: SidebarItem;
  auctionId: string;
  isActive: boolean;
  userId: string;
}) {
  const isEnded = item.endDate && new Date(item.endDate) < new Date();
  const isWinning = item.highestBidderId === userId;
  const isOutbid = item.userHasBid && !isWinning;

  return (
    <Link
      href={`/auctions/${auctionId}/items/${item.id}`}
      className={`block p-3 rounded-xl transition-all border ${
        isActive
          ? "bg-primary/5 border-primary/20 shadow-sm"
          : "bg-base-100/50 border-transparent hover:bg-base-100 hover:border-base-content/10"
      } ${isEnded ? "opacity-60" : ""}`}
    >
      <div className="flex gap-3">
        <div className="relative shrink-0">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className={`w-12 h-12 object-cover rounded-lg ${
                isEnded ? "grayscale" : ""
              }`}
            />
          ) : (
            <div
              className={`w-12 h-12 bg-base-200 rounded-lg flex items-center justify-center ${
                isEnded ? "grayscale" : ""
              }`}
            >
              <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
            </div>
          )}
          <StatusBadge
            isEnded={!!isEnded}
            isWinning={isWinning}
            isOutbid={isOutbid}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className={`font-medium truncate text-sm ${
              isActive ? "text-primary" : ""
            }`}
          >
            {item.name}
          </div>
          <div
            className={`text-xs font-semibold mt-0.5 ${
              isEnded
                ? "text-base-content/50"
                : isActive
                  ? "text-primary"
                  : "text-base-content/70"
            }`}
          >
            {item.currency.symbol}
            {(item.currentBid || item.startingBid).toFixed(2)}
          </div>
        </div>
      </div>
    </Link>
  );
}

function StatusBadge({
  isEnded,
  isWinning,
  isOutbid,
}: {
  isEnded: boolean;
  isWinning: boolean;
  isOutbid: boolean;
}) {
  if (isEnded && isWinning) {
    return (
      <div className="absolute -top-1 -left-1">
        <div className="badge badge-success badge-xs gap-0.5 shadow-sm">
          <span className="icon-[tabler--crown] size-2"></span>
        </div>
      </div>
    );
  }

  if (isEnded) {
    return (
      <div className="absolute -top-1 -left-1">
        <div className="badge badge-error badge-xs gap-0.5 shadow-sm">
          <span className="icon-[tabler--flag-filled] size-2"></span>
        </div>
      </div>
    );
  }

  if (isWinning) {
    return (
      <div className="absolute -top-1 -left-1">
        <div className="badge badge-success badge-xs gap-0.5 shadow-sm">
          <span className="icon-[tabler--trophy] size-2"></span>
        </div>
      </div>
    );
  }

  if (isOutbid) {
    return (
      <div className="absolute -top-1 -left-1">
        <div className="badge badge-warning badge-xs gap-0.5 shadow-sm">
          <span className="icon-[tabler--alert-triangle] size-2"></span>
        </div>
      </div>
    );
  }

  return null;
}
