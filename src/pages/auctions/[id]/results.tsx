import Link from "next/link";
import * as auctionService from "@/lib/services/auction.service";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { StatsCard } from "@/components/ui/stats-card";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";
import { formatAuctionBidDisplay } from "@/lib/currency-display";
import {
  groupTotalsByCurrency,
  type AuctionResultRow,
  type AuctionUnsoldItem,
  type CurrencyTotal,
} from "@/lib/results-summary";

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
  results: AuctionResultRow[];
  unsold: AuctionUnsoldItem[];
  userWins: AuctionResultRow[];
  totalItems: number;
  totalBids: number;
  isAdmin: boolean;
}

function toTotals(rows: AuctionResultRow[]): CurrencyTotal[] {
  return groupTotalsByCurrency(
    rows.map((row) => ({
      amount: row.winningBid,
      currencyCode: row.currencyCode,
      currencySymbol: row.currencySymbol,
      currencyProfile: row.currencyProfile,
    })),
  );
}

function formatRowAmount(row: AuctionResultRow): string {
  return formatAuctionBidDisplay({
    amount: row.winningBid,
    enteredRepresentation: row.enteredRepresentation,
    profile: row.currencyProfile,
    fallbackSymbol: row.currencySymbol,
  });
}

function Thumbnail({
  url,
  alt,
  className,
  iconClassName,
}: {
  url: string | null;
  alt: string;
  className: string;
  iconClassName: string;
}) {
  return (
    <div className={`${className} shrink-0 bg-base-200 overflow-hidden`}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <span
            className={`icon-[tabler--photo] ${iconClassName} text-base-content/20`}
          ></span>
        </div>
      )}
    </div>
  );
}

/**
 * An e-mail address with a break opportunity before its "@", so long
 * addresses break there first and
 * only break inside a part when that part alone is too wide.
 */
function EmailText({ email }: { email: string }) {
  const at = email.lastIndexOf("@");
  if (at <= 0) return <>{email}</>;
  return (
    <>
      {email.slice(0, at)}
      <wbr />
      {email.slice(at)}
    </>
  );
}

/**
 * The value stat card. It mirrors `StatsCard`, but money is never truncated:
 * several currencies stack, and the code wraps under its amount when the
 * card is narrow.
 */
function ValueStatsCard({
  totals,
  label,
}: {
  totals: CurrencyTotal[];
  label: string;
}) {
  return (
    <div className="card bg-base-100 shadow min-w-0">
      <div className="card-body p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="bg-primary/10 p-2 rounded-lg shrink-0">
            <span className="icon-[tabler--coins] size-6 text-primary"></span>
          </div>
          <div className="min-w-0 flex-1">
            {totals.length <= 1 ? (
              <div className="text-2xl font-bold font-mono break-words">
                {totals[0]?.formatted ?? "0"}
              </div>
            ) : (
              <ul className="font-bold font-mono text-base leading-snug space-y-1 pt-0.5">
                {totals.map((total) => (
                  <li
                    key={total.key}
                    className="flex flex-wrap items-baseline gap-x-1.5"
                  >
                    <span className="break-words min-w-0">
                      {total.formatted}
                    </span>
                    <span className="text-xs font-sans font-medium text-base-content/50">
                      {total.code}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-xs text-base-content/60 truncate">{label}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BidderCell({
  row,
  compact,
}: {
  row: AuctionResultRow;
  compact: boolean;
}) {
  const t = useTranslations("auction.results");
  const isLeading = row.status === "leading";
  const name = row.winner
    ? row.winner.name || row.winner.email || t("unnamedBidder")
    : null;

  const chipSize = compact
    ? "gap-1 px-1.5 py-0.5 rounded"
    : "gap-2 px-3 py-1.5 rounded-lg";
  const iconSize = compact ? "size-3" : "size-4";

  const chipTone = !row.winner
    ? "bg-base-200 text-base-content/60"
    : isLeading
      ? "bg-base-200 text-base-content/80"
      : "bg-primary/10 text-primary";

  const icon = !row.winner
    ? "icon-[tabler--spy]"
    : isLeading
      ? "icon-[tabler--user]"
      : "icon-[tabler--trophy]";

  return (
    <div
      className={`flex flex-col ${compact ? "gap-0.5 min-w-0" : "gap-1 min-w-52"}`}
    >
      <span
        className={`inline-flex items-center max-w-full ${compact ? "flex-wrap" : ""} ${chipSize} ${chipTone}`}
      >
        <span className={`${icon} ${iconSize} shrink-0`}></span>
        {name ? (
          <span
            className={`${compact ? "font-medium" : "font-semibold"} min-w-0 break-words`}
          >
            {name}
          </span>
        ) : (
          <span className="italic">{t("anonymous")}</span>
        )}
        {row.isCurrentUser && (
          <span
            className={`badge badge-xs font-bold ${
              isLeading ? "badge-outline" : "badge-success shadow-sm"
            }`}
          >
            {t("you")}
          </span>
        )}
      </span>
      {isLeading && (
        <span
          className={`flex items-center gap-1 text-xs font-medium text-base-content/60 ${
            compact ? "" : "pl-1"
          }`}
        >
          <span className="icon-[tabler--hourglass-high] size-3 shrink-0"></span>
          {t("leading")}
        </span>
      )}
      {row.winner?.email && (
        <a
          href={`mailto:${row.winner.email}`}
          className={`text-primary flex items-center gap-1 hover:opacity-80 transition-opacity min-w-0 ${
            compact ? "text-xs" : "text-xs pl-1"
          }`}
        >
          <span className="icon-[tabler--mail] size-3 shrink-0"></span>
          <span className="underline underline-offset-2 min-w-0 break-words">
            <EmailText email={row.winner.email} />
          </span>
        </a>
      )}
    </div>
  );
}

export default function ResultsPage({
  user,
  auction,
  results,
  unsold,
  userWins,
  totalItems,
  totalBids,
  isAdmin,
}: ResultsPageProps) {
  const t = useTranslations("auction.results");
  const tCommon = useTranslations("common");
  const tAuction = useTranslations("auction");
  const tStatus = useTranslations("status");

  const wonRows = results.filter((row) => row.status === "won");
  const leadingCount = results.length - wonRows.length;
  const isStillRunning = !auction.isEnded || leadingCount > 0;
  const valueTotals = toTotals(wonRows);
  const userWinTotals = toTotals(userWins);
  const exportHref = (format: "csv" | "json") =>
    `/api/auctions/${auction.id}/export?format=${format}`;

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
          className="btn btn-outline btn-sm gap-2 self-start sm:self-auto"
        >
          <span className="icon-[tabler--list-details] size-4"></span>
          {t("viewAll")}
        </Link>
      </div>

      {/* Header */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-8">
        <div className="card-body p-5 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4 lg:gap-6">
            <div className="min-w-0">
              <p className="text-xs font-bold text-base-content/50 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <span className="icon-[tabler--chart-bar] size-3"></span>
                {t("title")}
              </p>
              <h1 className="card-title text-xl sm:text-4xl font-extrabold tracking-tight flex items-center gap-3">
                <span className="icon-[tabler--trophy] size-6 sm:size-8 text-warning shrink-0"></span>
                <span className="min-w-0 text-wrap text-balance break-words">
                  {auction.name}
                </span>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-3 lg:justify-end lg:shrink-0">
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
                <div
                  role="group"
                  aria-label={t("export")}
                  className="flex flex-wrap gap-2"
                >
                  <a
                    href={exportHref("csv")}
                    download
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <span className="icon-[tabler--table-export] size-4"></span>
                    {t("exportCsv")}
                  </a>
                  <a
                    href={exportHref("json")}
                    download
                    className="btn btn-outline btn-sm gap-2"
                  >
                    <span className="icon-[tabler--file-code] size-4"></span>
                    {t("exportJson")}
                  </a>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mt-6 lg:mt-8">
            <StatsCard
              icon="icon-[tabler--trophy]"
              iconColor="warning"
              value={wonRows.length}
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
            <ValueStatsCard
              totals={valueTotals}
              label={isStillRunning ? t("totalValueSoFar") : t("totalValue")}
            />
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-8">
        {/* User Wins */}
        <div className="lg:col-span-1 min-w-0">
          <div className="card bg-primary/5 border border-primary/10 shadow-xl h-full overflow-hidden">
            <div className="card-body p-4 sm:p-6">
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
                      <Thumbnail
                        url={win.thumbnailUrl}
                        alt={win.itemName}
                        className="w-16 h-16 rounded-lg"
                        iconClassName="size-6"
                      />
                      <div className="min-w-0 flex-1">
                        <div
                          className="font-semibold line-clamp-2 break-words"
                          title={win.itemName}
                        >
                          {win.itemName}
                        </div>
                        <div className="text-primary font-bold font-mono mt-1 break-words">
                          {formatRowAmount(win)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-6 pt-6 border-t border-primary/10">
                    <div className="flex justify-between items-start gap-4 text-sm font-medium">
                      <span className="text-base-content/60 pt-1">
                        {isStillRunning ? t("totalSoFar") : t("total")}
                      </span>
                      <ul className="text-right space-y-1 min-w-0">
                        {userWinTotals.map((total) => (
                          <li
                            key={total.key}
                            className="text-xl font-bold font-mono text-primary break-words"
                          >
                            {total.formatted}
                            {userWinTotals.length > 1 && (
                              <span className="ml-1.5 text-xs font-sans font-medium text-base-content/50">
                                {total.code}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 min-w-0 space-y-4 sm:space-y-8">
          {/* All results */}
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl overflow-hidden">
            <div className="card-body p-0 min-w-0">
              <div className="p-4 sm:p-6 border-b border-base-content/5">
                <h2 className="card-title text-lg flex items-center gap-2">
                  <span className="icon-[tabler--list] size-5"></span>
                  {t("auctionWinners")}
                </h2>
                {leadingCount > 0 && (
                  <p className="text-sm text-base-content/60 mt-1 flex items-center gap-1.5">
                    <span className="icon-[tabler--hourglass-high] size-4 shrink-0"></span>
                    {t("openCount", { count: leadingCount })}
                  </p>
                )}
              </div>

              {results.length === 0 ? (
                <div className="p-6 sm:p-12">
                  <EmptyState
                    icon="icon-[tabler--hammer-off]"
                    title={auction.isEnded ? t("noItemsSold") : t("noBidsYet")}
                    description={
                      auction.isEnded
                        ? t("noBidsDescription")
                        : t("noBidsYetDescription")
                    }
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table table-sm sm:table-lg">
                    <thead>
                      <tr className="bg-base-200/30 text-base-content/60 text-xs sm:text-sm">
                        <th className="pl-4 sm:pl-8">{t("item")}</th>
                        <th className="hidden sm:table-cell">
                          {leadingCount > 0 ? t("highestBidder") : t("winner")}
                        </th>
                        <th className="text-right pr-4 sm:pr-8">
                          {leadingCount > 0 ? t("highestBid") : t("winningBid")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-content/5">
                      {results.map((row) => (
                        <tr
                          key={row.itemId}
                          className={`hover:bg-base-content/2 transition-colors ${
                            row.isItemCreator ? "bg-secondary/5" : ""
                          }`}
                        >
                          <td className="pl-4 sm:pl-8">
                            <div className="flex items-center gap-2 sm:gap-4">
                              <Thumbnail
                                url={row.thumbnailUrl}
                                alt={row.itemName}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg"
                                iconClassName="size-5"
                              />
                              <div className="min-w-0">
                                <div className="font-medium flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                  <Link
                                    href={`/auctions/${auction.id}/items/${row.itemId}`}
                                    className="link link-hover line-clamp-2 wrap-anywhere"
                                    title={row.itemName}
                                  >
                                    {row.itemName}
                                  </Link>
                                  {row.isItemCreator && (
                                    <span className="badge badge-secondary badge-xs font-bold">
                                      {t("yourListing")}
                                    </span>
                                  )}
                                </div>
                                {/* Mobile: show bidder below item name */}
                                <div className="sm:hidden text-xs mt-1">
                                  <BidderCell row={row} compact />
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden sm:table-cell">
                            <BidderCell row={row} compact={false} />
                          </td>
                          <td className="text-right pr-4 sm:pr-8 align-middle">
                            <span
                              className={`font-bold font-mono text-sm sm:text-lg whitespace-nowrap ${
                                row.status === "leading"
                                  ? "text-base-content/80"
                                  : ""
                              }`}
                            >
                              {formatRowAmount(row)}
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

          {/* Unsold items */}
          {unsold.length > 0 && (
            <section
              aria-labelledby="unsold-heading"
              className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl overflow-hidden"
            >
              <div className="card-body p-0 min-w-0">
                <div className="p-4 sm:p-6 border-b border-base-content/5">
                  <h2
                    id="unsold-heading"
                    className="card-title text-lg flex items-center gap-2"
                  >
                    <span className="icon-[tabler--package-off] size-5"></span>
                    {t("unsoldTitle")}
                  </h2>
                  <p className="text-sm text-base-content/60 mt-1">
                    {t("unsoldCount", { count: unsold.length })}
                  </p>
                </div>
                <ul className="divide-y divide-base-content/5">
                  {unsold.map((item) => (
                    <li
                      key={item.itemId}
                      className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-8 py-3 ${
                        item.isItemCreator ? "bg-secondary/5" : ""
                      }`}
                    >
                      <Thumbnail
                        url={item.thumbnailUrl}
                        alt={item.itemName}
                        className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg grayscale opacity-75"
                        iconClassName="size-5"
                      />
                      <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                        <Link
                          href={`/auctions/${auction.id}/items/${item.itemId}`}
                          className="link link-hover font-medium line-clamp-2 min-w-0 break-words"
                          title={item.itemName}
                        >
                          {item.itemName}
                        </Link>
                        {item.isItemCreator && (
                          <span className="badge badge-secondary badge-xs font-bold">
                            {t("yourListing")}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const auctionId = context.params?.id as string;

  // Check membership
  const membership = await auctionService.getUserMembership(
    auctionId,
    context.session.user.id,
  );

  if (!membership) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const isAdmin = auctionService.isAdmin(membership);

  // Admins see the top bidder in every visibility mode; the service applies
  // the auction's bidder visibility for everyone else.
  const resultsData = await auctionService.getAuctionResultsData(
    auctionId,
    context.session.user.id,
    isAdmin,
  );

  if (!resultsData) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      auction: resultsData.auction,
      results: resultsData.results,
      unsold: resultsData.unsold,
      userWins: resultsData.userWins,
      totalItems: resultsData.totalItems,
      totalBids: resultsData.totalBids,
      isAdmin,
      messages: await getMessages(context.locale as Locale),
    },
  };
});
