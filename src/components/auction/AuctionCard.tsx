import Link from "next/link";
import { useTranslations } from "next-intl";
import { isAuctionEnded } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";
import { stripHtmlTags } from "@/components/ui/rich-text-editor";

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
  const t = useTranslations("auction.card");
  const tRoles = useTranslations("auction.roles");
  const { formatShortDate } = useFormatters();
  const ended = isAuctionEnded(auction.endDate);
  const href = ended
    ? `/auctions/${auction.id}/results`
    : `/auctions/${auction.id}`;

  const roleKey = auction.role.toLowerCase();
  // Fallback to the role string if translation is missing (e.g. OWNER might assume admin rights/translation)
  const roleLabel = ["admin", "creator", "bidder", "owner"].includes(roleKey)
    ? tRoles(roleKey === "owner" ? "admin" : roleKey)
    : auction.role;

  return (
    <Link
      href={href}
      className={`card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group ${
        ended ? "opacity-70" : ""
      }`}
    >
      <figure className="h-48 bg-base-200/50 relative overflow-hidden">
        {auction.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={auction.thumbnailUrl}
            alt={auction.name}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
              ended ? "grayscale" : ""
            }`}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center bg-base-200/50 ${
              ended ? "grayscale" : ""
            }`}
          >
            <span className="icon-[tabler--gavel] size-12 text-base-content/10 group-hover:scale-110 transition-transform duration-300"></span>
          </div>
        )}
        <div className="absolute top-3 left-3">
          <div className="badge badge-sm font-semibold bg-base-100/90 backdrop-blur border-none shadow-sm">
            {roleLabel}
          </div>
        </div>
        {ended && (
          <div className="absolute top-3 right-3">
            <div className="badge badge-error gap-1 shadow-sm font-medium">
              <span className="icon-[tabler--flag-filled] size-3"></span>
              {t("ended")}
            </div>
          </div>
        )}
      </figure>
      <div className="card-body p-5">
        <h2 className="card-title text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
          {auction.name}
        </h2>

        {auction.description && (
          <p className="text-sm text-base-content/60 line-clamp-2 mb-4 h-10">
            {stripHtmlTags(auction.description)}
          </p>
        )}
        {!auction.description && <div className="h-10 mb-4"></div>}

        <div className="flex items-center justify-between mt-auto pt-4 border-t border-base-content/5">
          <div className="flex gap-3 text-xs font-medium text-base-content/70">
            <div className="flex items-center gap-1.5">
              <span className="icon-[tabler--package] size-4 opacity-70"></span>
              {auction._count.items}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="icon-[tabler--users] size-4 opacity-70"></span>
              {auction._count.members}
            </div>
          </div>

          {auction.endDate && (
            <div
              className={`flex items-center gap-1.5 text-xs font-medium ${
                ended ? "text-error" : "text-primary"
              }`}
            >
              <span className="icon-[tabler--clock] size-3.5"></span>
              {ended ? t("ended") : t("ends")}{" "}
              {formatShortDate(auction.endDate)}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
