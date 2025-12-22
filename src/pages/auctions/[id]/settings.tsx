import { useState } from "react";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import * as auctionService from "@/lib/services/auction.service";
import {
  PageLayout,
  BackLink,
  AlertMessage,
  ConfirmDialog,
} from "@/components/common";
import { ThumbnailUpload } from "@/components/upload/thumbnail-upload";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { getMessages, Locale } from "@/i18n";
import { useConfirmDialog } from "@/hooks/ui";
import { useTranslations } from "next-intl";

interface AuctionSettingsProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  auction: {
    id: string;
    name: string;
    description: string | null;
    joinMode: string;
    memberCanInvite: boolean;
    bidderVisibility: string;
    itemEndMode: string;
    endDate: string | null;
    isEnded: boolean;
    thumbnailUrl: string | null;
  };
  allowOpenAuctions: boolean;
}

export default function AuctionSettingsPage({
  user,
  auction,
  allowOpenAuctions,
}: AuctionSettingsProps) {
  const router = useRouter();
  const t = useTranslations("auction.settings");
  const tCommon = useTranslations("common");
  const tAuction = useTranslations("auction");
  const tCreate = useTranslations("auction.create");
  const tErrors = useTranslations("errors");
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: auction.name,
    description: auction.description || "",
    joinMode: auction.joinMode,
    memberCanInvite: auction.memberCanInvite,
    bidderVisibility: auction.bidderVisibility,
    itemEndMode: auction.itemEndMode,
    endDate: auction.endDate ? auction.endDate.slice(0, 16) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const deleteDialog = useConfirmDialog();
  const endDialog = useConfirmDialog();
  const [isEnded, setIsEnded] = useState(auction.isEnded);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(
    auction.thumbnailUrl,
  );

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          endDate: formData.endDate || null,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.message || t("updateFailed"));
      } else {
        showToast(t("success"), "success");
      }
    } catch {
      setError(tErrors("generic"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/auctions/${auction.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const result = await res.json();
        setError(result.message || t("deleteFailed")); // Assuming key exists or update json
        setIsDeleting(false);
      } else {
        router.push("/dashboard");
      }
    } catch {
      setError(tErrors("generic"));
      setIsDeleting(false);
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
              <span className="icon-[tabler--settings] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-base-content/60">{t("subtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {error && <AlertMessage type="error">{error}</AlertMessage>}

            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="icon-[tabler--info-circle] size-5"></span>
                {t("general")}
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {tCreate("auctionName")}
                  </span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  required
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {tCreate("description")}
                  </span>
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="textarea textarea-bordered w-full h-24 bg-base-100 focus:bg-base-100 transition-colors"
                  placeholder={tCreate("descriptionPlaceholder")}
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t("thumbnail")}
                  </span>
                </label>
                <ThumbnailUpload
                  auctionId={auction.id}
                  currentThumbnail={thumbnailUrl}
                  onThumbnailChange={setThumbnailUrl}
                />
              </div>
            </div>

            {/* Access Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-secondary">
                <span className="icon-[tabler--lock] size-5"></span>
                {t("accessAndBidding")}
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {tCreate("whoCanJoin")}
                  </span>
                </label>
                <select
                  name="joinMode"
                  value={formData.joinMode}
                  onChange={handleChange}
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                >
                  <option value="INVITE_ONLY">{tCreate("inviteOnly")}</option>
                  <option value="LINK">{tCreate("linkAccess")}</option>
                  {allowOpenAuctions && (
                    <option value="FREE">{tCreate("openAccess")}</option>
                  )}
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3 p-0">
                  <input
                    type="checkbox"
                    name="memberCanInvite"
                    checked={formData.memberCanInvite}
                    onChange={handleChange}
                    className="checkbox checkbox-primary"
                  />
                  <div>
                    <span className="label-text font-medium">
                      {tCreate("allowMembersInvite")}
                    </span>
                    <p className="text-xs text-base-content/60">
                      {/* Optional description from create page if any, or just reuse label */}
                    </p>
                  </div>
                </label>
              </div>
            </div>

            {/* Bidding Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-accent">
                <span className="icon-[tabler--gavel] size-5"></span>
                {tCreate("biddingSettings")}
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {tCreate("bidderVisibility")}
                  </span>
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-base-content/10 cursor-pointer hover:bg-base-100 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm">
                    <input
                      type="radio"
                      name="bidderVisibility"
                      value="VISIBLE"
                      checked={formData.bidderVisibility === "VISIBLE"}
                      onChange={handleChange}
                      className="radio radio-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {tCreate("alwaysVisible").split(" - ")[0]}
                      </div>
                      <div className="text-sm text-base-content/60">
                        {tCreate("alwaysVisible").split(" - ")[1]}
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-base-content/10 cursor-pointer hover:bg-base-100 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm">
                    <input
                      type="radio"
                      name="bidderVisibility"
                      value="ANONYMOUS"
                      checked={formData.bidderVisibility === "ANONYMOUS"}
                      onChange={handleChange}
                      className="radio radio-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {tCreate("alwaysAnonymous").split(" - ")[0]}
                      </div>
                      <div className="text-sm text-base-content/60">
                        {tCreate("alwaysAnonymous").split(" - ")[1]}
                      </div>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-3 rounded-xl border border-base-content/10 cursor-pointer hover:bg-base-100 transition-all has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:shadow-sm">
                    <input
                      type="radio"
                      name="bidderVisibility"
                      value="PER_BID"
                      checked={formData.bidderVisibility === "PER_BID"}
                      onChange={handleChange}
                      className="radio radio-primary mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="font-medium">
                        {tCreate("perBid").split(" - ")[0]}
                      </div>
                      <div className="text-sm text-base-content/60">
                        {tCreate("perBid").split(" - ")[1]}
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Timing */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-info">
                <span className="icon-[tabler--clock] size-5"></span>
                {tCreate("timing")}
              </h2>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {tCreate("endDate")}
                  </span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    className="input input-bordered flex-1 bg-base-100 focus:bg-base-100 transition-colors"
                  />
                  {formData.endDate && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({ ...prev, endDate: "" }))
                      }
                      className="btn btn-ghost btn-square"
                      title="Clear end date"
                    >
                      <span className="icon-[tabler--x] size-5"></span>
                    </button>
                  )}
                </div>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {tCreate("endDateHint")}
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {tCreate("itemEndMode")}
                  </span>
                </label>
                <select
                  name="itemEndMode"
                  value={formData.itemEndMode}
                  onChange={handleChange}
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                >
                  {formData.endDate && (
                    <option value="AUCTION_END">
                      {tCreate("itemEndAuction").split(" - ")[0]}
                    </option>
                  )}
                  <option value="CUSTOM">
                    {tCreate("itemEndCustom").split(" - ")[0]}
                  </option>
                  {!formData.endDate && (
                    <option value="NONE">
                      {tCreate("itemEndNone").split(" - ")[0]}
                    </option>
                  )}
                </select>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {/* Add detailed description if available in translation, or leave simplified */}
                  </span>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="divider opacity-50"></div>
            <Button
              type="submit"
              variant="primary"
              modifier="block"
              isLoading={isLoading}
              loadingText={t("saving")}
              className="shadow-lg shadow-primary/20"
              icon={
                <span className="icon-[tabler--device-floppy] size-5"></span>
              }
            >
              {t("save")}
            </Button>
          </form>
        </div>
      </div>

      {/* End Auction Now */}
      {!isEnded && (
        <div className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-warning/30">
          <div className="card-body p-8">
            <h2 className="card-title text-warning flex items-center gap-2">
              <span className="icon-[tabler--clock-off] size-6"></span>
              {t("endAuction")}
            </h2>

            <p className="text-base-content/60 text-sm">
              {t("endDescription")}
            </p>

            {!endDialog.isOpen ? (
              <button
                onClick={endDialog.open}
                className="btn btn-warning btn-outline mt-4 border-warning/50 hover:bg-warning hover:border-warning"
              >
                <span className="icon-[tabler--clock-off] size-5"></span>
                {t("endButton")}
              </button>
            ) : (
              <ConfirmDialog
                isOpen={endDialog.isOpen}
                title={t("confirmEnd")}
                message="" // Optional or reuse description
                confirmLabel={t("endButton")}
                variant="warning"
                isLoading={isEnding}
                onConfirm={async () => {
                  setIsEnding(true);
                  setError(null);
                  try {
                    const res = await fetch(
                      `/api/auctions/${auction.id}/close`,
                      { method: "POST" },
                    );
                    if (!res.ok) {
                      const result = await res.json();
                      setError(result.message || "Failed to end auction");
                    } else {
                      setIsEnded(true);
                      endDialog.close();
                      showToast(t("endedSuccess"), "success");
                    }
                  } catch {
                    setError(tErrors("generic"));
                  } finally {
                    setIsEnding(false);
                  }
                }}
                onCancel={endDialog.close}
              />
            )}
          </div>
        </div>
      )}

      {isEnded && (
        <div className="alert alert-info mt-8 shadow-sm">
          <span className="icon-[tabler--info-circle] size-5"></span>
          <span>
            {t("endedMessage")}{" "}
            <a
              href={`/auctions/${auction.id}/results`}
              className="link font-bold"
            >
              {t("viewResults")}
            </a>
          </span>
        </div>
      )}

      {/* Danger Zone */}
      <div className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-error/30">
        <div className="card-body p-8">
          <h2 className="card-title text-error flex items-center gap-2">
            <span className="icon-[tabler--alert-triangle] size-6"></span>
            {t("dangerZone")}
          </h2>

          <p className="text-base-content/60 text-sm">{t("deleteWarning")}</p>

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
              title={t("confirmDelete", { name: auction.name })}
              confirmLabel={tCommon("delete")}
              variant="error"
              isLoading={isDeleting}
              onConfirm={handleDelete}
              onCancel={deleteDialog.close}
            />
          )}
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

  // Check if user is owner
  const membership = await auctionService.getUserMembership(
    auctionId,
    session.user.id,
  );

  if (!membership || !auctionService.isOwner(membership)) {
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
        description: auction.description,
        joinMode: auction.joinMode,
        memberCanInvite: auction.memberCanInvite,
        bidderVisibility: auction.bidderVisibility,
        itemEndMode: auction.itemEndMode,
        endDate: auction.endDate,
        isEnded: auction.endDate
          ? new Date(auction.endDate) < new Date()
          : false,
        thumbnailUrl: auction.thumbnailUrl,
      },
      allowOpenAuctions: process.env.ALLOW_OPEN_AUCTIONS === "true",
      messages: await getMessages(context.locale as Locale),
    },
  };
};
