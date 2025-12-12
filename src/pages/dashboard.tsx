import { useMemo } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { useRouter } from "next/router";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/layout/navbar";
import { StatsCard, CurrencyStatsCard } from "@/components/ui/stats-card";
import {
  SortDropdown,
  auctionSortOptions,
  sidebarItemSortOptions,
  sortAuctions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import Link from "next/link";

interface Auction {
  id: string;
  name: string;
  description: string | null;
  endDate: string | null;
  createdAt: string;
  role: string;
  thumbnailUrl: string | null;
  _count: {
    items: number;
    members: number;
  };
}

interface BidItem {
  id: string;
  name: string;
  thumbnailUrl: string | null;
  currentBid: number | null;
  startingBid: number;
  highestBidderId: string | null;
  endDate: string | null;
  createdAt: string;
  currencySymbol: string;
  auctionId: string;
  auctionName: string;
  userHighestBid: number;
}

interface CurrencyTotal {
  code: string;
  symbol: string;
  total: number;
}

interface BidStats {
  totalBids: number;
  currencyTotals: CurrencyTotal[];
  itemsBidOn: number;
  currentlyWinning: number;
}

interface DashboardProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auctions: Auction[];
  bidItems: BidItem[];
  bidStats: BidStats;
}

export default function DashboardPage({
  user,
  auctions,
  bidItems,
  bidStats,
}: DashboardProps) {
  const router = useRouter();

  // Sort states from URL params
  const auctionSort = (router.query.auctionSort as string) || "date-desc";
  const bidSort = (router.query.bidSort as string) || "date-desc";

  // Sorted data
  const sortedAuctions = useMemo(() => {
    return sortAuctions(auctions, auctionSort);
  }, [auctions, auctionSort]);

  const sortedBidItems = useMemo(() => {
    return sortItems(bidItems, bidSort);
  }, [bidItems, bidSort]);

  const isAuctionEnded = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  const isItemEnded = (endDate: string | null) => {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  };

  return (
    <div className="min-h-screen bg-base-200">
      <Navbar user={user} />

      <main className="container mx-auto px-4 py-8 pb-12">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
              Dashboard
            </h1>
            <p className="text-base-content/60 mt-1 text-sm sm:text-base">
              Welcome back, {user.name || user.email}!
            </p>
          </div>
          <Link
            href="/auctions/create"
            className="btn btn-primary w-full sm:w-auto"
          >
            <span className="icon-[tabler--plus] size-5"></span>
            Create Auction
          </Link>
        </div>

        {/* Stats Cards */}
        {bidStats.totalBids > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              icon="icon-[tabler--gavel]"
              iconColor="primary"
              value={bidStats.totalBids}
              label="Total Bids"
            />
            <CurrencyStatsCard
              icon="icon-[tabler--currency-dollar]"
              iconColor="secondary"
              currencyTotals={bidStats.currencyTotals}
              label="Total Bid Amount"
            />
            <StatsCard
              icon="icon-[tabler--package]"
              iconColor="accent"
              value={bidStats.itemsBidOn}
              label="Items Bid On"
            />
            <StatsCard
              icon="icon-[tabler--trophy]"
              iconColor="success"
              value={bidStats.currentlyWinning}
              label="Currently Winning"
            />
          </div>
        )}

        {/* Your Bids Section */}
        {bidItems.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-base-content">
                Your Active Bids
              </h2>
              <SortDropdown
                options={sidebarItemSortOptions}
                currentSort={bidSort}
                paramName="bidSort"
              />
            </div>
            <div className="card bg-base-100 shadow">
              <div className="card-body p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
                  {sortedBidItems.map((item) => {
                    const ended = isItemEnded(item.endDate);
                    const isWinning = item.highestBidderId === user.id;
                    return (
                      <Link
                        key={item.id}
                        href={`/auctions/${item.auctionId}/items/${item.id}`}
                        className={`flex gap-3 p-2 rounded-lg hover:bg-base-200 transition-colors ${
                          ended ? "opacity-60" : ""
                        }`}
                      >
                        <div className="relative shrink-0">
                          {item.thumbnailUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.thumbnailUrl}
                              alt={item.name}
                              className={`w-12 h-12 object-cover rounded ${
                                ended ? "grayscale" : ""
                              }`}
                            />
                          ) : (
                            <div
                              className={`w-12 h-12 bg-base-300 rounded flex items-center justify-center ${
                                ended ? "grayscale" : ""
                              }`}
                            >
                              <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
                            </div>
                          )}
                          {ended && (
                            <div className="absolute -top-1 -left-1">
                              <div className="badge badge-error badge-xs gap-0.5">
                                <span className="icon-[tabler--flag-filled] size-2"></span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-base-content/60 truncate">
                            {item.auctionName}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span
                              className={`badge badge-xs ${
                                isWinning ? "badge-success" : "badge-warning"
                              }`}
                            >
                              {ended
                                ? isWinning
                                  ? "Won"
                                  : "Lost"
                                : isWinning
                                  ? "Winning"
                                  : "Outbid"}
                            </span>
                            <span className="text-xs font-semibold">
                              {item.currencySymbol}
                              {(item.currentBid || 0).toFixed(0)}
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {auctions.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body items-center text-center py-16">
              <span className="icon-[tabler--gavel] size-16 text-base-content/20"></span>
              <h2 className="card-title mt-4">No auctions yet</h2>
              <p className="text-base-content/60 max-w-md">
                You haven&apos;t joined or created any auctions yet. Create your
                first auction or join one using an invite link.
              </p>
              <div className="card-actions mt-6">
                <Link href="/auctions/create" className="btn btn-primary">
                  <span className="icon-[tabler--plus] size-5"></span>
                  Create Your First Auction
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-base-content">
                Auctions you have joined
              </h2>
              <SortDropdown
                options={auctionSortOptions}
                currentSort={auctionSort}
                paramName="auctionSort"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedAuctions.map((auction) => {
                const ended = isAuctionEnded(auction.endDate);
                return (
                  <Link
                    key={auction.id}
                    href={
                      ended
                        ? `/auctions/${auction.id}/results`
                        : `/auctions/${auction.id}`
                    }
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
                          className={`w-full h-full object-cover ${
                            ended ? "grayscale" : ""
                          }`}
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
                        <div className="badge badge-ghost badge-sm">
                          {auction.role}
                        </div>
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
                          {ended ? "Ended" : "Ends"}{" "}
                          {new Date(auction.endDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
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

  const memberships = await prisma.auctionMember.findMany({
    where: { userId: session.user.id },
    include: {
      auction: {
        include: {
          _count: {
            select: {
              items: true,
              members: true,
            },
          },
        },
      },
    },
  });

  // Get IDs of auctions user is already a member of
  const memberAuctionIds = memberships.map((m) => m.auctionId);

  // Also fetch OPEN (FREE) auctions that the user hasn't joined yet
  const openAuctions = await prisma.auction.findMany({
    where: {
      joinMode: "FREE",
      id: { notIn: memberAuctionIds },
    },
    include: {
      _count: {
        select: {
          items: true,
          members: true,
        },
      },
    },
  });

  // Generate public URLs for thumbnails
  const { getPublicUrl } = await import("@/lib/storage");

  const memberAuctions = memberships.map((m) => ({
    id: m.auction.id,
    name: m.auction.name,
    description: m.auction.description,
    endDate: m.auction.endDate?.toISOString() || null,
    createdAt: m.auction.createdAt.toISOString(),
    role: m.role,
    thumbnailUrl: m.auction.thumbnailUrl
      ? getPublicUrl(m.auction.thumbnailUrl)
      : null,
    _count: m.auction._count,
  }));

  const openAuctionsList = openAuctions.map((auction) => ({
    id: auction.id,
    name: auction.name,
    description: auction.description,
    endDate: auction.endDate?.toISOString() || null,
    createdAt: auction.createdAt.toISOString(),
    role: "Open",
    thumbnailUrl: auction.thumbnailUrl
      ? getPublicUrl(auction.thumbnailUrl)
      : null,
    _count: auction._count,
  }));

  const auctions = [...memberAuctions, ...openAuctionsList];

  // Get all bids by this user
  const userBids = await prisma.bid.findMany({
    where: { userId: session.user.id },
    include: {
      auctionItem: {
        include: {
          currency: { select: { code: true, symbol: true } },
          auction: { select: { id: true, name: true } },
          images: {
            select: { url: true },
            orderBy: { order: "asc" },
            take: 1,
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Calculate bid stats
  const totalBids = userBids.length;

  // Calculate per-currency totals
  const currencyMap = new Map<
    string,
    { code: string; symbol: string; total: number }
  >();
  for (const bid of userBids) {
    const code = bid.auctionItem.currency.code;
    const symbol = bid.auctionItem.currency.symbol;
    const existing = currencyMap.get(code);
    if (existing) {
      existing.total += bid.amount;
    } else {
      currencyMap.set(code, { code, symbol, total: bid.amount });
    }
  }
  // Sort by total descending (highest first)
  const currencyTotals = Array.from(currencyMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  // Get unique items the user has bid on
  const itemsMap = new Map<
    string,
    (typeof userBids)[0]["auctionItem"] & { userHighestBid: number }
  >();
  for (const bid of userBids) {
    const existing = itemsMap.get(bid.auctionItemId);
    if (!existing || bid.amount > existing.userHighestBid) {
      itemsMap.set(bid.auctionItemId, {
        ...bid.auctionItem,
        userHighestBid: bid.amount,
      });
    }
  }

  const uniqueItems = Array.from(itemsMap.values());
  const itemsBidOn = uniqueItems.length;
  const currentlyWinning = uniqueItems.filter(
    (item) => item.highestBidderId === session.user.id,
  ).length;

  // Format bid items for display
  const bidItems = uniqueItems.map((item) => ({
    id: item.id,
    name: item.name,
    thumbnailUrl: item.images[0]?.url ? getPublicUrl(item.images[0].url) : null,
    currentBid: item.currentBid,
    startingBid: item.startingBid,
    highestBidderId: item.highestBidderId,
    endDate: item.endDate?.toISOString() || null,
    createdAt: item.createdAt.toISOString(),
    currencySymbol: item.currency.symbol,
    auctionId: item.auction.id,
    auctionName: item.auction.name,
    userHighestBid: item.userHighestBid,
  }));

  const bidStats = {
    totalBids,
    currencyTotals,
    itemsBidOn,
    currentlyWinning,
  };

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auctions,
      bidItems,
      bidStats,
    },
  };
};
