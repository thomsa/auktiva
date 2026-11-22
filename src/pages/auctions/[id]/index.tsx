import { useMemo, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { getMessages, Locale } from "@/i18n";
import { fetcher } from "@/lib/fetcher";
import * as auctionService from "@/lib/services/auction.service";
import {
  consumePendingAuctionDestination,
  getPendingAuctionArrival,
  PENDING_AUCTION_ARRIVAL_PARAM,
} from "@/lib/services/pending-auction.service";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { AuctionOverviewHeader, AuctionSidebar } from "@/components/auction";
import type { AuctionPhase } from "@/lib/auction-overview";
import { ItemCard, ItemListItem } from "@/components/item";
import { ChristmasScene } from "@/components/seasonal/ChristmasDecor";
import { SkeletonAuctionPage } from "@/components/ui/skeleton";
import {
  SortDropdown,
  itemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { useSortFilter, usePollingInterval } from "@/hooks/ui";
import { withAuth } from "@/lib/auth/withAuth";
import {
  canAutoJoin,
  isAuctionEnded,
  isUserAdmin,
  canUserCreateItems,
} from "@/utils/auction-helpers";
import { useTranslations } from "next-intl";

interface Auction {
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
}

interface Item {
  id: string;
  name: string;
  description: string | null;
  currencyCode: string;
  startingBid: number;
  currentBid: number | null;
  endDate: string | null;
  createdAt: string;
  creatorId: string;
  isPublished: boolean;
  thumbnailUrl: string | null;
  highestBidderId: string | null;
  userHasBid: boolean;
  _count: {
    bids: number;
  };
}

interface AuctionDetailsData {
  auction: Auction;
  items: Item[];
}

interface AuctionDetailProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auctionId: string;
  auctionName: string | null;
  membership: {
    role: string;
  } | null;
  hasLeft: boolean;
}

export default function AuctionDetailPage({
  user,
  auctionId,
  auctionName,
  membership,
  hasLeft,
}: AuctionDetailProps) {
  const router = useRouter();
  const t = useTranslations("auction");
  const tCommon = useTranslations("common");
  const tItem = useTranslations("item");
  const { currentSort } = useSortFilter("sort", "date-desc");
  const viewMode = (router.query.view as "grid" | "list") || "grid";
  const [rejoining, setRejoining] = useState(false);
  const [rejoinError, setRejoinError] = useState<string | null>(null);
  // The header's live phase, tagged with the auction and end date it was
  // computed for, so an extended or different auction never reuses it.
  // openItemCount is stored so the page re-renders when an item's own end
  // passes: the cards and list rows then re-check isItemEnded against the
  // current time instead of waiting for the next phase change or new data.
  const [overviewPhase, setOverviewPhase] = useState<{
    key: string;
    phase: AuctionPhase;
    endedAt: number | null;
    openItemCount: number;
  } | null>(null);

  // Use high priority for auction detail page, pauses when tab hidden
  const refreshInterval = usePollingInterval({ priority: "high" });

  // Client-side data fetching with polling for live bid updates
  const { data, isLoading, mutate } = useSWR<AuctionDetailsData>(
    hasLeft ? null : `/api/auctions/${auctionId}/details`,
    fetcher,
    {
      refreshInterval,
      revalidateOnFocus: true,
    },
  );

  const auction = data?.auction;
  const items = useMemo(() => data?.items ?? [], [data?.items]);

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

  const handleRejoin = async () => {
    setRejoining(true);
    setRejoinError(null);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/rejoin`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setRejoinError(data.message || t("rejoin.error"));
        return;
      }
      router.reload();
    } catch {
      setRejoinError(t("rejoin.error"));
    } finally {
      setRejoining(false);
    }
  };

  // Show rejoin prompt if user previously left
  if (hasLeft) {
    return (
      <PageLayout user={user}>
        <BackLink href="/dashboard" label={t("create.backToDashboard")} />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="card bg-base-100 shadow-xl border border-base-content/10 max-w-md w-full">
            <div className="card-body items-center text-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-2">
                <span className="icon-[tabler--door-enter] size-8 text-warning"></span>
              </div>
              <h2 className="card-title text-lg">{t("rejoin.title")}</h2>
              <p className="text-base-content/60 text-sm">
                {t("rejoin.message", {
                  name: auctionName || t("rejoin.thisAuction"),
                })}
              </p>
              {rejoinError && (
                <div className="alert alert-error text-sm w-full">
                  <span className="icon-[tabler--alert-circle] size-5"></span>
                  {rejoinError}
                </div>
              )}
              <div className="card-actions mt-4 w-full flex-col gap-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleRejoin}
                  disabled={rejoining}
                >
                  {rejoining ? (
                    <span className="loading loading-spinner loading-sm"></span>
                  ) : (
                    <span className="icon-[tabler--door-enter] size-5"></span>
                  )}
                  {rejoining ? t("rejoin.rejoining") : t("rejoin.button")}
                </button>
                <Link href="/dashboard" className="btn btn-ghost w-full">
                  {t("create.backToDashboard")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  const isAdmin = isUserAdmin(membership!.role);
  const canCreate = canUserCreateItems(membership!.role);
  // The header's "Close auction" is the page's one solid primary while it shows.
  const phaseKey = `${auctionId}|${auction?.endDate ?? ""}`;
  const knownPhase =
    overviewPhase?.key === phaseKey ? overviewPhase.phase : null;
  const ownerCanClose =
    membership!.role === "OWNER" &&
    (knownPhase
      ? knownPhase !== "ended"
      : !isAuctionEnded(auction?.endDate ?? null));
  const knownEndedAt =
    overviewPhase?.key === phaseKey && overviewPhase.endedAt !== null
      ? new Date(overviewPhase.endedAt).toISOString()
      : null;
  const handlePhaseChange = (
    phase: AuctionPhase,
    endedAt: number | null,
    openItemCount: number,
  ) => {
    setOverviewPhase({ key: phaseKey, phase, endedAt, openItemCount });
  };
  const handleDeadlineReached = () => {
    void mutate();
  };

  // The view toggle is a pressed state, not a primary action: neutral fills.
  const toggleOn =
    "border-base-content/15 bg-base-content/10 text-base-content hover:bg-base-content/15";
  const toggleOff =
    "btn-ghost bg-base-200/50 text-base-content/60 hover:text-base-content";

  // Show skeleton while loading
  if (isLoading || !auction) {
    return (
      <PageLayout user={user}>
        <BackLink href="/dashboard" label={t("create.backToDashboard")} />
        <SkeletonAuctionPage />
      </PageLayout>
    );
  }

  return (
    <PageLayout user={user} className="christmas-auction-page">
      {/* Header */}
      <div className="christmas-overview-header mb-8">
        <BackLink
          href="/dashboard"
          label={t("create.backToDashboard")}
          shortLabel={tCommon("back")}
        />
        <div className="flex items-center gap-3 mt-4">
          <div className="christmas-header-icon w-12 h-12 shrink-0 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-content shadow-lg shadow-primary/20">
            <span className="icon-[tabler--gavel] size-7"></span>
          </div>
          <h1 className="min-w-0 wrap-anywhere text-2xl sm:text-3xl font-extrabold tracking-tight">
            {auction.name}
          </h1>
        </div>
        <AuctionOverviewHeader
          auction={auction}
          items={items}
          role={membership!.role}
          onDeadlineReached={handleDeadlineReached}
          onPhaseChange={handlePhaseChange}
        />
      </div>

      <div className="christmas-detail-columns flex flex-col lg:flex-row gap-8">
        {/* Main Content - Items */}
        <div className="christmas-detail-main flex-1 min-w-0">
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
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <SortDropdown
                    options={itemSortOptions}
                    currentSort={currentSort}
                  />
                  <div
                    className="join shadow-sm"
                    role="group"
                    aria-label={t("viewToggle.label")}
                  >
                    <button
                      type="button"
                      className={`btn btn-sm join-item ${
                        viewMode === "grid" ? toggleOn : toggleOff
                      }`}
                      onClick={() => setViewMode("grid")}
                      title={t("viewToggle.grid")}
                      aria-label={t("viewToggle.grid")}
                      aria-pressed={viewMode === "grid"}
                    >
                      <span
                        className="icon-[tabler--layout-grid] size-4"
                        aria-hidden="true"
                      ></span>
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm join-item ${
                        viewMode === "list" ? toggleOn : toggleOff
                      }`}
                      onClick={() => setViewMode("list")}
                      title={t("viewToggle.list")}
                      aria-label={t("viewToggle.list")}
                      aria-pressed={viewMode === "list"}
                    >
                      <span
                        className="icon-[tabler--list] size-4"
                        aria-hidden="true"
                      ></span>
                    </button>
                  </div>
                  {/* With no items, the empty state carries the one Add Item action. */}
                  {canCreate && sortedItems.length > 0 && (
                    <Link
                      href={`/auctions/${auction.id}/items/create`}
                      className={`btn btn-primary btn-sm w-full sm:w-auto ${
                        ownerCanClose
                          ? "btn-soft"
                          : "shadow-md shadow-primary/20"
                      }`}
                    >
                      <span className="icon-[tabler--plus] size-4"></span>
                      <span className="hidden sm:inline ">
                        {t("sidebar.addItem")}
                      </span>
                      <span className="sm:hidden ">{tCommon("create")}</span>
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
                          className={`btn btn-primary whitespace-nowrap max-sm:w-full max-sm:px-3 ${
                            ownerCanClose ? "btn-soft" : "shadow-lg"
                          }`}
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
                      auctionEndDate={auction.endDate}
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
                      auctionEndDate={auction.endDate}
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
        <div className="lg:w-80 shrink-0">
          <AuctionSidebar
            auction={auction}
            membership={membership!}
            visibleItemCount={items.length}
            actionsInHeader={isAdmin}
            isEnded={knownPhase ? knownPhase === "ended" : undefined}
            deadlinePassed={knownPhase === "overtime"}
            endedAt={knownEndedAt}
          />
        </div>
        <div className="christmas-scene-slot">
          <ChristmasScene placement="sidebar" />
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const auctionId = context.params?.id as string;
  const userId = context.session.user.id;
  const pending = await getPendingAuctionArrival(
    userId,
    auctionId,
    context.query[PENDING_AUCTION_ARRIVAL_PARAM],
  );

  // Get auction details
  const auction = await auctionService.getAuctionForDetailPage(auctionId);

  if (!auction) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Get membership check
  let membership = await auctionService.getUserMembership(auctionId, userId);

  // If not a member, check if this is an OPEN or LINK auction
  if (!membership) {
    if (canAutoJoin(auction)) {
      // Check if user previously left voluntarily
      const hasLeft = await auctionService.hasUserLeftAuction(
        auctionId,
        userId,
      );

      if (hasLeft) {
        // Show rejoin prompt instead of auto-joining
        return {
          props: {
            user: {
              id: context.session.user.id,
              name: context.session.user.name || null,
              email: context.session.user.email || "",
            },
            auctionId,
            auctionName: auction.name,
            membership: null,
            hasLeft: true,
            messages: await getMessages(context.locale as Locale),
          },
        };
      }

      // Auto-join new users
      membership = await auctionService.autoJoinAuction(auctionId, userId);
    }

    // Not a member and not a public auction - redirect
    if (!membership) {
      return {
        redirect: {
          destination: "/dashboard",
          permanent: false,
        },
      };
    }
  }

  const messages = await getMessages(context.locale as Locale);
  if (pending) {
    await consumePendingAuctionDestination(pending.id, userId, auctionId);
  }

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      auctionId,
      auctionName: null,
      membership: {
        role: membership.role,
      },
      hasLeft: false,
      messages,
    },
  };
});
