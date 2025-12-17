import Link from "next/link";
import { useTranslations } from "next-intl";
import { isAuctionEnded } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";

interface AuctionSidebarProps {
  auction: {
    id: string;
    name: string;
    description: string | null;
    endDate: string | null;
    thumbnailUrl: string | null;
    joinMode: string;
    bidderVisibility: string;
    memberCanInvite: boolean;
    creator: {
      name: string | null;
      email: string;
    };
    _count: {
      items: number;
      members: number;
    };
  };
  membership: {
    role: string;
  };
}

export function AuctionSidebar({ auction, membership }: AuctionSidebarProps) {
  const t = useTranslations("auction");
  const tRoles = useTranslations("auction.roles");
  const tJoinModes = useTranslations("auction.joinModes");
  const tVisibilities = useTranslations("auction.create"); // Reusing from create form translations
  const { formatShortDate } = useFormatters();
  const ended = isAuctionEnded(auction.endDate);
  const isOwner = membership.role === "OWNER";
  const isAdmin = membership.role === "ADMIN" || isOwner;
  const canCreateItems = isAdmin || membership.role === "CREATOR";
  const canInvite = isAdmin || auction.memberCanInvite;

  const roleKey = membership.role.toLowerCase();
  const roleLabel = ["admin", "creator", "bidder", "owner"].includes(roleKey)
    ? tRoles(roleKey === "owner" ? "admin" : roleKey)
    : membership.role;

  // Map enum values to translation keys
  const getJoinModeLabel = (mode: string) => {
    switch (mode) {
      case "INVITE_ONLY":
        return tJoinModes("inviteOnly");
      case "LINK":
        return tJoinModes("link");
      case "FREE":
        return tJoinModes("free");
      default:
        return mode.replace("_", " ");
    }
  };

  const getVisibilityLabel = (visibility: string) => {
    switch (visibility) {
      case "VISIBLE":
        return tVisibilities("alwaysVisible").split(" - ")[0];
      case "ANONYMOUS":
        return tVisibilities("alwaysAnonymous").split(" - ")[0];
      case "PER_BID":
        return tVisibilities("perBid").split(" - ")[0];
      default:
        return visibility.replace("_", " ");
    }
  };

  return (
    <div className="w-full lg:w-80 space-y-6">
      {/* Auction Info */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-lg overflow-hidden">
        {auction.thumbnailUrl ? (
          <figure className="h-40 bg-base-200 relative group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={auction.thumbnailUrl}
              alt={auction.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-100 to-transparent opacity-60"></div>
          </figure>
        ) : (
          <div className="h-24 bg-gradient-to-br from-primary/5 to-secondary/5 border-b border-base-content/5 flex items-center justify-center">
            <span className="icon-[tabler--gavel] size-8 text-primary/20"></span>
          </div>
        )}

        <div className="card-body p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="badge badge-primary badge-sm font-semibold shadow-sm shadow-primary/20">
              {roleLabel}
            </span>
            {ended && (
              <span className="badge badge-error badge-sm gap-1">
                <span className="icon-[tabler--flag-filled] size-3"></span>
                {t("card.ended")}
              </span>
            )}
          </div>

          {auction.description && (
            <p className="text-sm text-base-content/70 mb-6 leading-relaxed">
              {auction.description}
            </p>
          )}

          <div className="space-y-3 p-4 bg-base-200/50 rounded-xl mb-2">
            <div className="flex justify-between items-center text-sm">
              <span className="text-base-content/60 flex items-center gap-2">
                <span className="icon-[tabler--package] size-4"></span>
                {t("sidebar.items")}
              </span>
              <span className="font-bold text-base-content">
                {auction._count.items}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-base-content/60 flex items-center gap-2">
                <span className="icon-[tabler--users] size-4"></span>
                {t("sidebar.members")}
              </span>
              <span className="font-bold text-base-content">
                {auction._count.members}
              </span>
            </div>
            {auction.endDate && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-base-content/60 flex items-center gap-2">
                  <span className="icon-[tabler--clock] size-4"></span>
                  {t("card.ends")}
                </span>
                <span
                  className={`font-medium ${ended ? "text-error" : "text-primary"}`}
                >
                  {formatShortDate(auction.endDate)}
                </span>
              </div>
            )}
          </div>

          <div className="text-xs text-base-content/40 text-center flex items-center justify-center gap-1">
            <span className="icon-[tabler--user] size-3"></span>
            {t("sidebar.hostedBy")}{" "}
            <span className="font-medium text-base-content/60">
              {auction.creator.name || auction.creator.email}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-lg">
        <div className="card-body p-5">
          <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/40 mb-3 flex items-center gap-2">
            <span className="icon-[tabler--bolt] size-4"></span>
            {t("sidebar.quickActions")}
          </h3>
          <div className="space-y-2">
            {canCreateItems && (
              <Link
                href={`/auctions/${auction.id}/items/create`}
                className="btn btn-primary btn-sm btn-block justify-start shadow-sm shadow-primary/20"
              >
                <span className="icon-[tabler--plus] size-4"></span>
                {t("sidebar.addItem")}
              </Link>
            )}
            {canInvite && (
              <Link
                href={`/auctions/${auction.id}/invite`}
                className="btn btn-outline btn-sm btn-block justify-start border-base-content/10 hover:bg-base-200 hover:border-base-content/20 text-base-content"
              >
                <span className="icon-[tabler--user-plus] size-4"></span>
                {t("sidebar.invitePeople")}
              </Link>
            )}
            <Link
              href={`/auctions/${auction.id}/results`}
              className="btn btn-ghost btn-sm btn-block justify-start hover:bg-base-content/5"
            >
              <span className="icon-[tabler--trophy] size-4"></span>
              {t("sidebar.results")}
            </Link>
          </div>
        </div>
      </div>

      {/* Admin/Owner Settings Card */}
      {isAdmin && (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-lg">
          <div className="card-body p-5">
            <h3 className="font-bold text-sm uppercase tracking-wider text-base-content/40 mb-3 flex items-center gap-2">
              <span className="icon-[tabler--settings] size-4"></span>
              {t("sidebar.manage")}
            </h3>
            <div className="space-y-2">
              <Link
                href={`/auctions/${auction.id}/members`}
                className="btn btn-ghost btn-sm btn-block justify-start hover:bg-base-content/5"
              >
                <span className="icon-[tabler--users] size-4"></span>
                {t("sidebar.manageMembers")}
              </Link>
              {isOwner && (
                <Link
                  href={`/auctions/${auction.id}/settings`}
                  className="btn btn-ghost btn-sm btn-block justify-start hover:bg-base-content/5"
                >
                  <span className="icon-[tabler--adjustments-horizontal] size-4"></span>
                  {t("sidebar.settings")}
                </Link>
              )}
            </div>

            <div className="divider my-2 opacity-50"></div>

            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-base-content/50">
                  {t("sidebar.joinMode")}
                </span>
                <span className="badge badge-ghost badge-xs text-[10px] uppercase font-bold tracking-wide">
                  {getJoinModeLabel(auction.joinMode)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-base-content/50">
                  {t("sidebar.visibility")}
                </span>
                <span className="badge badge-ghost badge-xs text-[10px] uppercase font-bold tracking-wide">
                  {getVisibilityLabel(auction.bidderVisibility)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
