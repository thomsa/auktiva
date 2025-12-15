import Link from "next/link";
import { isItemEnded } from "@/utils/auction-helpers";
import { formatShortDate } from "@/utils/formatters";

interface ItemCardProps {
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

export function ItemCard({ item, auctionId, userId, isAdmin }: ItemCardProps) {
  const ended = isItemEnded(item.endDate);
  const canEditItem = item.creatorId === userId || isAdmin;

  return (
    <div
      className={`card bg-base-200 hover:bg-base-300 transition-colors relative ${
        ended ? "opacity-75" : ""
      }`}
    >
      <Link href={`/auctions/${auctionId}/items/${item.id}`} className="block">
        {item.thumbnailUrl ? (
          <figure className="h-36 relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className={`w-full h-full object-cover ${ended ? "grayscale" : ""}`}
            />
            {ended && (
              <div className="absolute top-2 left-2">
                <div className="badge badge-error gap-1">
                  <span className="icon-[tabler--flag-filled] size-3"></span>
                  Ended
                </div>
              </div>
            )}
          </figure>
        ) : (
          <figure
            className={`h-36 bg-base-300 flex items-center justify-center relative ${
              ended ? "grayscale" : ""
            }`}
          >
            <span className="icon-[tabler--photo] size-12 text-base-content/20"></span>
            {ended && (
              <div className="absolute top-2 left-2">
                <div className="badge badge-error gap-1">
                  <span className="icon-[tabler--flag-filled] size-3"></span>
                  Ended
                </div>
              </div>
            )}
          </figure>
        )}
        <div className="card-body p-4">
          <h3 className="card-title text-base pr-8">{item.name}</h3>
          {item.description && (
            <p className="text-sm text-base-content/60 line-clamp-2">
              {item.description}
            </p>
          )}
          <div className="mt-auto pt-3">
            <div className="text-lg font-bold text-primary">
              {item.currentBid !== null
                ? `${item.currentBid} ${item.currencyCode}`
                : `${item.startingBid} ${item.currencyCode}`}
            </div>
            <div className="flex justify-between items-center text-xs mt-1">
              <span className="text-base-content/60">
                {item._count.bids} bids
              </span>
              {item.endDate && (
                <span className={ended ? "text-error" : "text-base-content/60"}>
                  {ended ? "Ended" : "Ends"} {formatShortDate(item.endDate)}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
      {canEditItem && (
        <Link
          href={`/auctions/${auctionId}/items/${item.id}/edit`}
          className="btn btn-ghost btn-xs btn-circle absolute top-2 right-2 bg-base-100/80"
          onClick={(e) => e.stopPropagation()}
          title="Edit item"
        >
          <span className="icon-[tabler--edit] size-3"></span>
        </Link>
      )}
    </div>
  );
}
