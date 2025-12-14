import Link from "next/link";
import { isItemEnded } from "@/utils/auction-helpers";
import { SortDropdown, sidebarItemSortOptions } from "@/components/ui/sort-dropdown";

interface AuctionItemSummary {
  id: string;
  name: string;
  currentBid: number | null;
  startingBid: number;
  thumbnailUrl: string | null;
  endDate: string | null;
  currency: {
    symbol: string;
  };
}

interface ItemSidebarProps {
  items: AuctionItemSummary[];
  currentItemId: string;
  auctionId: string;
  isCollapsed: boolean;
  currentSort: string;
  onToggle: () => void;
}

export function ItemSidebar({
  items,
  currentItemId,
  auctionId,
  isCollapsed,
  currentSort,
  onToggle,
}: ItemSidebarProps) {
  return (
    <>
      {/* Sidebar */}
      <aside
        className={`hidden lg:block bg-base-100 border-r border-base-300 transition-all duration-300 ${
          isCollapsed ? "w-0 overflow-hidden" : "w-80"
        }`}
      >
        <div className="h-[calc(100vh-4rem)] overflow-y-auto sticky top-16">
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-semibold text-lg">Items in Auction</h2>
              <span className="badge badge-ghost">{items.length}</span>
            </div>
            <div className="sticky top-0 bg-base-100 pb-2 -mx-4 px-4 z-10">
              <SortDropdown
                options={sidebarItemSortOptions}
                currentSort={currentSort}
                paramName="sidebarSort"
                fullWidth
              />
            </div>
            <div className="space-y-2">
              {items.map((item) => {
                const ended = isItemEnded(item.endDate);
                return (
                  <Link
                    key={item.id}
                    href={`/auctions/${auctionId}/items/${item.id}`}
                    className={`block p-3 rounded-lg transition-colors ${
                      item.id === currentItemId
                        ? "bg-primary/10 border border-primary"
                        : "bg-base-200 hover:bg-base-300"
                    } ${ended ? "opacity-60" : ""}`}
                  >
                    <div className="flex gap-3">
                      <div className="relative shrink-0">
                        {item.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.thumbnailUrl}
                            alt={item.name}
                            className={`w-12 h-12 object-cover rounded ${ended ? "grayscale" : ""}`}
                          />
                        ) : (
                          <div
                            className={`w-12 h-12 bg-base-300 rounded flex items-center justify-center ${ended ? "grayscale" : ""}`}
                          >
                            <span className="icon-[tabler--photo] size-6 text-base-content/40"></span>
                          </div>
                        )}
                        {ended && (
                          <div className="absolute -top-1 -left-1">
                            <div className="badge badge-error badge-xs gap-0.5">
                              <span className="icon-[tabler--flag-filled] size-2"></span>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{item.name}</div>
                        <div
                          className={`text-sm font-semibold ${ended ? "text-base-content/50" : "text-primary"}`}
                        >
                          {item.currency.symbol}
                          {(item.currentBid || item.startingBid).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="hidden lg:flex fixed left-0 top-1/2 -translate-y-1/2 z-10 bg-base-100 border border-base-300 rounded-r-lg p-2 shadow-md hover:bg-base-200 transition-all"
        style={{ left: isCollapsed ? 0 : "calc(20rem - 1px)" }}
        aria-label={isCollapsed ? "Show items sidebar" : "Hide items sidebar"}
      >
        <span
          className={`icon-[tabler--chevron-${isCollapsed ? "right" : "left"}] size-5`}
        ></span>
      </button>
    </>
  );
}
