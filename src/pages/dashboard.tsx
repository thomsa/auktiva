import { useMemo } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import useSWR from "swr";
import { authOptions } from "@/lib/auth";
import { getMessages, Locale } from "@/i18n";
import { fetcher } from "@/lib/fetcher";
import { PageLayout, EmptyState, SEO } from "@/components/common";
import { AuctionCard } from "@/components/auction";
import { StatsCard, CurrencyStatsCard } from "@/components/ui/stats-card";
import { SkeletonDashboard } from "@/components/ui/skeleton";
import {
  SortDropdown,
  auctionSortOptions,
  sidebarItemSortOptions,
  sortAuctions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { useSortFilter, usePollingInterval } from "@/hooks/ui";
import { isItemEnded, getBidStatus } from "@/utils/auction-helpers";
import { useTranslations } from "next-intl";

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

interface UserItem {
  id: string;
  name: string;
  auctionId: string;
  auctionName: string;
  currencySymbol: string;
  startingBid: number;
  currentBid: number | null;
  endDate: string | null;
  createdAt: string;
  thumbnailUrl: string | null;
  bidCount: number;
  isPublished: boolean;
}

interface DashboardData {
  auctions: Auction[];
  bidItems: BidItem[];
  bidStats: BidStats;
  userItems: UserItem[];
}

interface DashboardProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

function BidItemCard({ item, userId }: { item: BidItem; userId: string }) {
  const t = useTranslations("status");
  const ended = isItemEnded(item.endDate);
  const isWinning = item.highestBidderId === userId;
  const status = getBidStatus(isWinning, ended);

  return (
    <Link
      href={`/auctions/${item.auctionId}/items/${item.id}`}
      className={`flex gap-3 p-3 rounded-xl hover:bg-base-content/5 transition-colors ${
        ended ? "opacity-60" : ""
      }`}
    >
      <div className="relative shrink-0">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className={`w-14 h-14 object-cover rounded-lg shadow-sm ${
              ended ? "grayscale" : ""
            }`}
          />
        ) : (
          <div
            className={`w-14 h-14 bg-base-200 rounded-lg flex items-center justify-center ${
              ended ? "grayscale" : ""
            }`}
          >
            <span className="icon-[tabler--photo] size-6 text-base-content/30"></span>
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
        <div className="font-medium text-sm truncate">{item.name}</div>
        <div className="text-xs text-base-content/60 truncate">
          {item.auctionName}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`badge badge-xs ${
              status === "winning" || status === "won"
                ? "badge-success"
                : "badge-warning"
            }`}
          >
            {t(status)}
          </span>
          <span className="text-xs font-semibold">
            {item.currencySymbol}
            {(item.currentBid || 0).toFixed(0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function UserItemCard({ item }: { item: UserItem }) {
  const t = useTranslations("dashboard");
  const tItem = useTranslations("item.edit");
  const ended = isItemEnded(item.endDate);
  const isDraft = !item.isPublished;

  return (
    <Link
      href={`/auctions/${item.auctionId}/items/${item.id}`}
      className={`flex gap-3 p-3 rounded-xl hover:bg-base-content/5 transition-colors border ${
        isDraft
          ? "border-warning/30 bg-warning/5"
          : "border-secondary/20 bg-secondary/5"
      } ${ended ? "opacity-60" : ""}`}
    >
      <div className="relative shrink-0">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className={`w-14 h-14 object-cover rounded-lg shadow-sm ${
              ended ? "grayscale" : ""
            } ${isDraft ? "opacity-70" : ""}`}
          />
        ) : (
          <div
            className={`w-14 h-14 bg-base-200 rounded-lg flex items-center justify-center ${
              ended ? "grayscale" : ""
            }`}
          >
            <span className="icon-[tabler--photo] size-6 text-base-content/30"></span>
          </div>
        )}
        {isDraft ? (
          <div className="absolute -top-1 -left-1">
            <div className="badge badge-warning badge-xs gap-0.5">
              <span className="icon-[tabler--eye-off] size-2"></span>
            </div>
          </div>
        ) : ended ? (
          <div className="absolute -top-1 -left-1">
            <div className="badge badge-error badge-xs gap-0.5">
              <span className="icon-[tabler--flag-filled] size-2"></span>
            </div>
          </div>
        ) : null}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm truncate">{item.name}</div>
        <div className="text-xs text-base-content/60 truncate">
          {item.auctionName}
        </div>
        <div className="flex items-center gap-2 mt-1">
          {isDraft ? (
            <span className="badge badge-warning badge-xs">
              {tItem("statusDraft")}
            </span>
          ) : (
            <span className="badge badge-secondary badge-xs">
              {t("myListings.bids", { count: item.bidCount })}
            </span>
          )}
          <span className="text-xs font-semibold">
            {item.currencySymbol}
            {(item.currentBid || item.startingBid).toFixed(0)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function DashboardPage({ user }: DashboardProps) {
  const t = useTranslations("dashboard");
  const tStats = useTranslations("dashboard.stats");
  const tEmpty = useTranslations("dashboard.empty");
  const { currentSort: auctionSort } = useSortFilter(
    "auctionSort",
    "date-desc",
  );
  const { currentSort: bidSort } = useSortFilter("bidSort", "date-desc");

  // Use medium priority for dashboard, pauses when tab hidden
  const refreshInterval = usePollingInterval({ priority: "medium" });

  // Client-side data fetching with polling for bid status updates
  const { data, isLoading } = useSWR<DashboardData>(
    "/api/user/dashboard",
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
    },
  );

  const auctions = useMemo(() => data?.auctions ?? [], [data?.auctions]);
  const bidItems = useMemo(() => data?.bidItems ?? [], [data?.bidItems]);
  const bidStats = data?.bidStats ?? {
    totalBids: 0,
    currencyTotals: [],
    itemsBidOn: 0,
    currentlyWinning: 0,
  };
  const userItems = data?.userItems ?? [];

  const sortedAuctions = useMemo(
    () => sortAuctions(auctions, auctionSort),
    [auctions, auctionSort],
  );

  const sortedBidItems = useMemo(
    () => sortItems(bidItems, bidSort),
    [bidItems, bidSort],
  );

  // Show skeleton while loading
  if (isLoading) {
    return (
      <>
        <SEO title={t("seo.title")} description={t("seo.description")} />
        <PageLayout user={user}>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
                {t("title")}
              </h1>
              <p className="text-base-content/60 mt-1 text-sm sm:text-base">
                {t("welcome", { name: user.name || user.email })}
              </p>
            </div>
            <Link
              href="/auctions/create"
              className="btn btn-primary w-full sm:w-auto"
            >
              <span className="icon-[tabler--plus] size-5"></span>
              {t("createAuction")}
            </Link>
          </div>
          <SkeletonDashboard />
        </PageLayout>
      </>
    );
  }

  return (
    <>
      <SEO title={t("seo.title")} description={t("seo.description")} />
      <PageLayout user={user}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content">
              {t("title")}
            </h1>
            <p className="text-base-content/60 mt-1 text-sm sm:text-base">
              {t("welcome", { name: user.name || user.email })}
            </p>
          </div>
          <Link
            href="/auctions/create"
            className="btn btn-primary w-full sm:w-auto"
          >
            <span className="icon-[tabler--plus] size-5"></span>
            {t("createAuction")}
          </Link>
        </div>

        {/* Stats Cards */}
        {bidStats.totalBids > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatsCard
              icon="icon-[tabler--gavel]"
              iconColor="primary"
              value={bidStats.totalBids}
              label={tStats("totalBids")}
            />
            <CurrencyStatsCard
              icon="icon-[tabler--currency-dollar]"
              iconColor="secondary"
              currencyTotals={bidStats.currencyTotals}
              label={tStats("totalBidAmount")}
            />
            <StatsCard
              icon="icon-[tabler--package]"
              iconColor="accent"
              value={bidStats.itemsBidOn}
              label={tStats("itemsBidOn")}
            />
            <StatsCard
              icon="icon-[tabler--trophy]"
              iconColor="success"
              value={bidStats.currentlyWinning}
              label={tStats("currentlyWinning")}
            />
          </div>
        )}

        {/* My Listings Section */}
        {userItems.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-base-content flex items-center gap-2">
                  <span className="icon-[tabler--tag] size-5 text-secondary"></span>
                  {t("myListings.title")}
                </h2>
                <p className="text-sm text-base-content/60">
                  {t("myListings.subtitle")}
                </p>
              </div>
            </div>
            <div className="card bg-base-100 shadow border border-secondary/10">
              <div className="card-body p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-80 overflow-y-auto">
                  {userItems.map((item) => (
                    <UserItemCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Your Bids Section */}
        {bidItems.length > 0 && (
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-base-content">
                {t("activeBids.title")}
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
                  {sortedBidItems.map((item) => (
                    <BidItemCard key={item.id} item={item} userId={user.id} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auctions Section */}
        {auctions.length === 0 ? (
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <EmptyState
                icon="icon-[tabler--gavel]"
                title={tEmpty("title")}
                description={tEmpty("description")}
                action={
                  <Link href="/auctions/create" className="btn btn-primary">
                    <span className="icon-[tabler--plus] size-5"></span>
                    {tEmpty("createFirst")}
                  </Link>
                }
              />
            </div>
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-base-content">
                {t("auctions.title")}
              </h2>
              <SortDropdown
                options={auctionSortOptions}
                currentSort={auctionSort}
                paramName="auctionSort"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedAuctions.map((auction) => (
                <AuctionCard key={auction.id} auction={auction} />
              ))}
            </div>
          </div>
        )}
      </PageLayout>
    </>
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

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      messages,
    },
  };
};
