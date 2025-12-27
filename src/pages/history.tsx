import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import * as bidService from "@/lib/services/bid.service";
import { PageLayout, EmptyState } from "@/components/common";
import { StatsCard, CurrencyStatsCard } from "@/components/ui/stats-card";
import { formatDate } from "@/utils/formatters";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("nav");
  const tStats = useTranslations("dashboard.stats");
  const tHistory = useTranslations("item.history");
  const tStatus = useTranslations("status");
  const tItem = useTranslations("item");

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-linear-to-r from-base-content to-base-content/60 bg-clip-text text-transparent mb-2">
            {t("bidHistory")}
          </h1>
          <p className="text-base-content/60 text-lg">
            Track your bidding activity and results
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
        <StatsCard
          icon="icon-[tabler--gavel]"
          iconColor="primary"
          value={stats.totalBids}
          label={tStats("totalBids")}
        />
        <StatsCard
          icon="icon-[tabler--trophy]"
          iconColor="success"
          value={stats.winningBids}
          label={tStats("currentlyWinning")} // Or create a new key "winningBids"
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
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-0 sm:p-6">
          <div className="flex items-center gap-2 px-6 pt-6 sm:px-0 sm:pt-0 mb-6">
            <span className="w-1 h-6 rounded-full bg-secondary"></span>
            <h2 className="text-xl font-bold text-base-content">Recent Bids</h2>
          </div>

          {bids.length === 0 ? (
            <div className="pb-6 px-6 sm:pb-0 sm:px-0">
              <EmptyState
                icon="icon-[tabler--gavel]"
                title={tHistory("noBids")}
                action={
                  <Link
                    href="/dashboard"
                    className="btn btn-primary shadow-lg shadow-primary/20"
                  >
                    Browse Auctions
                  </Link>
                }
              />
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="space-y-3 md:hidden px-4 pb-4">
                {bids.map((bid) => {
                  const isEnded =
                    bid.item.endDate && new Date(bid.item.endDate) < new Date();
                  return (
                    <Link
                      key={bid.id}
                      href={`/auctions/${bid.auction.id}/items/${bid.item.id}`}
                      className="block p-4 bg-base-100 rounded-xl border border-base-content/5 shadow-sm hover:border-primary/20 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-base-content">
                          {bid.item.name}
                        </div>
                        {bid.isWinning ? (
                          <span className="badge badge-success badge-sm gap-1 shadow-sm">
                            <span className="icon-[tabler--trophy] size-3"></span>
                            {isEnded ? tStatus("won") : tStatus("winning")}
                          </span>
                        ) : (
                          <span className="badge badge-ghost badge-sm bg-base-content/5">
                            {isEnded ? tStatus("lost") : tStatus("outbid")}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-base-content/60 mb-3 flex items-center gap-1">
                        <span className="icon-[tabler--gavel] size-3"></span>
                        {bid.auction.name}
                      </div>
                      <div className="flex justify-between text-sm bg-base-200/50 p-3 rounded-lg">
                        <div className="flex flex-col">
                          <span className="text-xs text-base-content/50 uppercase font-semibold">
                            {tItem("bid.yourBid")}
                          </span>
                          <span className="font-mono font-bold text-primary">
                            {bid.item.currency.symbol}
                            {bid.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-xs text-base-content/50 uppercase font-semibold">
                            {tItem("bid.currentBid")}
                          </span>
                          <span className="font-mono font-medium">
                            {bid.item.currency.symbol}
                            {(bid.item.currentBid || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-base-content/40 mt-3 text-right">
                        {formatBidDate(bid.createdAt)}
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="table table-lg">
                  <thead>
                    <tr className="border-b-base-content/5">
                      <th className="bg-transparent text-base-content/60 font-semibold">
                        Item
                      </th>
                      <th className="bg-transparent text-base-content/60 font-semibold">
                        Auction
                      </th>
                      <th className="text-right bg-transparent text-base-content/60 font-semibold">
                        {tItem("bid.yourBid")}
                      </th>
                      <th className="text-right bg-transparent text-base-content/60 font-semibold">
                        {tItem("bid.currentBid")}
                      </th>
                      <th className="bg-transparent text-base-content/60 font-semibold text-center">
                        Status
                      </th>
                      <th className="text-right bg-transparent text-base-content/60 font-semibold">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {bids.map((bid) => {
                      const isEnded =
                        bid.item.endDate &&
                        new Date(bid.item.endDate) < new Date();

                      return (
                        <tr
                          key={bid.id}
                          className="hover:bg-base-content/2 transition-colors border-b-base-content/5"
                        >
                          <td>
                            <Link
                              href={`/auctions/${bid.auction.id}/items/${bid.item.id}`}
                              className="font-bold hover:text-primary transition-colors"
                            >
                              {bid.item.name}
                            </Link>
                          </td>
                          <td>
                            <Link
                              href={`/auctions/${bid.auction.id}`}
                              className="text-base-content/70 hover:text-primary transition-colors flex items-center gap-1.5"
                            >
                              <span className="icon-[tabler--gavel] size-5 opacity-50  shrink-0"></span>
                              {bid.auction.name}
                            </Link>
                          </td>
                          <td className="text-right font-mono font-bold text-primary">
                            {bid.item.currency.symbol}
                            {bid.amount.toFixed(2)}
                          </td>
                          <td className="text-right font-mono text-base-content/70">
                            {bid.item.currency.symbol}
                            {(bid.item.currentBid || 0).toFixed(2)}
                          </td>
                          <td className="text-center">
                            {bid.isWinning ? (
                              <span className="badge badge-success gap-1 shadow-sm font-medium">
                                <span className="icon-[tabler--trophy] size-3"></span>
                                {isEnded ? tStatus("won") : tStatus("winning")}
                              </span>
                            ) : (
                              <span className="badge badge-ghost bg-base-content/5 font-medium">
                                {isEnded ? tStatus("lost") : tStatus("outbid")}
                              </span>
                            )}
                          </td>
                          <td className="text-right text-sm text-base-content/50 tabular-nums">
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

  // Get bid history data
  const historyData = await bidService.getUserBidHistory(session.user.id);

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      bids: historyData.bids,
      stats: historyData.stats,
      messages: await getMessages(context.locale as Locale),
    },
  };
};
