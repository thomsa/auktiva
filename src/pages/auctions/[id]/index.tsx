import { useMemo } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMessages, Locale } from "@/i18n";
import { MemberRole } from "@/generated/prisma/enums";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { AuctionSidebar } from "@/components/auction";
import { ItemCard, ItemListItem } from "@/components/item";
import {
  SortDropdown,
  itemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { useSortFilter } from "@/hooks/ui";
import { isUserAdmin, canUserCreateItems } from "@/utils/auction-helpers";
import { useTranslations } from "next-intl";

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
    highestBidderId: string | null;
    userHasBid: boolean;
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
  const t = useTranslations("auction");
  const tCommon = useTranslations("common");
  const tItem = useTranslations("item");
  const { currentSort } = useSortFilter("sort", "date-desc");
  const viewMode = (router.query.view as "grid" | "list") || "grid";

  const sortedItems = useMemo(
    () => sortItems(items, currentSort),
    [items, currentSort],
  );

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
      <div className="mb-8">
        <BackLink
          href="/dashboard"
          label={t("create.backToDashboard")}
          shortLabel={tCommon("back")}
        />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-content shadow-lg shadow-primary/20">
            <span className="icon-[tabler--gavel] size-7"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {auction.name}
          </h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content - Items */}
        <div className="flex-1">
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-6">
              {/* Items Header */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 pb-4 border-b border-base-content/5">
                <h2 className="card-title flex items-center gap-2">
                  <span className="icon-[tabler--package] size-5 text-primary"></span>
                  {t("sidebar.items")}
                  <span className="badge badge-secondary badge-sm shadow-sm">
                    {items.length}
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <SortDropdown
                    options={itemSortOptions}
                    currentSort={currentSort}
                  />
                  <div className="join shadow-sm">
                    <button
                      className={`btn btn-sm join-item ${viewMode === "grid" ? "btn-active btn-primary" : "btn-ghost bg-base-200/50"}`}
                      onClick={() => setViewMode("grid")}
                      title="Grid view"
                    >
                      <span className="icon-[tabler--layout-grid] size-4"></span>
                    </button>
                    <button
                      className={`btn btn-sm join-item ${viewMode === "list" ? "btn-active btn-primary" : "btn-ghost bg-base-200/50"}`}
                      onClick={() => setViewMode("list")}
                      title="List view"
                    >
                      <span className="icon-[tabler--list] size-4"></span>
                    </button>
                  </div>
                  {canCreate && (
                    <Link
                      href={`/auctions/${auction.id}/items/create`}
                      className="btn btn-primary btn-sm shadow-md shadow-primary/20"
                    >
                      <span className="icon-[tabler--plus] size-4"></span>
                      <span className="hidden sm:inline">{t("sidebar.addItem")}</span>
                      <span className="sm:hidden">{tCommon("create")}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Items Content */}
              {sortedItems.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    icon="icon-[tabler--package-off]"
                    title={tItem("empty.title")}
                    description={tItem("empty.description")}
                    action={
                      canCreate ? (
                        <Link
                          href={`/auctions/${auction.id}/items/create`}
                          className="btn btn-primary shadow-lg"
                        >
                          <span className="icon-[tabler--plus] size-5"></span>
                          {tItem("empty.createFirst")}
                        </Link>
                      ) : undefined
                    }
                  />
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
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
                <div className="space-y-3">
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
        <div className="lg:w-80">
          <AuctionSidebar auction={auction} membership={membership} />
        </div>
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

  // Fetch items user has bid on to determine status
  const userBids = await prisma.bid.findMany({
    where: {
      userId: session.user.id,
      auctionItem: { auctionId },
    },
    select: { auctionItemId: true },
    distinct: ["auctionItemId"],
  });

  const userBidItemIds = new Set(userBids.map((b) => b.auctionItemId));

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
        highestBidderId: item.highestBidderId, // Include highestBidderId
        userHasBid: userBidItemIds.has(item.id), // Add userHasBid status
        endDate: item.endDate?.toISOString() || null,
        createdAt: item.createdAt.toISOString(),
        creatorId: item.creatorId,
        thumbnailUrl: item.images[0]?.url
          ? getPublicUrl(item.images[0].url)
          : null,
        _count: item._count,
      })),
      messages: await getMessages(context.locale as Locale),
    },
  };
};
