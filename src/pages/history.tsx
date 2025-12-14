import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout, EmptyState } from "@/components/common";
import { StatsCard, CurrencyStatsCard } from "@/components/ui/stats-card";
import { formatDate } from "@/utils/formatters";

interface BidHistory {
  id: string;
  amount: number;
  createdAt: string;
  isWinning: boolean;
  item: {
    id: string;
    name: string;
    currentBid: number | null;
    endDate: string | null;
    currency: {
      symbol: string;
    };
  };
  auction: {
    id: string;
    name: string;
  };
}

interface CurrencyTotal {
  code: string;
  symbol: string;
  total: number;
}

interface HistoryPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  bids: BidHistory[];
  stats: {
    totalBids: number;
    winningBids: number;
    winningTotals: CurrencyTotal[];
  };
}

export default function HistoryPage({ user, bids, stats }: HistoryPageProps) {
  const formatBidDate = (dateStr: string) => {
    return formatDate(dateStr, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <PageLayout user={user}>
      <h1 className="text-3xl font-bold mb-8">Bid History</h1>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatsCard
            icon="icon-[tabler--gavel]"
            iconColor="primary"
            value={stats.totalBids}
            label="Total Bids"
          />
          <StatsCard
            icon="icon-[tabler--trophy]"
            iconColor="success"
            value={stats.winningBids}
            label="Winning Bids"
          />
          <CurrencyStatsCard
            icon="icon-[tabler--currency-dollar]"
            iconColor="secondary"
            currencyTotals={stats.winningTotals}
            label="Total Value (Winning)"
            decimals={2}
          />
        </div>

        {/* Bid List */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">
              <span className="icon-[tabler--history] size-6"></span>
              Recent Bids
            </h2>

            {bids.length === 0 ? (
              <EmptyState
                icon="icon-[tabler--gavel]"
                title="No bids yet"
                action={
                  <Link href="/dashboard" className="btn btn-primary">
                    Browse Auctions
                  </Link>
                }
              />
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="space-y-3 md:hidden">
                  {bids.map((bid) => {
                    const isEnded =
                      bid.item.endDate &&
                      new Date(bid.item.endDate) < new Date();
                    return (
                      <Link
                        key={bid.id}
                        href={`/auctions/${bid.auction.id}/items/${bid.item.id}`}
                        className="block p-3 bg-base-200 rounded-lg hover:bg-base-300 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium">{bid.item.name}</div>
                          {bid.isWinning ? (
                            <span className="badge badge-success badge-sm gap-1">
                              <span className="icon-[tabler--trophy] size-3"></span>
                              {isEnded ? "Won" : "Winning"}
                            </span>
                          ) : (
                            <span className="badge badge-ghost badge-sm">
                              {isEnded ? "Lost" : "Outbid"}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-base-content/60 mb-2">
                          {bid.auction.name}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>
                            Your bid:{" "}
                            <span className="font-mono font-medium">
                              {bid.item.currency.symbol}
                              {bid.amount.toFixed(2)}
                            </span>
                          </span>
                          <span>
                            Current:{" "}
                            <span className="font-mono">
                              {bid.item.currency.symbol}
                              {(bid.item.currentBid || 0).toFixed(2)}
                            </span>
                          </span>
                        </div>
                        <div className="text-xs text-base-content/50 mt-2">
                          {formatBidDate(bid.createdAt)}
                        </div>
                      </Link>
                    );
                  })}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Auction</th>
                        <th className="text-right">Your Bid</th>
                        <th className="text-right">Current</th>
                        <th>Status</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bids.map((bid) => {
                        const isEnded =
                          bid.item.endDate &&
                          new Date(bid.item.endDate) < new Date();

                        return (
                          <tr key={bid.id}>
                            <td>
                              <Link
                                href={`/auctions/${bid.auction.id}/items/${bid.item.id}`}
                                className="link link-hover font-medium"
                              >
                                {bid.item.name}
                              </Link>
                            </td>
                            <td>
                              <Link
                                href={`/auctions/${bid.auction.id}`}
                                className="link link-hover text-base-content/60"
                              >
                                {bid.auction.name}
                              </Link>
                            </td>
                            <td className="text-right font-mono">
                              {bid.item.currency.symbol}
                              {bid.amount.toFixed(2)}
                            </td>
                            <td className="text-right font-mono">
                              {bid.item.currency.symbol}
                              {(bid.item.currentBid || 0).toFixed(2)}
                            </td>
                            <td>
                              {bid.isWinning ? (
                                <span className="badge badge-success gap-1">
                                  <span className="icon-[tabler--trophy] size-3"></span>
                                  {isEnded ? "Won" : "Winning"}
                                </span>
                              ) : (
                                <span className="badge badge-ghost">
                                  {isEnded ? "Lost" : "Outbid"}
                                </span>
                              )}
                            </td>
                            <td className="text-sm text-base-content/60">
                              {formatBidDate(bid.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
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

  // Get all bids by user
  const bids = await prisma.bid.findMany({
    where: { userId: session.user.id },
    include: {
      auctionItem: {
        include: {
          currency: true,
          auction: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Calculate stats
  const winningBids = bids.filter(
    (b) => b.auctionItem.highestBidderId === session.user.id,
  );

  // Calculate per-currency totals for winning bids
  const currencyMap = new Map<
    string,
    { code: string; symbol: string; total: number }
  >();
  for (const bid of winningBids) {
    const code = bid.auctionItem.currency.code;
    const symbol = bid.auctionItem.currency.symbol;
    const existing = currencyMap.get(code);
    if (existing) {
      existing.total += bid.amount;
    } else {
      currencyMap.set(code, { code, symbol, total: bid.amount });
    }
  }
  const winningTotals = Array.from(currencyMap.values()).sort(
    (a, b) => b.total - a.total,
  );

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      bids: bids.map((b) => ({
        id: b.id,
        amount: b.amount,
        createdAt: b.createdAt.toISOString(),
        isWinning: b.auctionItem.highestBidderId === session.user.id,
        item: {
          id: b.auctionItem.id,
          name: b.auctionItem.name,
          currentBid: b.auctionItem.currentBid,
          endDate: b.auctionItem.endDate?.toISOString() || null,
          currency: {
            symbol: b.auctionItem.currency.symbol,
          },
        },
        auction: b.auctionItem.auction,
      })),
      stats: {
        totalBids: bids.length,
        winningBids: winningBids.length,
        winningTotals,
      },
    },
  };
};
