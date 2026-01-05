import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { PageLayout, BackLink } from "@/components/common";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { getMessages, Locale } from "@/i18n";
import { useTranslations } from "next-intl";
import { withAuth } from "@/lib/auth/withAuth";

interface CreateAuctionProps {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  allowOpenAuctions: boolean;
}

export default function CreateAuctionPage({
  user,
  allowOpenAuctions,
}: CreateAuctionProps) {
  const router = useRouter();
  const t = useTranslations("auction.create");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { showToast } = useToast();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldErrors({});
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get("name") as string,
      description: (formData.get("description") as string) || undefined,
      joinMode: formData.get("joinMode") as string,
      memberCanInvite: formData.get("memberCanInvite") === "on",
      bidderVisibility: formData.get("bidderVisibility") as string,
      endDate: (formData.get("endDate") as string) || undefined,
      itemEndMode: formData.get("itemEndMode") as string,
    };

    try {
      const res = await fetch("/api/auctions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.errors) {
          setFieldErrors(result.errors);
          showToast(tErrors("auction.createFailed"), "error");
        } else {
          showToast(result.message || tErrors("auction.createFailed"), "error");
        }
      } else {
        showToast(t("createSuccess"), "success");
        router.push(`/auctions/${result.id}`);
      }
    } catch {
      showToast(tErrors("generic"), "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageLayout user={user} maxWidth="2xl">
      <div className="mb-8">
        <BackLink href="/dashboard" label={t("backToDashboard")} />
      </div>

      <div className="card bg-base-100/50 backdrop-blur-sm border border-base-content/5 shadow-xl">
        <div className="card-body p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="icon-[tabler--gavel] size-7"></span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("title")}</h1>
              <p className="text-base-content/60">{t("subtitle")}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-primary">
                <span className="icon-[tabler--info-circle] size-5"></span>
                {t("basicInfo")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="name">
                  <span className="label-text font-medium">
                    {t("auctionName")} *
                  </span>
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder={t("auctionNamePlaceholder")}
                  className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${
                    fieldErrors.name ? "input-error" : ""
                  }`}
                  required
                  maxLength={100}
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
                  placeholder={t("descriptionPlaceholder")}
                  maxLength={500}
                />
              </div>
            </div>

            {/* Access Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-secondary">
                <span className="icon-[tabler--lock] size-5"></span>
                {t("accessSettings")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="joinMode">
                  <span className="label-text font-medium">
                    {t("whoCanJoin")}
                  </span>
                </label>
                <select
                  id="joinMode"
                  name="joinMode"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="INVITE_ONLY"
                >
                  <option value="INVITE_ONLY">{t("inviteOnly")}</option>
                  <option value="LINK">{t("linkAccess")}</option>
                  {allowOpenAuctions && (
                    <option value="FREE">{t("openAccess")}</option>
                  )}
                </select>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-3 p-0">
                  <input
                    type="checkbox"
                    name="memberCanInvite"
                    className="checkbox checkbox-primary"
                  />
                  <span className="label-text">{t("allowMembersInvite")}</span>
                </label>
              </div>
            </div>

            {/* Bidding Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-accent">
                <span className="icon-[tabler--gavel] size-5"></span>
                {t("biddingSettings")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="bidderVisibility">
                  <span className="label-text font-medium">
                    {t("bidderVisibility")}
                  </span>
                </label>
                <select
                  id="bidderVisibility"
                  name="bidderVisibility"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="VISIBLE"
                >
                  <option value="VISIBLE">{t("alwaysVisible")}</option>
                  <option value="ANONYMOUS">{t("alwaysAnonymous")}</option>
                  <option value="PER_BID">{t("perBid")}</option>
                </select>
              </div>
            </div>

            {/* Timing Settings */}
            <div className="divider opacity-50"></div>
            <div className="space-y-4">
              <h2 className="text-lg font-semibold flex items-center gap-2 text-info">
                <span className="icon-[tabler--clock] size-5"></span>
                {t("timing")}
              </h2>

              <div className="form-control">
                <label className="label" htmlFor="endDate">
                  <span className="label-text font-medium">{t("endDate")}</span>
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="datetime-local"
                  className="input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                />
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {t("endDateHint")}
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="label" htmlFor="itemEndMode">
                  <span className="label-text font-medium">
                    {t("itemEndMode")}
                  </span>
                </label>
                <select
                  id="itemEndMode"
                  name="itemEndMode"
                  className="select select-bordered w-full bg-base-100 focus:bg-base-100 transition-colors"
                  defaultValue="CUSTOM"
                >
                  <option value="CUSTOM">{t("itemEndCustom")}</option>
                  <option value="AUCTION_END">{t("itemEndAuction")}</option>
                  <option value="NONE">{t("itemEndNone")}</option>
                </select>
              </div>
            </div>

            {/* Submit */}
            <div className="divider opacity-50"></div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
              <Link
                href="/dashboard"
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

export const getServerSideProps = withAuth(async (context) => {
  const messages = await getMessages(context.locale as Locale);

  return {
    props: {
      user: {
        id: context.session.user.id,
        name: context.session.user.name || null,
        email: context.session.user.email || "",
      },
      allowOpenAuctions: process.env.ALLOW_OPEN_AUCTIONS === "true",
      messages,
    },
  };
});
