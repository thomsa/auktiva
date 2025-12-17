import Link from "next/link";
import { useTranslations } from "next-intl";
import { isItemEnded, getBidStatus } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";

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
    highestBidderId?: string | null;
    userHasBid?: boolean;
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
  const t = useTranslations();
  const { formatShortDate } = useFormatters();
  const ended = isItemEnded(item.endDate);
  const canEditItem = item.creatorId === userId || isAdmin;

  // Bid status logic
  const isHighestBidder = item.highestBidderId === userId;
  const bidStatus = item.userHasBid
    ? getBidStatus(isHighestBidder, ended)
    : null;

  return (
    <div
      className={`flex items-center gap-4 p-3 bg-base-100/50 hover:bg-base-100 border border-base-content/5 hover:border-primary/20 rounded-xl transition-all duration-200 group ${
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
              className={`w-14 h-14 object-cover rounded-lg shadow-sm ${ended ? "grayscale" : ""}`}
            />
          ) : (
            <div
              className={`w-14 h-14 bg-base-200 rounded-lg flex items-center justify-center ${
                ended ? "grayscale" : ""
              }`}
            >
              <span className="icon-[tabler--photo] size-6 text-base-content/20"></span>
            </div>
          )}
          {bidStatus === "won" ? (
            <div className="absolute -top-1 -left-1">
              <div className="badge badge-success badge-xs gap-0.5 shadow-sm">
                <span className="icon-[tabler--crown] size-2"></span>
              </div>
            </div>
          ) : ended ? (
            <div className="absolute -top-1 -left-1">
              <div className="badge badge-error badge-xs gap-0.5 shadow-sm">
                <span className="icon-[tabler--flag-filled] size-2"></span>
              </div>
            </div>
          ) : bidStatus === "winning" ? (
            <div className="absolute -top-1 -left-1">
              <div className="badge badge-success badge-xs gap-0.5 shadow-sm">
                <span className="icon-[tabler--trophy] size-2"></span>
              </div>
            </div>
          ) : bidStatus === "outbid" ? (
            <div className="absolute -top-1 -left-1">
              <div className="badge badge-warning badge-xs gap-0.5 shadow-sm">
                <span className="icon-[tabler--alert-triangle] size-2"></span>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            {bidStatus && (
              <div
                className={`badge badge-xs font-bold ${
                  bidStatus === "winning" || bidStatus === "won"
                    ? "badge-success"
                    : "badge-warning"
                }`}
              >
                {bidStatus === "winning"
                  ? t("status.winning")
                  : bidStatus === "won"
                    ? t("status.won")
                    : bidStatus === "outbid"
                      ? t("status.outbid")
                      : t("status.lost")}
              </div>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-base-content/60 truncate">
              {item.description}
            </p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div
            className={`font-bold font-mono ${bidStatus === "winning" || bidStatus === "won" ? "text-success" : bidStatus === "outbid" ? "text-warning" : "text-primary"}`}
          >
            {item.currentBid !== null
              ? `${item.currentBid} ${item.currencyCode}`
              : `${item.startingBid} ${item.currencyCode}`}
          </div>
          <div className="text-xs text-base-content/50 flex items-center justify-end gap-1">
            <span className="icon-[tabler--gavel] size-3"></span>
            {t("item.card.bidsCount", { count: item._count.bids })}
          </div>
        </div>
        {item.endDate && (
          <div
            className={`text-xs shrink-0 w-24 text-right font-medium ${
              ended ? "text-error" : "text-base-content/60"
            }`}
          >
            {ended ? t("status.ended") : t("status.ends")} {formatShortDate(item.endDate)}
          </div>
        )}
      </Link>
      {canEditItem && (
        <Link
          href={`/auctions/${auctionId}/items/${item.id}/edit`}
          className="btn btn-ghost btn-sm btn-circle shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
          title={t("common.edit")}
        >
          <span className="icon-[tabler--edit] size-4"></span>
        </Link>
      )}
    </div>
  );
}
