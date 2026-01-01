import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as auctionService from "@/lib/services/auction.service";
import { prisma } from "@/lib/prisma";
import { PageLayout, BackLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ImageUpload } from "@/components/upload/image-upload";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
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

interface UploadedImage {
  id: string;
  url: string;
  publicUrl: string;
  order: number;
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
  const tAuction = useTranslations("auction");
  const { showToast } = useToast();

  // Wizard state
  const [step, setStep] = useState(1);
  const [createdItemId, setCreatedItemId] = useState<string | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);

  // Form state
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Publish modal state
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [canPublish, setCanPublish] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Track item data for publish validation
  const [itemData, setItemData] = useState<{
    name: string;
    description?: string;
    currencyCode: string;
    startingBid: number;
    minBidIncrement: number;
  } | null>(null);
  const [showEndDate, setShowEndDate] = useState(
    auction.itemEndMode === "CUSTOM",
  );

  useEffect(() => {
    setShowEndDate(auction.itemEndMode === "CUSTOM");
  }, [auction.itemEndMode]);

  // Step 1: Create item and move to step 2
  const handleCreateItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
          showToast(tErrors("item.createFailed"), "error");
        } else {
          showToast(result.message || tErrors("item.createFailed"), "error");
        }
      } else {
        // Item created, move to step 2
        setCreatedItemId(result.id);
        setItemData(data);
        setStep(2);
        showToast(t("createSuccess"), "success");
      }
    } catch {
      showToast(tErrors("generic"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Check if item has all required data for publishing
  const checkCanPublish = () => {
    if (!itemData) return false;
    const hasName = !!itemData.name?.trim();
    const hasDescription = !!itemData.description?.trim();
    const hasCurrency = !!itemData.currencyCode;
    const hasPrice = itemData.startingBid >= 0;
    const hasIncrement = itemData.minBidIncrement > 0;
    const hasImages = images.length > 0;
    return (
      hasName &&
      hasDescription &&
      hasCurrency &&
      hasPrice &&
      hasIncrement &&
      hasImages
    );
  };

  // Step 2: Finish - show publish modal
  const handleFinish = () => {
    const publishable = checkCanPublish();
    setCanPublish(publishable);
    setShowPublishModal(true);
  };

  // Skip images - show modal (will always be "cannot publish" since no images)
  const handleSkipImages = () => {
    setCanPublish(false);
    setShowPublishModal(true);
  };

  // Publish the item and redirect
  const handlePublish = async () => {
    if (!createdItemId) return;
    setIsPublishing(true);

    try {
      const res = await fetch(
        `/api/auctions/${auction.id}/items/${createdItemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: true }),
        },
      );

      if (!res.ok) {
        const result = await res.json();
        showToast(result.message || tErrors("item.updateFailed"), "error");
      } else {
        showToast(t("publishSuccess"), "success");
        router.push(`/auctions/${auction.id}/items/${createdItemId}`);
      }
    } catch {
      showToast(tErrors("generic"), "error");
    } finally {
      setIsPublishing(false);
    }
  };

  // Don't publish, just redirect
  const handleDontPublish = () => {
    router.push(`/auctions/${auction.id}/items/${createdItemId}`);
  };

  // Reset form to create another item
  const handleCreateAnother = () => {
    setStep(1);
    setCreatedItemId(null);
    setImages([]);
    setItemData(null);
    setFieldErrors({});
    setShowPublishModal(false);
    setCanPublish(false);
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-8">
        <BackLink
          href={`/auctions/${auction.id}`}
          label={tAuction("invite.backTo", { name: auction.name })}
        />
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center mb-8">
        <ul className="steps steps-horizontal">
          <li className={`step ${step >= 1 ? "step-primary" : ""}`}>
            {t("step1Title")}
          </li>
          <li className={`step ${step >= 2 ? "step-primary" : ""}`}>
            {t("step2Title")}
          </li>
        </ul>
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-8">
          {/* Step 1: Item Details */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <span className="icon-[tabler--package] size-7"></span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t("title")}</h1>
                  <p className="text-base-content/60">{t("subtitle")}</p>
                </div>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                    <span className="icon-[tabler--info-circle] size-5"></span>
                    {tAuction("create.basicInfo")}{" "}
                    {/* Reusing from auction.create.basicInfo if appropriate or create new key */}
                  </h2>

                  <div className="form-control">
                    <label className="label" htmlFor="name">
                      <span className="label-text font-medium">
                        {t("itemName")} *
                      </span>
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder={t("itemNamePlaceholder")}
                      className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${
                        fieldErrors.name ? "input-error" : ""
                      }`}
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
                        {t("description")}
                      </span>
                    </label>
                    <RichTextEditor
                      id="description"
                      name="description"
                      maxLength={500}
                      placeholder={t("descriptionPlaceholder")}
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
                      <span className="label-text font-medium">
                        {t("currency")} *
                      </span>
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
                        <span className="label-text font-medium">
                          {t("startingBid")}
                        </span>
                      </label>
                      <input
                        id="startingBid"
                        name="startingBid"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue="0"
                        className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${
                          fieldErrors.startingBid ? "input-error" : ""
                        }`}
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
                              {tAuction("create.hideBidderNamesDescription")}
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
                <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="btn btn-ghost w-full sm:flex-1"
                  >
                    {tCommon("cancel")}
                  </Link>
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full sm:flex-1 shadow-lg shadow-primary/20"
                    isLoading={isLoading}
                    loadingText={t("submitting")}
                    icon={
                      <span className="icon-[tabler--arrow-right] size-5"></span>
                    }
                  >
                    {t("nextStep")}
                  </Button>
                </div>
              </form>
            </>
          )}

          {/* Step 2: Image Upload */}
          {step === 2 && createdItemId && (
            <>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                  <span className="icon-[tabler--photo] size-7"></span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t("step2Heading")}</h1>
                  <p className="text-base-content/60">{t("step2Subtitle")}</p>
                </div>
              </div>

              <ImageUpload
                auctionId={auction.id}
                itemId={createdItemId}
                images={images}
                onImagesChange={setImages}
                maxImages={10}
              />

              <div className="divider opacity-50 mt-8"></div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
                <button
                  type="button"
                  className="btn btn-ghost w-full sm:flex-1"
                  onClick={handleSkipImages}
                >
                  {t("skipImages")}
                </button>
                <button
                  type="button"
                  className="btn btn-outline btn-secondary w-full sm:flex-1"
                  onClick={handleCreateAnother}
                >
                  <span className="icon-[tabler--plus] size-5"></span>
                  {t("createAnother")}
                </button>
                <Button
                  type="button"
                  variant="primary"
                  className="w-full sm:flex-1 shadow-lg shadow-primary/20"
                  onClick={handleFinish}
                  icon={<span className="icon-[tabler--check] size-5"></span>}
                >
                  {t("finishButton")}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Publish Modal */}
      {showPublishModal && (
        <div className="modal modal-open">
          <div className="modal-box">
            <div className="flex items-center gap-3 mb-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  canPublish
                    ? "bg-success/10 text-success"
                    : "bg-warning/10 text-warning"
                }`}
              >
                <span
                  className={`${canPublish ? "icon-[tabler--eye]" : "icon-[tabler--eye-off]"} size-7`}
                ></span>
              </div>
              <div>
                <h3 className="text-lg font-bold">
                  {canPublish ? t("publishModalTitle") : t("draftModalTitle")}
                </h3>
              </div>
            </div>

            <p className="text-base-content/70 mb-6">
              {canPublish ? t("publishModalMessage") : t("draftModalMessage")}
            </p>

            <div className="modal-action flex-wrap gap-2">
              {canPublish ? (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={handleDontPublish}
                    disabled={isPublishing}
                  >
                    {t("dontPublishYet")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline btn-secondary"
                    onClick={handleCreateAnother}
                    disabled={isPublishing}
                  >
                    <span className="icon-[tabler--plus] size-4"></span>
                    {t("createAnother")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handlePublish}
                    disabled={isPublishing}
                  >
                    {isPublishing ? (
                      <span className="loading loading-spinner loading-sm"></span>
                    ) : (
                      <>
                        <span className="icon-[tabler--eye] size-5"></span>
                        {t("publishNow")}
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-outline btn-secondary"
                    onClick={handleCreateAnother}
                  >
                    <span className="icon-[tabler--plus] size-4"></span>
                    {t("createAnother")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleDontPublish}
                  >
                    {tCommon("ok")}
                  </button>
                </>
              )}
            </div>
          </div>
          <div
            className="modal-backdrop bg-base-content/20"
            onClick={() => !isPublishing && setShowPublishModal(false)}
          ></div>
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

  // Check membership and permission
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

  // Only OWNER, ADMIN, or CREATOR can add items
  if (!auctionService.canCreateItems(membership)) {
    return {
      redirect: {
        destination: `/auctions/${auctionId}`,
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
      currencies,
      messages: await getMessages(context.locale as Locale),
    },
  };
};
