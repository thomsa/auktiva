import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink, AlertMessage } from "@/components/common";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface CreateItemProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    bidderVisibility: string;
    itemEndMode: string;
    endDate: string | null;
  };
  currencies: Currency[];
}

export default function CreateItemPage({
  user,
  auction,
  currencies,
}: CreateItemProps) {
  const router = useRouter();
  const t = useTranslations("item.create");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tAuction = useTranslations("auction"); // For 'backTo' if needed or re-use common back
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showEndDate, setShowEndDate] = useState(
    auction.itemEndMode === "CUSTOM",
  );

  useEffect(() => {
    setShowEndDate(auction.itemEndMode === "CUSTOM");
  }, [auction.itemEndMode]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      currencyCode: formData.get("currencyCode") as string,
      startingBid: parseFloat(formData.get("startingBid") as string) || 0,
      minBidIncrement:
        parseFloat(formData.get("minBidIncrement") as string) || 1,
      bidderAnonymous: formData.get("bidderAnonymous") === "on",
      endDate: (formData.get("endDate") as string) || undefined,
    };

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
        } else {
          setError(result.message || tErrors("item.createFailed"));
        }
      } else {
        router.push(`/auctions/${auction.id}/items/${result.id}`);
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-8">
        <BackLink
          href={`/auctions/${auction.id}`}
          label={tAuction("invite.backTo", { name: auction.name })}
        />
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--package] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-base-content/60">
                {t("subtitle")}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && <AlertMessage type="error">{error}</AlertMessage>}

            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="icon-[tabler--info-circle] size-5"></span>
                {tAuction("create.basicInfo")} {/* Reusing from auction.create.basicInfo if appropriate or create new key */}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="name">
                  <span className="label-text font-medium">{t("itemName")} *</span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("itemNamePlaceholder")}
                  className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${fieldErrors.name ? "input-error" : ""}`}
                  required
                />
                {fieldErrors.name && (
                  <label className="label">
                    <span className="label-text-alt text-error">
                      {fieldErrors.name}
                    </span>
                  </label>
                )}
              </div>

              <div className="form-control">
                <label className="label" htmlFor="description">
                  <span className="label-text font-medium">{t("description")}</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  placeholder={t("descriptionPlaceholder")}
                  className="textarea textarea-bordered w-full h-32 bg-base-100 focus:bg-base-100 transition-colors"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-secondary">
                <span className="icon-[tabler--currency-dollar] size-5"></span>
                Pricing
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="currencyCode">
                  <span className="label-text font-medium">{t("currency")} *</span>
                </label>
                <select
                  id="currencyCode"
                  name="currencyCode"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="USD"
                  required
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label" htmlFor="startingBid">
                    <span className="label-text font-medium">{t("startingBid")}</span>
                  </label>
                  <input
                    id="startingBid"
                    name="startingBid"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue="0"
                    className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${fieldErrors.startingBid ? "input-error" : ""}`}
                  />
                  {fieldErrors.startingBid && (
                    <label className="label">
                      <span className="label-text-alt text-error">
                        {fieldErrors.startingBid}
                      </span>
                    </label>
                  )}
                </div>

                <div className="form-control">
                  <label className="label" htmlFor="minBidIncrement">
                    <span className="label-text font-medium">
                      {t("minBidIncrement")}
                    </span>
                  </label>
                  <input
                    id="minBidIncrement"
                    name="minBidIncrement"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue="1"
                    className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Visibility - deprecated, kept for backwards compatibility */}
            {false && auction.bidderVisibility === "ITEM_CHOICE" && (
              <>
                <div className="divider opacity-50"></div>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-accent">
                    <span className="icon-[tabler--eye] size-5"></span>
                    {tAuction("create.biddingSettings")}
                  </h2>

                  <div className="form-control">
                    <label className="label cursor-pointer justify-start gap-3 p-0">
                      <input
                        type="checkbox"
                        name="bidderAnonymous"
                        className="checkbox checkbox-primary"
                      />
                      <div>
                        <span className="label-text font-medium">
                          {tAuction("create.alwaysAnonymous")}
                        </span>
                        <p className="text-xs text-base-content/60">
                          Hide bidder names for this item
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Timing */}
            {showEndDate && (
              <>
                <div className="divider opacity-50"></div>
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-info">
                    <span className="icon-[tabler--clock] size-5"></span>
                    {tAuction("create.timing")}
                  </h2>

                  <div className="form-control">
                    <label className="label" htmlFor="endDate">
                      <span className="label-text font-medium">
                        {t("endDate")}
                      </span>
                    </label>
                    <input
                      id="endDate"
                      name="endDate"
                      type="datetime-local"
                      className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                    />
                    <label className="label">
                      <span className="label-text-alt text-base-content/60">
                        {tAuction("create.endDateHint")}
                      </span>
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Submit */}
            <div className="divider opacity-50"></div>
            <div className="flex gap-4 pt-4">
              <Link
                href={`/auctions/${auction.id}`}
                className="btn btn-ghost flex-1"
              >
                {tCommon("cancel")}
              </Link>
              <Button
                type="submit"
                variant="primary"
                className="flex-1 shadow-lg shadow-primary/20"
                isLoading={isLoading}
                loadingText={t("submitting")}
                icon={<span className="icon-[tabler--plus] size-5"></span>}
              >
                {t("submitButton")}
              </Button>
            </div>
          </form>
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

  // Check membership and permission
  const membership = await prisma.auctionMember.findUnique({
    where: {
      auctionId_userId: {
        auctionId,
        userId: session.user.id,
      },
    },
  });

  if (!membership) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  // Only OWNER, ADMIN, or CREATOR can add items
  if (!["OWNER", "ADMIN", "CREATOR"].includes(membership.role)) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    select: {
      id: true,
      name: true,
      bidderVisibility: true,
      itemEndMode: true,
      endDate: true,
    },
  });

  if (!auction) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  return {
    props: {
      user: {
        id: session.user.id,
        name: session.user.name || null,
        email: session.user.email || "",
      },
      auction: {
        ...auction,
        endDate: auction.endDate?.toISOString() || null,
      },
      currencies,
      messages: await getMessages(context.locale as Locale),
    },
  };
};
