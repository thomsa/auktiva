import { useMemo } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import {
  SortDropdown,
  itemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import Link from "next/link";
import { MemberRole } from "@/generated/prisma/enums";

interface AuctionDetailProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    description: string | null;
    joinMode: string;
    memberCanInvite: boolean;
    bidderVisibility: string;
    endDate: string | null;
    itemEndMode: string;
    inviteToken: string | null;
    createdAt: string;
    thumbnailUrl: string | null;
    creator: {
      id: string;
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
  items: Array<{
    id: string;
    name: string;
    description: string | null;
    currencyCode: string;
    startingBid: number;
    currentBid: number | null;
    endDate: string | null;
    createdAt: string;
    creatorId: string;
    thumbnailUrl: string | null;
    _count: {
      bids: number;
    };
  }>;
}

export default function AuctionDetailPage({
  user,
  auction,
  membership,
  items,
}: AuctionDetailProps) {
  const router = useRouter();
  const currentSort = (router.query.sort as string) || "date-desc";
  const viewMode = (router.query.view as "grid" | "list") || "grid";

  const sortedItems = useMemo(() => {
    return sortItems(items, currentSort);
  }, [items, currentSort]);

  const setViewMode = (mode: "grid" | "list") => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, view: mode } },
      undefined,
      { shallow: true },
    );
  };

  const isOwner = membership.role === "OWNER";
  const isAdmin = membership.role === "ADMIN" || isOwner;
  const canCreateItems = isAdmin || membership.role === "CREATOR";

  const formatShortDate = (dateStr: string | null) => {
    if (!dateStr) return "No end date";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8 pb-12">
        {/* Header */}
        <div className="mb-6">
          <Link href="/dashboard" className="btn btn-ghost btn-sm gap-2 mb-2">
            <span className="icon-[tabler--arrow-left] size-4"></span>
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left">
            {auction.name}
          </h1>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content - Items */}
          <div className="flex-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                {/* Items Header */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
                  <h2 className="card-title">
                    <span className="icon-[tabler--package] size-5"></span>
                    Items
                    <span className="badge badge-ghost">{items.length}</span>
                  </h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Sort Dropdown */}
                    <SortDropdown
                      options={itemSortOptions}
                      currentSort={currentSort}
                    />
                    {/* View Toggle */}
                    <div className="join">
                      <button
                        className={`btn btn-sm join-item ${
                          viewMode === "grid" ? "btn-active" : ""
                        }`}
                        onClick={() => setViewMode("grid")}
                        title="Grid view"
                      >
                        <span className="icon-[tabler--layout-grid] size-4"></span>
                      </button>
                      <button
                        className={`btn btn-sm join-item ${
                          viewMode === "list" ? "btn-active" : ""
                        }`}
                        onClick={() => setViewMode("list")}
                        title="List view"
                      >
                        <span className="icon-[tabler--list] size-4"></span>
                      </button>
                    </div>
                    {canCreateItems && (
                      <Link
                        href={`/auctions/${auction.id}/items/create`}
                        className="btn btn-primary btn-sm"
                      >
                        <span className="icon-[tabler--plus] size-4"></span>
                        <span className="hidden sm:inline">Add Item</span>
                        <span className="sm:hidden">Add</span>
                      </Link>
                    )}
                  </div>
                </div>

                {/* Items Content */}
                {sortedItems.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="icon-[tabler--package-off] size-16 text-base-content/20"></span>
                    <p className="mt-4 text-base-content/60">No items yet</p>
                    {canCreateItems && (
                      <Link
                        href={`/auctions/${auction.id}/items/create`}
                        className="btn btn-primary mt-4"
                      >
                        <span className="icon-[tabler--plus] size-5"></span>
                        Add First Item
                      </Link>
                    )}
                  </div>
                ) : viewMode === "grid" ? (
                  /* Grid View */
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedItems.map((item) => {
                      const canEditItem = item.creatorId === user.id || isAdmin;
                      const isItemEnded =
                        item.endDate && new Date(item.endDate) < new Date();
                      return (
                        <div
                          key={item.id}
                          className={`card bg-base-200 hover:bg-base-300 transition-colors relative ${
                            isItemEnded ? "opacity-75" : ""
                          }`}
                        >
                          <Link
                            href={`/auctions/${auction.id}/items/${item.id}`}
                            className="block"
                          >
                            {item.thumbnailUrl ? (
                              <figure className="h-36 relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.name}
                                  className={`w-full h-full object-cover ${
                                    isItemEnded ? "grayscale" : ""
                                  }`}
                                />
                                {isItemEnded && (
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
                                  isItemEnded ? "grayscale" : ""
                                }`}
                              >
                                <span className="icon-[tabler--photo] size-12 text-base-content/20"></span>
                                {isItemEnded && (
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
                              <h3 className="card-title text-base pr-8">
                                {item.name}
                              </h3>
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
                                    <span
                                      className={
                                        isItemEnded
                                          ? "text-error"
                                          : "text-base-content/60"
                                      }
                                    >
                                      {isItemEnded ? "Ended" : "Ends"}{" "}
                                      {formatShortDate(item.endDate)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </Link>
                          {canEditItem && (
                            <Link
                              href={`/auctions/${auction.id}/items/${item.id}/edit`}
                              className="btn btn-ghost btn-xs btn-circle absolute top-2 right-2 bg-base-100/80"
                              onClick={(e) => e.stopPropagation()}
                              title="Edit item"
                            >
                              <span className="icon-[tabler--edit] size-3"></span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* List View */
                  <div className="space-y-2">
                    {sortedItems.map((item) => {
                      const canEditItem = item.creatorId === user.id || isAdmin;
                      const isItemEnded =
                        item.endDate && new Date(item.endDate) < new Date();
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center gap-4 p-3 bg-base-200 hover:bg-base-300 rounded-lg transition-colors ${
                            isItemEnded ? "opacity-75" : ""
                          }`}
                        >
                          <Link
                            href={`/auctions/${auction.id}/items/${item.id}`}
                            className="flex-1 flex items-center gap-4 min-w-0"
                          >
                            <div className="relative shrink-0">
                              {item.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={item.thumbnailUrl}
                                  alt={item.name}
                                  className={`w-14 h-14 object-cover rounded ${
                                    isItemEnded ? "grayscale" : ""
                                  }`}
                                />
                              ) : (
                                <div
                                  className={`w-14 h-14 bg-base-300 rounded flex items-center justify-center ${
                                    isItemEnded ? "grayscale" : ""
                                  }`}
                                >
                                  <span className="icon-[tabler--photo] size-6 text-base-content/20"></span>
                                </div>
                              )}
                              {isItemEnded && (
                                <div className="absolute -top-1 -left-1">
                                  <div className="badge badge-error badge-xs gap-0.5">
                                    <span className="icon-[tabler--flag-filled] size-2"></span>
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium truncate">
                                {item.name}
                              </h3>
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
                                  isItemEnded
                                    ? "text-error"
                                    : "text-base-content/50"
                                }`}
                              >
                                {isItemEnded ? "Ended" : "Ends"}{" "}
                                {formatShortDate(item.endDate)}
                              </div>
                            )}
                          </Link>
                          {canEditItem && (
                            <Link
                              href={`/auctions/${auction.id}/items/${item.id}/edit`}
                              className="btn btn-ghost btn-xs btn-circle shrink-0"
                              onClick={(e) => e.stopPropagation()}
                              title="Edit item"
                            >
                              <span className="icon-[tabler--edit] size-4"></span>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
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
                  <span className="badge badge-primary badge-sm">
                    {membership.role}
                  </span>
                  {auction.endDate &&
                    new Date(auction.endDate) < new Date() && (
                      <span className="badge badge-error badge-sm">Ended</span>
                    )}
                </div>
                {auction.description && (
                  <p className="text-sm text-base-content/70 mb-3">
                    {auction.description}
                  </p>
                )}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-base-content/60">Items</span>
                    <span className="font-bold text-primary">
                      {auction._count.items}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-base-content/60">
                      Members
                    </span>
                    <span className="font-bold text-secondary">
                      {auction._count.members}
                    </span>
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
                  {(isAdmin || auction.memberCanInvite) && (
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
        </div>
      </main>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session?.user?.id) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const auctionId = context.params?.id as string;

  // First fetch the auction to check its joinMode
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

  if (!auction) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Get membership check
  let membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  // If not a member, check if this is an OPEN auction
  if (!membership) {
    if (auction.joinMode === "FREE") {
      // Auto-join the user to the open auction
      membership = await prisma.auctionMember.create({
        data: {
          auctionId,
          userId: session.user.id,
          role: MemberRole.CREATOR,
        },
      });
    } else {
      // Not a member and not an open auction - redirect
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }
  }

  const items = await prisma.auctionItem.findMany({
    where: { auctionId },
    include: {
      images: {
        orderBy: { order: "asc" },
        take: 1,
      },
      _count: {
        select: { bids: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Generate public URL for thumbnail
  const { getPublicUrl } = await import("@/lib/storage");

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: {
        ...auction,
        endDate: auction.endDate?.toISOString() || null,
        createdAt: auction.createdAt.toISOString(),
        updatedAt: auction.updatedAt.toISOString(),
        thumbnailUrl: auction.thumbnailUrl
          ? getPublicUrl(auction.thumbnailUrl)
          : null,
      },
      membership: {
        role: membership.role,
      },
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        currencyCode: item.currencyCode,
        startingBid: item.startingBid,
        currentBid: item.currentBid,
        endDate: item.endDate?.toISOString() || null,
        createdAt: item.createdAt.toISOString(),
        creatorId: item.creatorId,
        thumbnailUrl: item.images[0]?.url
          ? getPublicUrl(item.images[0].url)
          : null,
        _count: item._count,
      })),
    },
  };
};
