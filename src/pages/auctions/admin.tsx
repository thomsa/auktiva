import { useState, useCallback } from "react";
import { useRouter } from "next/router";
import { PageLayout } from "@/components/common";
import { BulkEditTable, BulkEditItem } from "@/components/item/BulkEditTable";
import { SkeletonBulkEditTable } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";
import { prisma } from "@/lib/prisma";
import * as itemService from "@/lib/services/item.service";
import { getPublicUrl } from "@/lib/storage";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

interface AdminAuction {
  id: string;
  name: string;
  thumbnailUrl: string | null;
}

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface AdminPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  adminAuctions: AdminAuction[];
  currencies: Currency[];
  initialAuctionId: string | null;
  initialItems: BulkEditItem[];
}

export default function AdminPage({
  user,
  adminAuctions,
  currencies,
  initialAuctionId,
  initialItems,
}: AdminPageProps) {
  const router = useRouter();
  const t = useTranslations("admin");
  const tErrors = useTranslations("errors");
  const { showToast } = useToast();

  const [selectedAuctionId, setSelectedAuctionId] = useState<string | null>(
    initialAuctionId,
  );

  // Fetch items for selected auction
  const {
    data: itemsData,
    mutate: mutateItems,
    isLoading,
  } = useSWR<{
    items: BulkEditItem[];
  }>(
    selectedAuctionId ? `/api/auctions/${selectedAuctionId}/admin-items` : null,
    fetcher,
    {
      fallbackData: initialAuctionId ? { items: initialItems } : undefined,
      revalidateOnFocus: false,
    },
  );

  const items = itemsData?.items ?? [];

  const handleAuctionChange = useCallback(
    (auctionId: string) => {
      setSelectedAuctionId(auctionId || null);
      if (auctionId) {
        router.push(`/auctions/admin?auctionId=${auctionId}`, undefined, {
          shallow: true,
        });
      } else {
        router.push("/auctions/admin", undefined, { shallow: true });
      }
    },
    [router],
  );

  const handleBulkUpdate = useCallback(
    async (
      itemIds: string[],
      updates: Record<string, string | number | boolean>,
    ): Promise<{ updated: number; skipped: number }> => {
      if (!selectedAuctionId) {
        return { updated: 0, skipped: itemIds.length };
      }

      try {
        const res = await fetch(
          `/api/auctions/${selectedAuctionId}/admin-items/bulk`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ itemIds, updates }),
          },
        );

        if (!res.ok) {
          const error = await res.json();
          showToast(error.message || tErrors("generic"), "error");
          return { updated: 0, skipped: itemIds.length };
        }

        const result = await res.json();
        return result;
      } catch {
        showToast(tErrors("generic"), "error");
        return { updated: 0, skipped: itemIds.length };
      }
    },
    [selectedAuctionId, showToast, tErrors],
  );

  const handleRefresh = useCallback(() => {
    mutateItems();
  }, [mutateItems]);

  const selectedAuction = adminAuctions.find((a) => a.id === selectedAuctionId);

  const handleItemUpdate = useCallback(
    async (
      itemId: string,
      field: string,
      value: string | number | boolean,
    ): Promise<void> => {
      if (!selectedAuctionId) return;

      try {
        const res = await fetch(
          `/api/auctions/${selectedAuctionId}/items/${itemId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ [field]: value }),
          },
        );

        if (!res.ok) {
          const error = await res.json();
          showToast(error.message || tErrors("generic"), "error");
        }
      } catch {
        showToast(tErrors("generic"), "error");
      }
    },
    [selectedAuctionId, showToast, tErrors],
  );

  return (
    <PageLayout user={user} maxWidth="full">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
            <span className="icon-[tabler--shield-check] size-7"></span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-base-content/60">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {/* Auction Selector */}
      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-6">
        <div className="card-body p-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <label className="font-medium text-base-content/80 whitespace-nowrap">
              {t("selectAuction")}
            </label>
            <select
              className="select select-bordered w-full sm:max-w-md"
              value={selectedAuctionId || ""}
              onChange={(e) => handleAuctionChange(e.target.value)}
            >
              <option value="">{t("selectAuctionPlaceholder")}</option>
              {adminAuctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {auction.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Selected Auction Info & Quick Actions */}
      {selectedAuction && (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl mb-6">
          <div className="card-body p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedAuction.thumbnailUrl ? (
                  <img
                    src={selectedAuction.thumbnailUrl}
                    alt={selectedAuction.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-base-200 flex items-center justify-center">
                    <span className="icon-[tabler--gavel] size-8 text-base-content/30"></span>
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold">
                    {selectedAuction.name}
                  </h2>
                  <p className="text-sm text-base-content/60">
                    {t("itemCount", { count: items.length })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <a
                  href={`/auctions/${selectedAuctionId}`}
                  className="btn btn-ghost btn-sm"
                >
                  <span className="icon-[tabler--eye] size-4"></span>
                  {t("viewAuction")}
                </a>
                <a
                  href={`/auctions/${selectedAuctionId}/settings`}
                  className="btn btn-ghost btn-sm"
                >
                  <span className="icon-[tabler--settings] size-4"></span>
                  {t("auctionSettings")}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Table */}
      {selectedAuctionId ? (
        isLoading ? (
          <SkeletonBulkEditTable />
        ) : items.length > 0 ? (
          <BulkEditTable
            items={items}
            currencies={currencies}
            currentUserId={user.id}
            showOwner={true}
            onItemUpdate={handleItemUpdate}
            onBulkUpdate={handleBulkUpdate}
            onRefresh={handleRefresh}
          />
        ) : (
          <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
            <div className="card-body p-12 text-center">
              <span className="icon-[tabler--package-off] size-16 mx-auto text-base-content/20 mb-4"></span>
              <h3 className="text-lg font-semibold text-base-content/60">
                {t("noEditableItems")}
              </h3>
              <p className="text-sm text-base-content/40 max-w-md mx-auto">
                {t("noEditableItemsDescription")}
              </p>
            </div>
          </div>
        )
      ) : (
        <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
          <div className="card-body p-12 text-center">
            <span className="icon-[tabler--list-search] size-16 mx-auto text-base-content/20 mb-4"></span>
            <h3 className="text-lg font-semibold text-base-content/60">
              {t("selectAuctionPrompt")}
            </h3>
            <p className="text-sm text-base-content/40 max-w-md mx-auto">
              {t("selectAuctionPromptDescription")}
            </p>
          </div>
        </div>
      )}
    </PageLayout>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  const userId = context.session.user.id;

  // Get all auctions where user is OWNER or ADMIN
  const adminMemberships = await prisma.auctionMember.findMany({
    where: {
      userId,
      role: { in: ["OWNER", "ADMIN"] },
    },
    include: {
      auction: {
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
        },
      },
    },
    orderBy: {
      auction: {
        name: "asc",
      },
    },
  });

  // If user is not admin in any auction, redirect to dashboard
  if (adminMemberships.length === 0) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const adminAuctions = adminMemberships.map((m) => ({
    id: m.auction.id,
    name: m.auction.name,
    thumbnailUrl: m.auction.thumbnailUrl
      ? getPublicUrl(m.auction.thumbnailUrl)
      : null,
  }));

  // Check if auctionId is provided in query
  const auctionId = context.query.auctionId as string | undefined;
  let initialAuctionId: string | null = null;
  let initialItems: BulkEditItem[] = [];

  if (auctionId && adminAuctions.some((a) => a.id === auctionId)) {
    initialAuctionId = auctionId;
    initialItems = await itemService.getAdminEditableItems(auctionId, userId);
  }

  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  return {
    props: {
      user: {
        id: userId,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      adminAuctions,
      currencies,
      initialAuctionId,
      initialItems,
      messages: await getMessages(context.locale as Locale),
    },
  };
});
