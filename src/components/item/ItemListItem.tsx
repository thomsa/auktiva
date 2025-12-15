import Link from "next/link";
import { isItemEnded } from "@/utils/auction-helpers";
import { formatShortDate } from "@/utils/formatters";

interface ItemListItemProps {
  item: {
    id: string;
    name: string;
    description: string | null;
    currencyCode: string;
    startingBid: number;
    currentBid: number | null;
    endDate: string | null;
    creatorId: string;
    thumbnailUrl: string | null;
    _count: {
      bids: number;
    };
  };
  auctionId: string;
  userId: string;
  isAdmin: boolean;
}

export function ItemListItem({
  item,
  auctionId,
  userId,
  isAdmin,
}: ItemListItemProps) {
  const ended = isItemEnded(item.endDate);
  const canEditItem = item.creatorId === userId || isAdmin;

  return (
    <div
      className={`flex items-center gap-4 p-3 bg-base-200 hover:bg-base-300 rounded-lg transition-colors ${
        ended ? "opacity-75" : ""
      }`}
    >
      <Link
        href={`/auctions/${auctionId}/items/${item.id}`}
        className="flex-1 flex items-center gap-4 min-w-0"
      >
        <div className="relative shrink-0">
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className={`w-14 h-14 object-cover rounded ${ended ? "grayscale" : ""}`}
            />
          ) : (
            <div
              className={`w-14 h-14 bg-base-300 rounded flex items-center justify-center ${
                ended ? "grayscale" : ""
              }`}
            >
              <span className="icon-[tabler--photo] size-6 text-base-content/20"></span>
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
          <h3 className="font-medium truncate">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-base-content/60 truncate">
              {item.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="font-bold text-primary">
            {item.currentBid !== null
              ? `${item.currentBid} ${item.currencyCode}`
              : `${item.startingBid} ${item.currencyCode}`}
          </div>
          <div className="text-xs text-base-content/60">
            {item._count.bids} bids
          </div>
        </div>
        {item.endDate && (
          <div
            className={`text-xs shrink-0 w-24 text-right ${
              ended ? "text-error" : "text-base-content/50"
            }`}
          >
            {ended ? "Ended" : "Ends"} {formatShortDate(item.endDate)}
          </div>
        )}
      </Link>
      {canEditItem && (
        <Link
          href={`/auctions/${auctionId}/items/${item.id}/edit`}
          className="btn btn-ghost btn-xs btn-circle shrink-0"
          onClick={(e) => e.stopPropagation()}
          title="Edit item"
        >
          <span className="icon-[tabler--edit] size-4"></span>
        </Link>
      )}
    </div>
  );
}
