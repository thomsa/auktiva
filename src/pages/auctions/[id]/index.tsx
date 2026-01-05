import { useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import useSWR from "swr";
import { getMessages, Locale } from "@/i18n";
import { fetcher } from "@/lib/fetcher";
import * as auctionService from "@/lib/services/auction.service";
import { PageLayout, BackLink, EmptyState } from "@/components/common";
import { AuctionSidebar } from "@/components/auction";
import { ItemCard, ItemListItem } from "@/components/item";
import { SkeletonAuctionPage } from "@/components/ui/skeleton";
import {
  SortDropdown,
  itemSortOptions,
  sortItems,
} from "@/components/ui/sort-dropdown";
import { useSortFilter, usePollingInterval } from "@/hooks/ui";
import { withAuth } from "@/lib/auth/withAuth";
import { isUserAdmin, canUserCreateItems } from "@/utils/auction-helpers";
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
  membership: {
    role: string;
  };
}

export default function AuctionDetailPage({
  user,
  auctionId,
  membership,
}: AuctionDetailProps) {
  const router = useRouter();
  const t = useTranslations("auction");
  const tCommon = useTranslations("common");
  const tItem = useTranslations("item");
  const { currentSort } = useSortFilter("sort", "date-desc");
  const viewMode = (router.query.view as "grid" | "list") || "grid";

  // Use high priority for auction detail page, pauses when tab hidden
  const refreshInterval = usePollingInterval({ priority: "high" });

  // Client-side data fetching with polling for live bid updates
  const { data, isLoading } = useSWR<AuctionDetailsData>(
    `/api/auctions/${auctionId}/details`,
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

  const isAdmin = isUserAdmin(membership.role);
  const canCreate = canUserCreateItems(membership.role);

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
    <PageLayout user={user}>
      {/* Header */}
      <div className="mb-8">
        <BackLink
          href="/dashboard"
          label={t("create.backToDashboard")}
          shortLabel={tCommon("back")}
        />
        <div className="flex items-center gap-3 mt-4">
          <div className="w-12 h-12 shrink-0 rounded-xl bg-linear-to-br from-primary to-secondary flex items-center justify-center text-primary-content shadow-lg shadow-primary/20">
            <span className="icon-[tabler--gavel] size-7"></span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {auction.name}
          </h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content - Items */}
        <div className="flex-1 min-w-0">
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
                  <div className="join shadow-sm">
                    <button
                      className={`btn btn-sm join-item ${
                        viewMode === "grid"
                          ? "btn-active btn-primary"
                          : "btn-ghost bg-base-200/50"
                      }`}
                      onClick={() => setViewMode("grid")}
                      title="Grid view"
                    >
                      <span className="icon-[tabler--layout-grid] size-4"></span>
                    </button>
                    <button
                      className={`btn btn-sm join-item ${
                        viewMode === "list"
                          ? "btn-active btn-primary"
                          : "btn-ghost bg-base-200/50"
                      }`}
                      onClick={() => setViewMode("list")}
                      title="List view"
                    >
                      <span className="icon-[tabler--list] size-4"></span>
                    </button>
                  </div>
                  {canCreate && (
                    <Link
                      href={`/auctions/${auction.id}/items/create`}
                      className="btn btn-primary btn-sm shadow-md shadow-primary/20 w-full sm:w-auto"
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
        <div className="lg:w-80 shrink-0">
          <AuctionSidebar auction={auction} membership={membership} />
        </div>
      </div>
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const auctionId = context.params?.id as string;

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
  let membership = await auctionService.getUserMembership(
    auctionId,
    context.session.user.id,
  );

  // If not a member, check if this is an OPEN or LINK auction
  if (!membership) {
    if (auction.joinMode === "FREE" || auction.joinMode === "LINK") {
      // Auto-join the user to the open/link auction
      membership = await auctionService.autoJoinAuction(
        auctionId,
        context.session.user.id,
      );
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

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      auctionId,
      membership: {
        role: membership.role,
      },
      messages: await getMessages(context.locale as Locale),
    },
  };
});
