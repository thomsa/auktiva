import Link from "next/link";
import { formatShortDate } from "@/utils/formatters";
import { isAuctionEnded } from "@/utils/auction-helpers";

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
  const ended = isAuctionEnded(auction.endDate);
  const isOwner = membership.role === "OWNER";
  const isAdmin = membership.role === "ADMIN" || isOwner;
  const canCreateItems = isAdmin || membership.role === "CREATOR";
  const canInvite = isAdmin || auction.memberCanInvite;

  return (
    <div className="w-full lg:w-72 space-y-4">
      {/* Auction Info */}
      <div className="card bg-base-100 shadow-lg overflow-hidden">
        {auction.thumbnailUrl && (
          <figure className="h-28 bg-base-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={auction.thumbnailUrl}
              alt={auction.name}
              className="w-full h-full object-cover"
            />
          </figure>
        )}
        <div className="card-body p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="badge badge-primary badge-sm">{membership.role}</span>
            {ended && <span className="badge badge-error badge-sm">Ended</span>}
          </div>
          {auction.description && (
            <p className="text-sm text-base-content/70 mb-3">
              {auction.description}
            </p>
          )}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/60">Items</span>
              <span className="font-bold text-primary">{auction._count.items}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/60">Members</span>
              <span className="font-bold text-secondary">{auction._count.members}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-base-content/60">Ends</span>
              <span className="text-sm font-medium">
                {formatShortDate(auction.endDate)}
              </span>
            </div>
          </div>
          <div className="text-xs text-base-content/50 mt-2">
            by {auction.creator.name || auction.creator.email}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          <h3 className="font-semibold text-sm mb-2">Quick Actions</h3>
          <div className="space-y-1">
            {canCreateItems && (
              <Link
                href={`/auctions/${auction.id}/items/create`}
                className="btn btn-ghost btn-sm btn-block justify-start"
              >
                <span className="icon-[tabler--plus] size-4"></span>
                Add Item
              </Link>
            )}
            {canInvite && (
              <Link
                href={`/auctions/${auction.id}/invite`}
                className="btn btn-ghost btn-sm btn-block justify-start"
              >
                <span className="icon-[tabler--user-plus] size-4"></span>
                Invite People
              </Link>
            )}
            <Link
              href={`/auctions/${auction.id}/results`}
              className="btn btn-ghost btn-sm btn-block justify-start"
            >
              <span className="icon-[tabler--trophy] size-4"></span>
              View Results
            </Link>
          </div>
        </div>
      </div>

      {/* Admin/Owner Settings Card */}
      {isAdmin && (
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body p-4">
            <h3 className="font-semibold text-sm mb-2">Manage</h3>
            <div className="space-y-1">
              <Link
                href={`/auctions/${auction.id}/members`}
                className="btn btn-ghost btn-sm btn-block justify-start"
              >
                <span className="icon-[tabler--users] size-4"></span>
                Members
              </Link>
              {isOwner && (
                <Link
                  href={`/auctions/${auction.id}/settings`}
                  className="btn btn-ghost btn-sm btn-block justify-start"
                >
                  <span className="icon-[tabler--settings] size-4"></span>
                  Settings
                </Link>
              )}
            </div>
            <div className="divider my-2"></div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-base-content/60">Join Mode</span>
                <span>{auction.joinMode.replace("_", " ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-base-content/60">Visibility</span>
                <span>{auction.bidderVisibility.replace("_", " ")}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
