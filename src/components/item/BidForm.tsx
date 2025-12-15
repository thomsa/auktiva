import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { AlertMessage } from "@/components/common";
import { calculateMinBid } from "@/utils/auction-helpers";
import { formatDate } from "@/utils/formatters";

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
        message: `Minimum bid is ${item.currency.symbol}${minBid.toFixed(2)}`,
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
        setError("root", { message: result.message || "Failed to place bid" });
      } else {
        await onBidPlaced();
        reset();
      }
    } catch {
      setError("root", { message: "An error occurred. Please try again." });
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl sticky top-24">
      <div className="card-body">
        <h2 className="card-title">
          <span className="icon-[tabler--gavel] size-6"></span>
          Place Bid
        </h2>

        <div className="bg-base-200 rounded-lg p-4 my-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-base-content/60">Current Bid</span>
            {!isEnded && (
              <span className="text-xs text-base-content/40">
                <span className="icon-[tabler--refresh] size-3 inline mr-1 animate-spin"></span>
                Live
              </span>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            {item.currency.symbol}
            {(item.currentBid || item.startingBid).toFixed(2)}
          </div>
          {item.currentBid && (
            <div className="text-sm text-base-content/60 mt-1">
              Starting: {item.currency.symbol}
              {item.startingBid.toFixed(2)}
            </div>
          )}
        </div>

        {isHighestBidder && (
          <AlertMessage type="success" className="mb-4">
            You&apos;re the highest bidder!
          </AlertMessage>
        )}

        {item.endDate && (
          <div className="text-sm text-base-content/60 mb-4">
            <span className="icon-[tabler--clock] size-4 inline mr-1"></span>
            {isEnded ? "Ended" : "Ends"}: {formatDate(item.endDate)}
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
                <span className="label-text">Your Bid</span>
                <span className="label-text-alt">
                  Min: {item.currency.symbol}
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
                  <span className="text-sm">Bid as anonymous</span>
                  <div
                    className="tooltip tooltip-left"
                    data-tip="Your name will be hidden from other bidders. The item owner will still see your details."
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
              loadingText="Placing Bid..."
              icon={<span className="icon-[tabler--gavel] size-5"></span>}
            >
              Place Bid
            </Button>
          </form>
        ) : isEnded ? (
          <div className="text-center py-4 text-base-content/60">
            This item&apos;s bidding has ended.
          </div>
        ) : isItemOwner ? (
          <AlertMessage type="info">
            You cannot bid on your own item.
          </AlertMessage>
        ) : (
          <div className="text-center py-4 text-base-content/60">
            You cannot bid on this item.
          </div>
        )}

        <div className="divider"></div>

        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-base-content/60">Currency</span>
            <span>{item.currency.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-base-content/60">Min Increment</span>
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
