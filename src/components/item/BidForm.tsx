import { useForm } from "react-hook-form";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/common";
import { useToast } from "@/components/ui/toast";
import { calculateMinBid } from "@/utils/auction-helpers";
import { useFormatters } from "@/i18n";

interface BidFormData {
  amount: number;
  isAnonymous?: boolean;
}

interface BidFormProps {
  item: {
    id: string;
    currentBid: number | null;
    startingBid: number;
    minBidIncrement: number;
    endDate: string | null;
    highestBidderId: string | null;
    currency: {
      symbol: string;
      name: string;
    };
  };
  auctionId: string;
  bidderVisibility: string;
  userId: string;
  isItemOwner: boolean;
  isEnded: boolean;
  onBidPlaced: () => Promise<void>;
}

export function BidForm({
  item,
  auctionId,
  bidderVisibility,
  userId,
  isItemOwner,
  isEnded,
  onBidPlaced,
}: BidFormProps) {
  const t = useTranslations("item.bid");
  const tStatus = useTranslations("status");
  const tErrors = useTranslations("errors");
  const tTime = useTranslations("time");
  const { formatDate } = useFormatters();
  const { showToast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, errors },
    setError,
  } = useForm<BidFormData>();

  const minBid = calculateMinBid(
    item.currentBid,
    item.startingBid,
    item.minBidIncrement,
  );
  const isHighestBidder = item.highestBidderId === userId;
  const canBid = !isItemOwner && !isEnded;

  const onSubmit = async (data: BidFormData) => {
    if (data.amount < minBid) {
      setError("amount", {
        message: tErrors("validation.minBid", {
          symbol: item.currency.symbol,
          amount: minBid.toFixed(2),
        }),
      });
      return;
    }

    try {
      const res = await fetch(
        `/api/auctions/${auctionId}/items/${item.id}/bids`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: data.amount,
            isAnonymous:
              bidderVisibility === "PER_BID" ? data.isAnonymous : undefined,
          }),
        },
      );

      const result = await res.json();

      if (!res.ok) {
        showToast(result.message || tErrors("bid.placeFailed"), "error");
      } else {
        await onBidPlaced();
        reset();
        showToast(t("bidPlaced"), "success");
      }
    } catch {
      showToast(tErrors("generic"), "error");
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl sticky top-24">
      <div className="card-body">
        <h2 className="card-title">
          <span className="icon-[tabler--gavel] size-6"></span>
          {t("title")}
        </h2>

        <div className="bg-base-200 rounded-lg p-4 my-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-base-content/60">
              {t("currentBid")}
            </span>
            {!isEnded && (
              <span className="text-xs text-base-content/40">
                <span className="icon-[tabler--refresh] size-3 inline mr-1 animate-spin"></span>
                {tStatus("live")}
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            {item.currency.symbol}
            {(item.currentBid || item.startingBid).toFixed(2)}
          </div>
          {item.currentBid && (
            <div className="text-sm text-base-content/60 mt-1">
              {t("startingBid")}: {item.currency.symbol}
              {item.startingBid.toFixed(2)}
            </div>
          )}
        </div>

        {isHighestBidder && (
          <AlertMessage type="success" className="mb-4">
            {t("highestBidder")}
          </AlertMessage>
        )}

        {item.endDate && (
          <div className="text-sm text-base-content/60 mb-4">
            <span className="icon-[tabler--clock] size-4 inline mr-1"></span>
            {isEnded ? tTime("ended") : tTime("endsAt")}:{" "}
            {formatDate(item.endDate)}
          </div>
        )}

        {errors.root && (
          <AlertMessage type="error" className="mb-4">
            {errors.root.message}
          </AlertMessage>
        )}

        {canBid ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t("yourBid")}</span>
                <span className="label-text-alt">
                  {t("minBid")}: {item.currency.symbol}
                  {minBid.toFixed(2)}
                </span>
              </label>
              <div className="input">
                <input
                  type="number"
                  {...register("amount", { valueAsNumber: true })}
                  placeholder={minBid.toFixed(2)}
                  min={minBid}
                  step="0.01"
                  required
                />
                <span className="label">{item.currency.symbol}</span>
              </div>
              {errors.amount && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {errors.amount.message}
                  </span>
                </label>
              )}
            </div>

            {bidderVisibility === "PER_BID" && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("isAnonymous")}
                  className="checkbox checkbox-sm"
                />
                <div className="flex items-center gap-1">
                  <span className="text-sm">{t("bidAsAnonymous")}</span>
                  <div
                    className="tooltip tooltip-left"
                    data-tip={t("anonymousTooltip")}
                  >
                    <span className="icon-[tabler--info-circle] size-4 text-base-content/50"></span>
                  </div>
                </div>
              </label>
            )}

            <Button
              type="submit"
              variant="primary"
              modifier="block"
              isLoading={isSubmitting}
              loadingText={t("placingBid")}
              icon={<span className="icon-[tabler--gavel] size-5"></span>}
            >
              {t("placeBid")}
            </Button>
          </form>
        ) : isEnded ? (
          <div className="text-center py-4 text-base-content/60">
            {t("biddingEnded")}
          </div>
        ) : isItemOwner ? (
          <AlertMessage type="info">{t("cannotBidOwn")}</AlertMessage>
        ) : (
          <div className="text-center py-4 text-base-content/60">
            {t("cannotBid")}
          </div>
        )}

        <div className="divider"></div>

        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("currency")}</span>
            <span>{item.currency.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">{t("minIncrement")}</span>
            <span>
              {item.currency.symbol}
              {item.minBidIncrement.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
