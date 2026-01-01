import { useMemo, useState } from "react";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import Link from "next/link";
import useSWR from "swr";
import { authOptions } from "@/lib/auth";
import { fetcher } from "@/lib/fetcher";
import { PageLayout, EmptyState } from "@/components/common";
import {
  SortDropdown,
  listingSortOptions,
  sortListings,
} from "@/components/ui/sort-dropdown";
import { SlidingSwitch } from "@/components/ui/sliding-switch";
import { SkeletonListingsPage } from "@/components/ui/skeleton";
import { useSortFilter } from "@/hooks/ui";
import { isItemEnded } from "@/utils/auction-helpers";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { useFormatters } from "@/i18n";

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
  winner: {
    name: string | null;
    email: string;
  } | null;
}

interface ListingsPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
}

export default function ListingsPage({ user }: ListingsPageProps) {
  const t = useTranslations("nav");
  const tListings = useTranslations("listings");
  const tStatus = useTranslations("status");
  const { formatShortDate } = useFormatters();

  const [viewMode, setViewMode] = useState<"active" | "ended">("active");
  const { currentSort: activeSort } = useSortFilter("activeSort", "date-desc");
  const { currentSort: endedSort } = useSortFilter("endedSort", "date-desc");

  // Client-side data fetching
  const { data: items = [], isLoading } = useSWR<UserItem[]>(
    "/api/user/listings",
    fetcher,
  );

  // Calculate date 3 days ago for "Just Ended" section
  const threeDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  // Draft items (unpublished)
  const draftItems = useMemo(
    () => items.filter((item) => !item.isPublished),
    [items],
  );

  // Published items only for active/ended filtering
  const publishedItems = useMemo(
    () => items.filter((item) => item.isPublished),
    [items],
  );

  const activeItems = useMemo(
    () =>
      sortListings(
        publishedItems.filter((item) => !isItemEnded(item.endDate)),
        activeSort,
      ),
    [publishedItems, activeSort],
  );

  const endedItems = useMemo(
    () =>
      sortListings(
        publishedItems.filter((item) => isItemEnded(item.endDate)),
        endedSort,
      ),
    [publishedItems, endedSort],
  );

  // Items that ended in the last 3 days (need attention)
  const justEndedItems = useMemo(
    () =>
      endedItems.filter((item) => {
        if (!item.endDate) return false;
        const endDate = new Date(item.endDate);
        return endDate >= threeDaysAgo && item.bidCount > 0;
      }),
    [endedItems, threeDaysAgo],
  );

  const currentItems = viewMode === "active" ? activeItems : endedItems;
  const currentSort = viewMode === "active" ? activeSort : endedSort;
  const currentSortParam = viewMode === "active" ? "activeSort" : "endedSort";

  // Show skeleton while loading
  if (isLoading) {
    return (
      <PageLayout user={user}>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-linear-to-r from-base-content to-base-content/60 bg-clip-text text-transparent mb-2">
              {t("myListings")}
            </h1>
            <p className="text-base-content/60 text-lg">
              {tListings("subtitle")}
            </p>
          </div>
        </div>
        <SkeletonListingsPage />
      </PageLayout>
    );
  }

  return (
    <PageLayout user={user}>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-linear-to-r from-base-content to-base-content/60 bg-clip-text text-transparent mb-2">
            {t("myListings")}
          </h1>
          <p className="text-base-content/60 text-lg">
            {tListings("subtitle")}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <EmptyState
              icon="icon-[tabler--tag]"
              title={tListings("empty.title")}
              description={tListings("empty.description")}
            />
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Draft Section - Unpublished items */}
          {draftItems.length > 0 && (
            <div className="card bg-warning/5 border border-warning/20">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="icon-[tabler--eye-off] size-5 text-warning"></span>
                  <h2 className="text-lg font-semibold">
                    {tListings("drafts.title")}
                  </h2>
                  <span className="badge badge-warning badge-sm">
                    {draftItems.length}
                  </span>
                </div>
                <p className="text-sm text-base-content/60 mb-4">
                  {tListings("drafts.description")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {draftItems.map((item) => (
                    <DraftCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Just Ended Section - Items needing attention */}
          {justEndedItems.length > 0 && (
            <div className="card bg-primary/5 border border-primary/20">
              <div className="card-body p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="icon-[tabler--sparkles] size-5 text-primary"></span>
                  <h2 className="text-lg font-semibold">
                    {tListings("justEnded.title")}
                  </h2>
                  <span className="badge badge-primary badge-sm">
                    {justEndedItems.length}
                  </span>
                </div>
                <p className="text-sm text-base-content/60 mb-4">
                  {tListings("justEnded.description")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {justEndedItems.map((item) => (
                    <JustEndedCard key={item.id} item={item} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Sliding Switch */}
          <SlidingSwitch
            leftLabel={`${tListings("active")} (${activeItems.length})`}
            rightLabel={`${tListings("ended")} (${endedItems.length})`}
            leftValue="active"
            rightValue="ended"
            value={viewMode}
            onChange={(val) => setViewMode(val as "active" | "ended")}
          />

          {/* Current View with Sort */}
          <div>
            <div className="flex justify-end mb-4">
              <SortDropdown
                options={listingSortOptions}
                currentSort={currentSort}
                paramName={currentSortParam}
              />
            </div>
            {currentItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentItems.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    formatShortDate={formatShortDate}
                    tStatus={tStatus}
                    tListings={tListings}
                    ended={viewMode === "ended"}
                  />
                ))}
              </div>
            ) : (
              <div className="card bg-base-100 border border-base-content/10">
                <div className="card-body py-12 text-center">
                  <span
                    className={`icon-[tabler--${viewMode === "active" ? "clock" : "flag-filled"}] size-12 mx-auto text-base-content/20 mb-4`}
                  ></span>
                  <p className="text-base-content/60">
                    {viewMode === "active"
                      ? tListings("noActive")
                      : tListings("noEnded")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}

function DraftCard({ item }: { item: UserItem }) {
  return (
    <Link
      href={`/auctions/${item.auctionId}/items/${item.id}/edit`}
      className="flex gap-3 p-3 rounded-lg bg-base-100 border border-warning/20 hover:border-warning/40 hover:shadow-md transition-all"
    >
      <div className="relative shrink-0">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-12 h-12 object-cover rounded-lg opacity-70"
          />
        ) : (
          <div className="w-12 h-12 bg-base-200 rounded-lg flex items-center justify-center">
            <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
          </div>
        )}
        <div className="absolute -top-1 -right-1">
          <div className="badge badge-warning badge-xs gap-0.5">
            <span className="icon-[tabler--eye-off] size-2"></span>
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <span className="font-semibold text-sm truncate block hover:text-warning transition-colors">
          {item.name}
        </span>
        <div className="text-xs text-base-content/60 mt-0.5 truncate">
          {item.auctionName}
        </div>
        <div className="flex items-center gap-1 text-xs text-warning mt-1">
          <span className="icon-[tabler--edit] size-3"></span>
          <span>Click to edit & publish</span>
        </div>
      </div>
    </Link>
  );
}

function JustEndedCard({ item }: { item: UserItem }) {
  return (
    <div className="flex gap-3 p-3 rounded-lg bg-base-100 border border-primary/20 hover:border-primary/40 hover:shadow-md transition-all">
      <Link
        href={`/auctions/${item.auctionId}/items/${item.id}`}
        className="relative shrink-0"
      >
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="w-12 h-12 object-cover rounded-lg"
          />
        ) : (
          <div className="w-12 h-12 bg-base-200 rounded-lg flex items-center justify-center">
            <span className="icon-[tabler--photo] size-5 text-base-content/30"></span>
          </div>
        )}
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/auctions/${item.auctionId}/items/${item.id}`}
          className="font-semibold text-sm truncate block hover:text-primary transition-colors"
        >
          {item.name}
        </Link>
        <div className="flex items-center gap-1 text-xs text-base-content/60 mt-0.5">
          <span className="icon-[tabler--trophy] size-3 text-primary"></span>
          <span className="font-medium">
            {item.currencySymbol}
            {(item.currentBid || item.startingBid).toFixed(0)}
          </span>
        </div>
        {item.winner && (
          <div className="mt-1.5 pt-1.5 border-t border-base-content/5">
            <a
              href={`mailto:${item.winner.email}`}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs hover:text-primary transition-colors group"
            >
              <span className="icon-[tabler--mail] size-3 text-primary"></span>
              <span className="text-primary truncate font-medium underline underline-offset-2 group-hover:text-primary/80">
                {item.winner.email}
              </span>
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

function ListingCard({
  item,
  formatShortDate,
  tStatus,
  tListings,
  ended = false,
}: {
  item: UserItem;
  formatShortDate: (date: string) => string;
  tStatus: ReturnType<typeof useTranslations>;
  tListings: ReturnType<typeof useTranslations>;
  ended?: boolean;
}) {
  return (
    <Link
      href={`/auctions/${item.auctionId}/items/${item.id}`}
      className={`card bg-base-100 border border-secondary/20 hover:border-secondary/40 hover:shadow-lg transition-all ${
        ended ? "opacity-70" : ""
      }`}
    >
      <div className="card-body p-4">
        <div className="flex gap-4">
          <div className="relative shrink-0">
            {item.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.thumbnailUrl}
                alt={item.name}
                className={`w-16 h-16 object-cover rounded-lg shadow-sm ${
                  ended ? "grayscale" : ""
                }`}
              />
            ) : (
              <div
                className={`w-16 h-16 bg-base-200 rounded-lg flex items-center justify-center ${
                  ended ? "grayscale" : ""
                }`}
              >
                <span className="icon-[tabler--photo] size-6 text-base-content/30"></span>
              </div>
            )}
            {ended && (
              <div className="absolute -top-1 -right-1">
                <div className="badge badge-error badge-xs gap-0.5">
                  <span className="icon-[tabler--flag-filled] size-2"></span>
                </div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{item.name}</h3>
            <p className="text-sm text-base-content/60 truncate">
              {item.auctionName}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="badge badge-secondary badge-sm">
                {tListings("bids", { count: item.bidCount })}
              </span>
              <span className="text-sm font-semibold">
                {item.currencySymbol}
                {(item.currentBid || item.startingBid).toFixed(0)}
              </span>
            </div>
          </div>
        </div>
        {item.endDate && (
          <div className="mt-3 pt-3 border-t border-base-content/5 flex justify-between items-center text-xs">
            <span className="text-base-content/60">
              {ended ? tStatus("ended") : tStatus("ends")}
            </span>
            <span className={ended ? "text-error" : "text-base-content/80"}>
              {formatShortDate(item.endDate)}
            </span>
          </div>
        )}
      </div>
    </Link>
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

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      messages: await getMessages(context.locale as Locale),
    },
  };
};
