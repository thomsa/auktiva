import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as auctionService from "@/lib/services/auction.service";
import * as itemService from "@/lib/services/item.service";
import { PageLayout, BackLink, ConfirmDialog } from "@/components/common";
import { ImageUpload } from "@/components/upload/image-upload";
import { Button } from "@/components/ui/button";
import { useConfirmDialog } from "@/hooks/ui";
import { useToast } from "@/components/ui/toast";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";

interface Currency {
  code: string;
  name: string;
  symbol: string;
}

interface ItemImage {
  id: string;
  url: string;
  publicUrl: string;
  order: number;
}

interface EditItemProps {
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
  item: {
    id: string;
    name: string;
    description: string | null;
    currencyCode: string;
    startingBid: number;
    minBidIncrement: number;
    bidderAnonymous: boolean;
    endDate: string | null;
    currentBid: number | null;
  };
  currencies: Currency[];
  hasBids: boolean;
  images: ItemImage[];
}

export default function EditItemPage({
  user,
  auction,
  item,
  currencies,
  hasBids,
  images: initialImages,
}: EditItemProps) {
  const router = useRouter();
  const t = useTranslations("item.edit");
  const tCreate = useTranslations("item.create");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const tAuction = useTranslations("auction");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();
  const [images, setImages] = useState<ItemImage[]>(initialImages);
  const [isEnding, setIsEnding] = useState(false);
  const deleteDialog = useConfirmDialog();
  const endDialog = useConfirmDialog();
  const [itemEndDate, setItemEndDate] = useState(
    item.endDate ? item.endDate.slice(0, 16) : "",
  );

  const isItemEnded = !!(item.endDate && new Date(item.endDate) < new Date());
  const auctionHasEndDate = !!auction.endDate;
  const canSetCustomEndDate = auction.itemEndMode === "CUSTOM";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || null,
      currencyCode: formData.get("currencyCode") as string,
      startingBid: parseFloat(formData.get("startingBid") as string) || 0,
      minBidIncrement:
        parseFloat(formData.get("minBidIncrement") as string) || 1,
      bidderAnonymous: formData.get("bidderAnonymous") === "on",
      endDate: (formData.get("endDate") as string) || null,
    };

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
          showToast(tErrors("item.updateFailed"), "error");
        } else {
          showToast(result.message || tErrors("item.updateFailed"), "error");
        }
      } else {
        showToast(t("updateSuccess"), "success");
        router.push(`/auctions/${auction.id}/items/${item.id}`);
      }
    } catch {
      showToast(tErrors("generic"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items/${item.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        showToast(data.message || tErrors("item.deleteFailed"), "error");
      } else {
        showToast(t("deleteSuccess"), "success");
        router.push(`/auctions/${auction.id}`);
      }
    } catch {
      showToast(tErrors("generic"), "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEndNow = async () => {
    setIsEnding(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}/items/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: new Date().toISOString() }),
      });

      if (!res.ok) {
        const result = await res.json();
        showToast(result.message || tErrors("item.updateFailed"), "error");
        setIsEnding(false);
        endDialog.close();
      } else {
        showToast(t("endNowSuccess"), "success");
        router.push(`/auctions/${auction.id}/items/${item.id}`);
      }
    } catch {
      showToast(tErrors("generic"), "error");
      setIsEnding(false);
      endDialog.close();
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-8">
        <BackLink
          href={`/auctions/${auction.id}/items/${item.id}`}
          label={tCommon("back")}
        />
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--edit] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-base-content/60">{t("subtitle")}</p>
            </div>
          </div>

          {hasBids && (
            <div className="alert alert-warning mb-6 shadow-sm">
              <span className="icon-[tabler--alert-triangle] size-5"></span>
              <span>{t("hasBidsWarning")}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="icon-[tabler--package] size-5"></span>
                {tCreate("basicInfo")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="name">
                  <span className="label-text font-medium">
                    {tCreate("itemName")} *
                  </span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  defaultValue={item.name}
                  placeholder={tCreate("itemNamePlaceholder")}
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
                  <span className="label-text font-medium">
                    {tCreate("description")}
                  </span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  defaultValue={item.description || ""}
                  placeholder={tCreate("descriptionPlaceholder")}
                  className="textarea textarea-bordered w-full h-32 bg-base-100 focus:bg-base-100 transition-colors"
                />
              </div>
            </div>

            {/* Images */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-accent">
                <span className="icon-[tabler--photo] size-5"></span>
                {tCreate("images")}
              </h2>
              <ImageUpload
                auctionId={auction.id}
                itemId={item.id}
                images={images}
                onImagesChange={setImages}
              />
            </div>

            {/* Pricing */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-secondary">
                <span className="icon-[tabler--currency-dollar] size-5"></span>
                {tCreate("pricing")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="currencyCode">
                  <span className="label-text font-medium">
                    {tCreate("currency")} *
                  </span>
                </label>
                <select
                  id="currencyCode"
                  name="currencyCode"
                  defaultValue={item.currencyCode}
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  required
                  disabled={hasBids}
                >
                  {currencies.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.name} ({currency.symbol})
                    </option>
                  ))}
                </select>
                {hasBids && (
                  <label className="label">
                    <span className="label-text-alt text-warning">
                      Cannot change currency after bids have been placed
                    </span>
                  </label>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label" htmlFor="startingBid">
                    <span className="label-text font-medium">
                      {tCreate("startingBid")}
                    </span>
                  </label>
                  <input
                    id="startingBid"
                    name="startingBid"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={item.startingBid}
                    className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${fieldErrors.startingBid ? "input-error" : ""}`}
                    disabled={hasBids}
                  />
                  {hasBids && (
                    <label className="label">
                      <span className="label-text-alt text-warning">
                        Cannot change starting bid after bids have been placed
                      </span>
                    </label>
                  )}
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
                      {tCreate("minBidIncrement")}
                    </span>
                  </label>
                  <input
                    id="minBidIncrement"
                    name="minBidIncrement"
                    type="number"
                    min="0.01"
                    step="0.01"
                    defaultValue={item.minBidIncrement}
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
                        defaultChecked={item.bidderAnonymous}
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
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-info">
                <span className="icon-[tabler--clock] size-5"></span>
                {tAuction("create.timing")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="endDate">
                  <span className="label-text font-medium">
                    {tCreate("endDate")}
                  </span>
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  value={itemEndDate}
                  onChange={(e) => setItemEndDate(e.target.value)}
                  className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  disabled={!canSetCustomEndDate}
                />
                {canSetCustomEndDate ? (
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      {tAuction("create.endDateHint")}
                    </span>
                  </label>
                ) : (
                  <div className="mt-2 text-xs text-base-content/60 flex items-center gap-1.5">
                    <span className="icon-[tabler--info-circle] size-4"></span>
                    <span>
                      {auctionHasEndDate
                        ? "Items end when the auction ends"
                        : "Items have no end date"}
                      {" (auction setting)."}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <div className="divider opacity-50"></div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Link
                href={`/auctions/${auction.id}/items/${item.id}`}
                className="btn btn-ghost w-full sm:flex-1"
              >
                {tCommon("cancel")}
              </Link>
              <Button
                type="submit"
                variant="primary"
                className="w-full sm:flex-1 shadow-lg shadow-primary/20"
                isLoading={isLoading}
                loadingText={t("saving")}
                icon={
                  <span className="icon-[tabler--device-floppy] size-5"></span>
                }
              >
                {t("save")}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* End Item Section - Only show if custom end dates are allowed */}
      {!isItemEnded && canSetCustomEndDate && (
        <div className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-warning/30">
          <div className="card-body p-8">
            <h2 className="card-title text-warning flex items-center gap-2">
              <span className="icon-[tabler--clock-stop] size-6"></span>
              {t("endItem")}
            </h2>

            <p className="text-base-content/60 text-sm">
              {t("endDescription")}
            </p>

            {!endDialog.isOpen ? (
              <button
                onClick={endDialog.open}
                className="btn btn-warning btn-outline mt-4 border-warning/50 hover:bg-warning hover:border-warning"
              >
                <span className="icon-[tabler--flag-filled] size-5"></span>
                {t("endButton")}
              </button>
            ) : (
              <ConfirmDialog
                isOpen={endDialog.isOpen}
                title={t("confirmEnd", { name: item.name })}
                message={
                  hasBids ? t("endMessageWithBids") : t("endMessageNoBids")
                }
                confirmLabel={t("endButton")}
                variant="warning"
                isLoading={isEnding}
                onConfirm={handleEndNow}
                onCancel={endDialog.close}
              />
            )}
          </div>
        </div>
      )}

      {/* Item Already Ended Notice */}
      {isItemEnded && (
        <div className="alert alert-info mt-8 shadow-sm">
          <span className="icon-[tabler--flag-filled] size-5"></span>
          <span>{t("endedMessage")}</span>
        </div>
      )}

      {/* Danger Zone */}
      {!hasBids && (
        <div className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-error/30">
          <div className="card-body p-8">
            <h2 className="card-title text-error flex items-center gap-2">
              <span className="icon-[tabler--alert-triangle] size-6"></span>
              {t("dangerZone")}
            </h2>

            <p className="text-base-content/60 text-sm">
              {t("deleteDescription")}
            </p>

            {!deleteDialog.isOpen ? (
              <button
                onClick={deleteDialog.open}
                className="btn btn-error btn-outline mt-4 border-error/50 hover:bg-error hover:border-error"
              >
                <span className="icon-[tabler--trash] size-5"></span>
                {t("delete")}
              </button>
            ) : (
              <ConfirmDialog
                isOpen={deleteDialog.isOpen}
                title={t("confirmDelete", { name: item.name })}
                confirmLabel={tCommon("delete")}
                variant="error"
                isLoading={isDeleting}
                onConfirm={handleDelete}
                onCancel={deleteDialog.close}
              />
            )}
          </div>
        </div>
      )}

      {hasBids && (
        <div className="alert alert-info mt-8 shadow-sm">
          <span className="icon-[tabler--info-circle] size-5"></span>
          <span>{t("cannotDeleteWithBids")}</span>
        </div>
      )}
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
  const itemId = context.params?.itemId as string;

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

  // Get item for edit page
  const editData = await itemService.getItemForEditPage(
    itemId,
    auctionId,
    session.user.id,
    auctionService.isAdmin(membership),
  );

  if (!editData) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
        permanent: false,
      },
    };
  }

  // Check edit permission
  if (!editData.canEdit) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}/items/${itemId}`,
        permanent: false,
      },
    };
  }

  const auction = await auctionService.getAuctionForDetailPage(auctionId);

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
        id: auction.id,
        name: auction.name,
        bidderVisibility: auction.bidderVisibility,
        itemEndMode: auction.itemEndMode,
        endDate: auction.endDate,
      },
      item: editData.item,
      currencies,
      hasBids: editData.hasBids,
      images: editData.images,
      messages: await getMessages(context.locale as Locale),
    },
  };
};
