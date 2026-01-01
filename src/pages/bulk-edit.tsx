import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import useSWR from "swr";
import { authOptions } from "@/lib/auth";
import { getMessages, Locale } from "@/i18n";
import { fetcher } from "@/lib/fetcher";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, SEO } from "@/components/common";
import { BulkEditTable, BulkEditItem } from "@/components/item/BulkEditTable";
import { SkeletonTable } from "@/components/ui/skeleton";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface BulkEditPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  currencies: Currency[];
}

const INSTRUCTIONS_DISMISSED_KEY = "auktiva-bulk-edit-instructions-dismissed";

function getInitialInstructionsState() {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(INSTRUCTIONS_DISMISSED_KEY) !== "true";
}

export default function BulkEditPage({ user, currencies }: BulkEditPageProps) {
  const t = useTranslations("bulkEdit");
  const tNav = useTranslations("nav");
  const [showInstructions, setShowInstructions] = useState(
    getInitialInstructionsState,
  );

  const handleDismissInstructions = useCallback(() => {
    setShowInstructions(false);
    localStorage.setItem(INSTRUCTIONS_DISMISSED_KEY, "true");
  }, []);

  const {
    data: items = [],
    isLoading,
    mutate,
  } = useSWR<BulkEditItem[]>("/api/user/items/bulk-edit", fetcher);

  const handleItemUpdate = useCallback(
    async (itemId: string, field: string, value: string | number | boolean) => {
      // Find the item to get its auctionId
      const item = items.find((i) => i.id === itemId);
      if (!item) return;

      const response = await fetch(
        `/api/auctions/${item.auctionId}/items/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [field]: value }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update");
      }

      // Optimistically update local data
      mutate(
        items.map((i) => (i.id === itemId ? { ...i, [field]: value } : i)),
        false,
      );
    },
    [items, mutate],
  );

  const handleBulkUpdate = useCallback(
    async (
      itemIds: string[],
      updates: Record<string, string | number | boolean>,
    ) => {
      const response = await fetch("/api/user/items/bulk-edit", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemIds, updates }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to bulk update");
      }

      return response.json();
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    mutate();
  }, [mutate]);

  return (
    <>
      <SEO title={t("seo.title")} description={t("seo.description")} />
      <PageLayout user={user} maxWidth="full">
        <div className="mb-6">
          <BackLink href="/listings" label={tNav("myListings")} />
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content flex items-center gap-3">
              <span className="icon-[tabler--table-options] size-8 text-primary"></span>
              {t("title")}
            </h1>
            <p className="text-base-content/60 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        {/* Instructions */}
        {showInstructions && (
          <div className="alert alert-info mb-6">
            <span className="icon-[tabler--info-circle] size-5"></span>
            <div className="flex-1">
              <p className="font-medium">{t("instructions.title")}</p>
              <ul className="text-sm mt-1 list-disc list-inside">
                <li>{t("instructions.clickToEdit")}</li>
                <li>{t("instructions.autoSave")}</li>
                <li>{t("instructions.selectMultiple")}</li>
                <li>{t("instructions.bidsRestriction")}</li>
              </ul>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm btn-circle"
              onClick={handleDismissInstructions}
              aria-label="Close"
            >
              <span className="icon-[tabler--x] size-5"></span>
            </button>
          </div>
        )}

        {isLoading ? (
          <SkeletonTable rows={5} columns={8} />
        ) : (
          <BulkEditTable
            items={items}
            currencies={currencies}
            onItemUpdate={handleItemUpdate}
            onBulkUpdate={handleBulkUpdate}
            onRefresh={handleRefresh}
          />
        )}
      </PageLayout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }

  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email,
        image: session.user.image ?? null,
      },
      currencies,
      messages,
    },
  };
};
