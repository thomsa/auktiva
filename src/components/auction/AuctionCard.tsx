import Link from "next/link";
import { isAuctionEnded } from "@/utils/auction-helpers";
import { formatShortDate } from "@/utils/formatters";

interface AuctionCardProps {
  auction: {
    id: string;
    name: string;
    description: string | null;
    endDate: string | null;
    role: string;
    thumbnailUrl: string | null;
    _count: {
      items: number;
      members: number;
    };
  };
}

export function AuctionCard({ auction }: AuctionCardProps) {
  const ended = isAuctionEnded(auction.endDate);
  const href = ended
    ? `/auctions/${auction.id}/results`
    : `/auctions/${auction.id}`;

  return (
    <Link
      href={href}
      className={`card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow ${
        ended ? "opacity-80" : ""
      }`}
    >
      <figure className="h-32 bg-base-200 relative">
        {auction.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={auction.thumbnailUrl}
            alt={auction.name}
            className={`w-full h-full object-cover ${ended ? "grayscale" : ""}`}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${
              ended ? "grayscale" : ""
            }`}
          >
            <span className="icon-[tabler--gavel] size-12 text-base-content/20"></span>
          </div>
        )}
        {ended && (
          <div className="absolute top-2 right-2">
            <div className="badge badge-error gap-1">
              <span className="icon-[tabler--flag-filled] size-3"></span>
              Ended
            </div>
          </div>
        )}
      </figure>
      <div className="card-body">
        <div className="flex justify-between items-start">
          <h2 className="card-title">{auction.name}</h2>
          <div className="badge badge-ghost badge-sm">{auction.role}</div>
        </div>
        {auction.description && (
          <p className="text-base-content/60 line-clamp-2">
            {auction.description}
          </p>
        )}
        <div className="flex gap-4 mt-4 text-sm text-base-content/60">
          <div className="flex items-center gap-1">
            <span className="icon-[tabler--package] size-4"></span>
            {auction._count.items} items
          </div>
          <div className="flex items-center gap-1">
            <span className="icon-[tabler--users] size-4"></span>
            {auction._count.members} members
          </div>
        </div>
        {auction.endDate && (
          <div
            className={`flex items-center gap-1 text-sm mt-2 ${
              ended ? "text-error" : "text-base-content/60"
            }`}
          >
            <span className="icon-[tabler--calendar] size-4"></span>
            {ended ? "Ended" : "Ends"} {formatShortDate(auction.endDate)}
          </div>
        )}
      </div>
    </Link>
  );
}
