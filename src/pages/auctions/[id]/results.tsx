import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import * as auctionService from "@/lib/services/auction.service";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { StatsCard } from "@/components/ui/stats-card";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface Winner {
  itemId: string;
  itemName: string;
  thumbnailUrl: string | null;
  winningBid: number;
  currencyCode: string;
  currencySymbol: string;
  winner: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  isCurrentUser: boolean;
}

interface ResultsPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    description: string | null;
    endDate: string | null;
    isEnded: boolean;
  };
  winners: Winner[];
  userWins: Winner[];
  totalItems: number;
  totalBids: number;
  isAdmin: boolean;
}

export default function ResultsPage({
  user,
  auction,
  winners,
  userWins,
  totalItems,
  totalBids,
  isAdmin,
}: ResultsPageProps) {
  const t = useTranslations("auction.results");
  const tCommon = useTranslations("common");
  const tAuction = useTranslations("auction");
  const tStatus = useTranslations("status");
  const totalValue = winners.reduce((sum, w) => sum + w.winningBid, 0);

  const handleExport = (format: "json" | "csv") => {
    window.open(
      `/api/auctions/${auction.id}/export?format=${format}`,
      "_blank",
    );
  };

  return (
    <PageLayout user={user}>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <BackLink
          href="/dashboard"
          label={tAuction("create.backToDashboard")}
          shortLabel={tCommon("back")}
        />
        <Link
          href={`/auctions/${auction.id}`}
          className="btn btn-outline btn-sm gap-2"
        >
          <span className="icon-[tabler--list-details] size-4"></span>
          {t("viewAll")}
        </Link>
      </div>

      {/* Header */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
            <div>
              <p className="text-xs font-bold text-base-content/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="icon-[tabler--chart-bar] size-3"></span>
                {t("title")}
              </p>
              <h1 className="card-title text-2xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span className="icon-[tabler--trophy] size-8 text-warning"></span>
                {auction.name}
              </h1>
            </div>
            <div className="flex items-center gap-3 self-start">
              {auction.isEnded ? (
                <div className="badge badge-error badge-lg font-bold shadow-sm gap-1">
                  <span className="icon-[tabler--flag-filled] size-3"></span>
                  {tStatus("ended")}
                </div>
              ) : (
                <div className="badge badge-success badge-lg font-bold shadow-sm gap-1 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-white"></span>
                  {tStatus("active")}
                </div>
              )}
              {isAdmin && (
                <div className="dropdown dropdown-end">
                  <button
                    tabIndex={0}
                    className="btn btn-ghost btn-sm btn-square"
                  >
                    <span className="icon-[tabler--dots-vertical] size-5"></span>
                  </button>
                  <ul
                    tabIndex={0}
                    className="dropdown-content menu bg-base-100/90 backdrop-blur rounded-box z-10 w-48 p-2 shadow-lg border border-base-content/5"
                  >
                    <li className="menu-title text-xs font-semibold uppercase tracking-wider text-base-content/50 px-2 py-1">
                      {t("export")}
                    </li>
                    <li>
                      <button
                        onClick={() => handleExport("json")}
                        className="gap-3"
                      >
                        <span className="icon-[tabler--file-code] size-4"></span>
                        JSON
                      </button>
                    </li>
                    <li>
                      <button
                        onClick={() => handleExport("csv")}
                        className="gap-3"
                      >
                        <span className="icon-[tabler--table] size-4"></span>
                        CSV
                      </button>
                    </li>
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <StatsCard
              icon="icon-[tabler--trophy]"
              iconColor="warning"
              value={winners.length}
              label={t("winners")}
            />
            <StatsCard
              icon="icon-[tabler--package]"
              iconColor="primary"
              value={totalItems}
              label={t("totalItems")}
            />
            <StatsCard
              icon="icon-[tabler--gavel]"
              iconColor="secondary"
              value={totalBids}
              label={t("totalBids")}
            />
            <StatsCard
              icon="icon-[tabler--currency-dollar]"
              iconColor="success"
              value={`$${totalValue.toLocaleString()}`}
              label={t("totalValue")}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Wins */}
        <div className="lg:col-span-1">
          <div className="card bg-primary/5 border border-primary/10 shadow-xl h-full">
            <div className="card-body p-6">
              <h2 className="card-title text-lg mb-6 flex items-center gap-2 text-primary">
                <span className="icon-[tabler--gift] size-5"></span>
                {t("yourWinnings")}
              </h2>

              {userWins.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center h-full">
                  <div className="w-16 h-16 bg-base-100 rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <span className="icon-[tabler--mood-sad] size-8 text-base-content/30"></span>
                  </div>
                  <p className="text-base-content/60 font-medium">
                    {t("noWins")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {userWins.map((win) => (
                    <div
                      key={win.itemId}
                      className="bg-base-100 p-4 rounded-xl shadow-sm border border-base-content/5 flex gap-4"
                    >
                      <div className="relative w-16 h-16 shrink-0 bg-base-200 rounded-lg overflow-hidden">
                        {win.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={win.thumbnailUrl}
                            alt={win.itemName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="icon-[tabler--photo] size-6 text-base-content/20"></span>
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">
                          {win.itemName}
                        </div>
                        <div className="text-primary font-bold font-mono mt-1">
                          {win.currencySymbol}
                          {win.winningBid.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 pt-6 border-t border-primary/10">
                    <div className="flex justify-between items-center text-sm font-medium">
                      <span className="text-base-content/60">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {userWins[0]?.currencySymbol}
                        {userWins
                          .reduce((sum, w) => sum + w.winningBid, 0)
                          .toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* All Winners */}
        <div className="lg:col-span-2">
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-0">
              <div className="p-6 border-b border-base-content/5">
                <h2 className="card-title text-lg flex items-center gap-2">
                  <span className="icon-[tabler--list] size-5"></span>
                  {t("auctionWinners")}
                </h2>
              </div>

              {winners.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    icon="icon-[tabler--gavel-off]"
                    title={t("noItemsSold")}
                    description="No items received bids in this auction."
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-lg">
                    <thead>
                      <tr className="bg-base-200/30 text-base-content/60 text-sm">
                        <th className="pl-8">{t("item")}</th>
                        <th>{t("winner")}</th>
                        <th className="text-right pr-8">{t("winningBid")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-content/5">
                      {winners.map((win) => (
                        <tr
                          key={win.itemId}
                          className="hover:bg-base-content/2 transition-colors"
                        >
                          <td className="pl-8">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-lg bg-base-200 shrink-0 overflow-hidden">
                                {win.thumbnailUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={win.thumbnailUrl}
                                    alt={win.itemName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center">
                                    <span className="icon-[tabler--photo] size-5 text-base-content/20"></span>
                                  </div>
                                )}
                              </div>
                              <div className="font-medium">{win.itemName}</div>
                            </div>
                          </td>
                          <td>
                            {win.winner ? (
                              <div className="flex items-center gap-2">
                                <span className="icon-[tabler--user] size-4 text-base-content/40"></span>
                                <span className="font-medium text-base-content/80">
                                  {win.winner.name || win.winner.email}
                                  {win.isCurrentUser && (
                                    <span className="badge badge-success badge-xs ml-2 font-bold shadow-sm">
                                      {t("you")}
                                    </span>
                                  )}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-base-content/50 italic">
                                <span className="icon-[tabler--spy] size-4"></span>
                                {t("anonymous")}
                              </div>
                            )}
                          </td>
                          <td className="text-right pr-8">
                            <span className="font-bold font-mono text-lg">
                              {win.currencySymbol}
                              {win.winningBid.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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

  // Check membership
  const membership = await auctionService.getUserMembership(
    auctionId,
    session.user.id,
  );

  if (!membership) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Get auction results data
  const resultsData = await auctionService.getAuctionResultsData(
    auctionId,
    session.user.id,
  );

  if (!resultsData) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const isAdmin = auctionService.isAdmin(membership);

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: resultsData.auction,
      winners: resultsData.winners,
      userWins: resultsData.userWins,
      totalItems: resultsData.totalItems,
      totalBids: resultsData.totalBids,
      isAdmin,
      messages: await getMessages(context.locale as Locale),
    },
  };
};
