import Link from "next/link";
import { useTranslations } from "next-intl";
import { isItemEnded, getBidStatus } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";

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

export function ItemCard({ item, auctionId, userId, isAdmin }: ItemCardProps) {
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
      className={`card bg-base-100/50 backdrop-blur-sm border border-base-content/5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 relative group overflow-hidden ${
        ended ? "opacity-75" : ""
      }`}
    >
      <Link
        href={`/auctions/${auctionId}/items/${item.id}`}
        className="block h-full flex flex-col"
      >
        {item.thumbnailUrl ? (
          <figure className="h-48 relative overflow-hidden bg-base-200/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt={item.name}
              className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                ended ? "grayscale" : ""
              }`}
            />
            {bidStatus === "won" ? (
              <div className="absolute top-3 left-3">
                <div className="badge badge-success gap-1 shadow-sm font-bold">
                  <span className="icon-[tabler--crown] size-3"></span>
                  {t("status.won")}
                </div>
              </div>
            ) : ended ? (
              <div className="absolute top-3 left-3">
                <div className="badge badge-error gap-1 shadow-sm font-bold">
                  <span className="icon-[tabler--flag-filled] size-3"></span>
                  {t("status.ended")}
                </div>
              </div>
            ) : bidStatus === "winning" ? (
              <div className="absolute top-3 left-3">
                <div className="badge badge-success gap-1 shadow-sm font-bold animate-pulse">
                  <span className="icon-[tabler--trophy] size-3"></span>
                  {t("status.winning")}
                </div>
              </div>
            ) : (
              bidStatus === "outbid" && (
                <div className="absolute top-3 left-3">
                  <div className="badge badge-warning gap-1 shadow-sm font-bold">
                    <span className="icon-[tabler--alert-circle] size-3"></span>
                    {t("status.outbid")}
                  </div>
                </div>
              )
            )}
          </figure>
        ) : (
          <figure
            className={`h-48 bg-base-200/50 flex items-center justify-center relative ${
              ended ? "grayscale" : ""
            }`}
          >
            <span className="icon-[tabler--photo] size-12 text-base-content/10 group-hover:scale-110 transition-transform duration-300"></span>
            {bidStatus === "won" ? (
              <div className="absolute top-3 left-3">
                <div className="badge badge-success gap-1 shadow-sm font-bold">
                  <span className="icon-[tabler--crown] size-3"></span>
                  {t("status.won")}
                </div>
              </div>
            ) : ended ? (
              <div className="absolute top-3 left-3">
                <div className="badge badge-error gap-1 shadow-sm font-bold">
                  <span className="icon-[tabler--flag-filled] size-3"></span>
                  {t("status.ended")}
                </div>
              </div>
            ) : bidStatus === "winning" ? (
              <div className="absolute top-3 left-3">
                <div className="badge badge-success gap-1 shadow-sm font-bold animate-pulse">
                  <span className="icon-[tabler--trophy] size-3"></span>
                  {t("status.winning")}
                </div>
              </div>
            ) : (
              bidStatus === "outbid" && (
                <div className="absolute top-3 left-3">
                  <div className="badge badge-warning gap-1 shadow-sm font-bold">
                    <span className="icon-[tabler--alert-circle] size-3"></span>
                    {t("status.outbid")}
                  </div>
                </div>
              )
            )}
          </figure>
        )}
        <div className="card-body p-5 flex-1">
          <div className="flex justify-between items-start gap-2">
            <h3 className="card-title text-base pr-8 line-clamp-1 group-hover:text-primary transition-colors">
              {item.name}
            </h3>
            {bidStatus === "won" && (
              <div className="badge badge-success badge-sm gap-1 shadow-sm font-bold shrink-0">
                <span className="icon-[tabler--trophy] size-3"></span>
                {t("status.won")}
              </div>
            )}
            {bidStatus === "lost" && (
              <div className="badge badge-ghost badge-sm gap-1 shadow-sm font-bold shrink-0 opacity-70">
                <span className="icon-[tabler--x] size-3"></span>
                {t("status.lost")}
              </div>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-base-content/60 line-clamp-2 h-10 mb-2">
              {item.description}
            </p>
          )}
          {!item.description && <div className="h-10 mb-2"></div>}

          <div className="mt-auto pt-4 border-t border-base-content/5">
            <div className="flex items-end justify-between">
              <div>
                <div className="text-xs text-base-content/50 font-medium mb-0.5 uppercase tracking-wide">
                  {item.currentBid
                    ? t("item.bid.currentBid")
                    : t("item.bid.startingBid")}
                </div>
                <div
                  className={`text-xl font-bold font-mono tracking-tight ${
                    bidStatus === "winning" || bidStatus === "won"
                      ? "text-success"
                      : bidStatus === "outbid"
                        ? "text-warning"
                        : "text-primary"
                  }`}
                >
                  {item.currentBid !== null
                    ? `${item.currentBid} ${item.currencyCode}`
                    : `${item.startingBid} ${item.currencyCode}`}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <div className="flex items-center gap-1 text-xs text-base-content/60 mb-1">
                  <span className="icon-[tabler--gavel] size-3"></span>
                  {t("item.card.bidsCount", { count: item._count.bids })}
                </div>
                {item.endDate && !ended && (
                  <div className="flex items-center gap-1 text-xs font-medium text-secondary">
                    <span className="icon-[tabler--clock] size-3"></span>
                    {formatShortDate(item.endDate)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>
      {canEditItem && (
        <Link
          href={`/auctions/${auctionId}/items/${item.id}/edit`}
          className="btn btn-ghost btn-sm btn-circle absolute top-2 right-2 bg-base-100/80 hover:bg-base-100 shadow-sm opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100"
          onClick={(e) => e.stopPropagation()}
          title={t("common.edit")}
        >
          <span className="icon-[tabler--edit] size-4"></span>
        </Link>
      )}
    </div>
  );
}
