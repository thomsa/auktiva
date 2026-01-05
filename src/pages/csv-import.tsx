import { useState, useCallback, useRef } from "react";
import { getMessages, Locale } from "@/i18n";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, SEO } from "@/components/common";
import { ImportPreviewTable } from "@/components/item/ImportPreviewTable";
import { useToast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";
import {
  parseCSV,
  validateCurrencies,
  generateCSVTemplate,
  ParsedCSVItem,
} from "@/lib/csv/item-parser";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface Auction {
  id: string;
  name: string;
}

interface CSVImportPageProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  currencies: Currency[];
  auctions: Auction[];
}

export default function CSVImportPage({
  user,
  currencies,
  auctions,
}: CSVImportPageProps) {
  const t = useTranslations("csvImport");
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>("");
  const [items, setItems] = useState<ParsedCSVItem[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: number;
    failed: number;
  } | null>(null);

  const selectedAuction = auctions.find((a) => a.id === selectedAuctionId);
  const defaultCurrency = currencies[0]?.code || "USD";
  const validCurrencyCodes = currencies.map((c) => c.code);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const result = parseCSV(content, defaultCurrency);

        // Validate currencies
        const validatedItems = validateCurrencies(
          result.items,
          validCurrencyCodes,
        );

        setItems(validatedItems);
        setImportResult(null);

        if (result.errors.length > 0) {
          showToast(
            t("parseWarnings", { count: result.errors.length }),
            "warning",
          );
        } else if (result.items.length > 0) {
          showToast(
            t("parseSuccess", { count: result.items.length }),
            "success",
          );
        }
      };

      reader.onerror = () => {
        showToast(t("parseError"), "error");
      };

      reader.readAsText(file);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [defaultCurrency, validCurrencyCodes, showToast, t],
  );

  const handleItemChange = useCallback(
    (tempId: string, field: string, value: string | number | boolean) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.tempId !== tempId) return item;

          const updated = { ...item, [field]: value };

          // Clear error for this field if it was fixed
          updated.errors = item.errors.filter((e) => e.field !== field);

          // Re-validate
          if (field === "name" && !value) {
            updated.errors.push({
              row: 0,
              field: "name",
              message: "Name is required",
            });
          }
          if (
            field === "currencyCode" &&
            !validCurrencyCodes.includes(value as string)
          ) {
            updated.errors.push({
              row: 0,
              field: "currencyCode",
              message: `Invalid currency: ${value}`,
            });
          }

          return updated;
        }),
      );
    },
    [validCurrencyCodes],
  );

  const handleItemRemove = useCallback((tempId: string) => {
    setItems((prev) => prev.filter((item) => item.tempId !== tempId));
  }, []);

  const handleBulkChange = useCallback(
    (tempIds: string[], updates: Record<string, string | number | boolean>) => {
      setItems((prev) =>
        prev.map((item) => {
          if (!tempIds.includes(item.tempId)) return item;
          return { ...item, ...updates };
        }),
      );
    },
    [],
  );

  const handleDownloadTemplate = useCallback(() => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auction-items-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedAuctionId || items.length === 0) return;

    // Check for errors
    const itemsWithErrors = items.filter((item) => item.errors.length > 0);
    if (itemsWithErrors.length > 0) {
      showToast(t("fixErrorsFirst"), "error");
      return;
    }

    setIsImporting(true);
    let successCount = 0;
    let failedCount = 0;

    try {
      // Import items one by one (could be batched in future)
      for (const item of items) {
        try {
          const response = await fetch(
            `/api/auctions/${selectedAuctionId}/items`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: item.name,
                description: item.description,
                currencyCode: item.currencyCode,
                startingBid: item.startingBid,
                minBidIncrement: item.minBidIncrement,
                isPublished: item.isPublished,
              }),
            },
          );

          if (response.ok) {
            successCount++;
          } else {
            failedCount++;
          }
        } catch {
          failedCount++;
        }
      }

      setImportResult({ success: successCount, failed: failedCount });

      if (failedCount === 0) {
        showToast(t("importSuccess", { count: successCount }), "success");
        setItems([]);
      } else {
        showToast(
          t("importPartial", { success: successCount, failed: failedCount }),
          "warning",
        );
      }
    } finally {
      setIsImporting(false);
    }
  }, [selectedAuctionId, items, showToast, t]);

  const hasErrors = items.some((item) => item.errors.length > 0);

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
              <span className="icon-[tabler--file-import] size-8 text-primary"></span>
              {t("title")}
            </h1>
            <p className="text-base-content/60 mt-1">{t("subtitle")}</p>
          </div>
        </div>

        {/* Step 1: Select Auction */}
        <div className="card bg-base-100 border border-base-300 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="badge badge-primary badge-sm">1</span>
            {t("selectAuction")}
          </h2>

          {auctions.length === 0 ? (
            <div className="alert alert-warning">
              <span className="icon-[tabler--alert-triangle] size-5"></span>
              <span>{t("noAuctions")}</span>
            </div>
          ) : (
            <select
              className="select select-bordered w-full max-w-md"
              value={selectedAuctionId}
              onChange={(e) => setSelectedAuctionId(e.target.value)}
            >
              <option value="">{t("selectAuctionPlaceholder")}</option>
              {auctions.map((auction) => (
                <option key={auction.id} value={auction.id}>
                  {auction.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Step 2: Upload CSV */}
        <div
          className={`card bg-base-100 border border-base-300 p-6 mb-6 ${
            !selectedAuctionId ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="badge badge-primary badge-sm">2</span>
            {t("uploadCSV")}
          </h2>

          <div className="flex flex-wrap gap-4 items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="file-input file-input-bordered w-full max-w-md"
              disabled={!selectedAuctionId}
            />

            <button
              type="button"
              className="btn btn-ghost btn-sm gap-1"
              onClick={handleDownloadTemplate}
            >
              <span className="icon-[tabler--download] size-4"></span>
              {t("downloadTemplate")}
            </button>
          </div>

          <div className="mt-4 text-sm text-base-content/60">
            <p className="font-medium mb-1">{t("csvFormat")}</p>
            <p>{t("csvFormatDesc")}</p>
            <code className="block mt-2 p-2 bg-base-200 rounded text-xs">
              name, description, currency, startingBid, minIncrement, published
            </code>
          </div>
        </div>

        {/* Step 3: Preview & Edit */}
        {items.length > 0 && (
          <div className="card bg-base-100 border border-base-300 p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <span className="badge badge-primary badge-sm">3</span>
                {t("previewAndEdit")}
                <span className="badge badge-neutral">{items.length}</span>
              </h2>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setItems([])}
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary gap-1"
                  onClick={handleImport}
                  disabled={isImporting || hasErrors || !selectedAuctionId}
                >
                  {isImporting ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      {t("importing")}
                    </>
                  ) : (
                    <>
                      <span className="icon-[tabler--upload] size-4"></span>
                      {t("importAll", { count: items.length })}
                    </>
                  )}
                </button>
              </div>
            </div>

            {selectedAuction && (
              <div className="alert alert-info mb-4">
                <span className="icon-[tabler--info-circle] size-5"></span>
                <span>
                  {t("importingTo", { auction: selectedAuction.name })}
                </span>
              </div>
            )}

            {importResult && (
              <div
                className={`alert mb-4 ${
                  importResult.failed > 0 ? "alert-warning" : "alert-success"
                }`}
              >
                <span
                  className={`${
                    importResult.failed > 0
                      ? "icon-[tabler--alert-triangle]"
                      : "icon-[tabler--check]"
                  } size-5`}
                ></span>
                <span>
                  {t("importResult", {
                    success: importResult.success,
                    failed: importResult.failed,
                  })}
                </span>
              </div>
            )}

            <ImportPreviewTable
              items={items}
              currencies={currencies}
              onItemChange={handleItemChange}
              onItemRemove={handleItemRemove}
              onBulkChange={handleBulkChange}
            />
          </div>
        )}
      </PageLayout>
    </>
  );
}

export const getServerSideProps = withAuth(async (context) => {
  // Get auctions where user is owner or admin
  const auctions = await prisma.auction.findMany({
    where: {
      members: {
        some: {
          userId: context.session.user.id,
          role: { in: ["OWNER", "ADMIN"] },
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: { name: "asc" },
  });

  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name ?? null,
        email: context.session.user.email,
        image: context.session.user.image ?? null,
      },
      currencies,
      auctions,
      messages,
    },
  };
});
