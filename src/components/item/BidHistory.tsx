import { useTranslations } from "next-intl";
import { useFormatters } from "@/i18n";

interface Bid {
  id: string;
  amount: number;
  createdAt: string;
  isAnonymous: boolean;
  user: {
    id: string;
    name: string | null;
  } | null;
}

interface BidHistoryProps {
  bids: Bid[];
  currencySymbol: string;
}

export function BidHistory({ bids, currencySymbol }: BidHistoryProps) {
  const t = useTranslations("item.history");
  const { formatDate } = useFormatters();

  const formatCurrency = (amount: number, symbol: string) => {
    return `${symbol}${amount.toFixed(2)}`;
  };

  return (
    <div>
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <span className="icon-[tabler--history] size-5"></span>
        {t("title")} ({bids.length})
      </h2>

      {bids.length === 0 ? (
        <p className="text-base-content/60 text-center py-8">
          {t("noBids")}
        </p>
      ) : (
        <div className="space-y-2">
          {bids.map((bid, index) => (
            <div
              key={bid.id}
              className={`flex justify-between items-center p-3 rounded-lg ${
                index === 0 ? "bg-primary/10" : "bg-base-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {bid.user ? bid.user.name || t("anonymous") : t("anonymous")}
                </span>
                {index === 0 && (
                  <span className="badge badge-primary badge-sm text-center">
                    {t("highest")}
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatCurrency(bid.amount, currencySymbol)}
                </div>
                <div className="text-xs text-base-content/60">
                  {formatDate(bid.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
