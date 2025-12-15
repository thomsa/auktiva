import { formatCurrency } from "@/utils/formatters";

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
  return (
    <div>
      <h2 className="font-semibold mb-4 flex items-center gap-2">
        <span className="icon-[tabler--history] size-5"></span>
        Bid History ({bids.length})
      </h2>

      {bids.length === 0 ? (
        <p className="text-base-content/60 text-center py-8">
          No bids yet. Be the first to bid!
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
                  {bid.user ? bid.user.name || "Anonymous" : "Anonymous"}
                </span>
                {index === 0 && (
                  <span className="badge badge-primary badge-sm text-center">
                    Highest
                  </span>
                )}
              </div>
              <div className="text-right">
                <div className="font-bold">
                  {formatCurrency(bid.amount, currencySymbol)}
                </div>
                <div className="text-xs text-base-content/60">
                  {new Date(bid.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
