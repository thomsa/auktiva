import { useMemo } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@/generated/prisma/enums";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { AuctionSidebar } from "@/components/auction";
import { ItemCard, ItemListItem } from "@/components/item";
import { SortDropdown, itemSortOptions, sortItems } from "@/components/ui/sort-dropdown";
import { useSortFilter } from "@/hooks/ui";
import { isUserAdmin, canUserCreateItems } from "@/utils/auction-helpers";

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
  const { currentSort } = useSortFilter("sort", "date-desc");
  const viewMode = (router.query.view as "grid" | "list") || "grid";

  const sortedItems = useMemo(() => sortItems(items, currentSort), [items, currentSort]);

  const setViewMode = (mode: "grid" | "list") => {
    router.push(
      { pathname: router.pathname, query: { ...router.query, view: mode } },
      undefined,
      { shallow: true },
    );
  };

  const isAdmin = isUserAdmin(membership.role);
  const canCreate = canUserCreateItems(membership.role);

  return (
    <PageLayout user={user}>
      {/* Header */}
      <div className="mb-6">
        <BackLink href="/dashboard" label="Back to Dashboard" shortLabel="Back" />
        <h1 className="text-xl sm:text-2xl font-bold text-center sm:text-left mt-2">
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
                    <SortDropdown options={itemSortOptions} currentSort={currentSort} />
                    <div className="join">
                      <button
                        className={`btn btn-sm join-item ${viewMode === "grid" ? "btn-active" : ""}`}
                        onClick={() => setViewMode("grid")}
                        title="Grid view"
                      >
                        <span className="icon-[tabler--layout-grid] size-4"></span>
                      </button>
                      <button
                        className={`btn btn-sm join-item ${viewMode === "list" ? "btn-active" : ""}`}
                        onClick={() => setViewMode("list")}
                        title="List view"
                      >
                        <span className="icon-[tabler--list] size-4"></span>
                      </button>
                    </div>
                    {canCreate && (
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
                  <EmptyState
                    icon="icon-[tabler--package-off]"
                    title="No items yet"
                    action={
                      canCreate ? (
                        <Link
                          href={`/auctions/${auction.id}/items/create`}
                          className="btn btn-primary"
                        >
                          <span className="icon-[tabler--plus] size-5"></span>
                          Add First Item
                        </Link>
                      ) : undefined
                    }
                  />
                ) : viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedItems.map((item) => (
                      <ItemCard
                        key={item.id}
                        item={item}
                        auctionId={auction.id}
                        userId={user.id}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedItems.map((item) => (
                      <ItemListItem
                        key={item.id}
                        item={item}
                        auctionId={auction.id}
                        userId={user.id}
                        isAdmin={isAdmin}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <AuctionSidebar auction={auction} membership={membership} />
        </div>
      </PageLayout>
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

  // If not a member, check if this is an OPEN or LINK auction
  if (!membership) {
    if (auction.joinMode === "FREE" || auction.joinMode === "LINK") {
      // Auto-join the user to the open/link auction
      membership = await prisma.auctionMember.create({
        data: {
          auctionId,
          userId: session.user.id,
          role: MemberRole.BIDDER,
        },
      });
    } else {
      // Not a member and not an open/link auction - redirect
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
