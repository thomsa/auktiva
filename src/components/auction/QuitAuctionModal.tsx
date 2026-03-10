import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

interface LeavePreflightResult {
  canLeave: boolean;
  reason?: string;
  bidCount: number;
  activeOwnedItemCount: number;
  activeOwnedItems: Array<{ id: string; name: string }>;
}

interface QuitAuctionModalProps {
  isOpen: boolean;
  auctionId: string;
  onClose: () => void;
}

export function QuitAuctionModal({
  isOpen,
  auctionId,
  onClose,
}: QuitAuctionModalProps) {
  const router = useRouter();
  const t = useTranslations("auction");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const { showToast } = useToast();

  const [preflight, setPreflight] = useState<LeavePreflightResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setPreflight(null);

      fetch(`/api/auctions/${auctionId}/leave`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            setError(data.message || tErrors("generic"));
            return;
          }
          setPreflight(data as LeavePreflightResult);
        })
        .catch(() => {
          setError(tErrors("generic"));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, auctionId, tErrors]);

  const handleLeave = async () => {
    setLeaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/auctions/${auctionId}/leave`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || tErrors("generic"));
        return;
      }

      showToast(t("leave.success"), "success");
      onClose();
      router.push("/dashboard");
    } catch {
      setError(tErrors("generic"));
    } finally {
      setLeaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-md">
        <h3 className="font-bold text-lg flex items-center gap-2 text-warning">
          <span className="icon-[tabler--logout] size-6"></span>
          {t("leave.modalTitle")}
        </h3>

        <div className="py-4 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-6">
              <span className="loading loading-spinner loading-md text-primary"></span>
            </div>
          )}

          {error && (
            <div className="alert alert-error text-sm">
              <span className="icon-[tabler--alert-circle] size-5"></span>
              {error}
            </div>
          )}

          {preflight && !loading && (
            <>
              {preflight.canLeave ? (
                <>
                  <p className="text-base-content/70">
                    {t("leave.confirmMessage")}
                  </p>

                  {preflight.bidCount > 0 && (
                    <div className="alert alert-warning text-sm">
                      <span className="icon-[tabler--alert-triangle] size-5 shrink-0"></span>
                      <span>
                        {t("leave.bidsWarning", {
                          count: preflight.bidCount,
                        })}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {preflight.reason === "OWNER_CANNOT_LEAVE" && (
                    <div className="alert alert-error text-sm">
                      <span className="icon-[tabler--shield-x] size-5 shrink-0"></span>
                      <span>{t("leave.ownerCannotLeave")}</span>
                    </div>
                  )}

                  {preflight.reason === "HAS_ACTIVE_ITEMS" && (
                    <div className="space-y-3">
                      <div className="alert alert-warning text-sm">
                        <span className="icon-[tabler--alert-triangle] size-5 shrink-0"></span>
                        <span>
                          {t("leave.hasActiveItems", {
                            count: preflight.activeOwnedItemCount,
                          })}
                        </span>
                      </div>
                      <div className="bg-base-200/50 rounded-lg p-3">
                        <p className="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                          {t("leave.activeItemsLabel")}
                        </p>
                        <ul className="space-y-1">
                          {preflight.activeOwnedItems.map((item) => (
                            <li
                              key={item.id}
                              className="text-sm text-base-content/70 flex items-center gap-2"
                            >
                              <span className="icon-[tabler--package] size-4 text-warning shrink-0"></span>
                              {item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        <div className="modal-action flex-col-reverse sm:flex-row gap-2">
          <Button
            onClick={onClose}
            buttonStyle="ghost"
            className="w-full sm:w-auto"
            disabled={leaving}
          >
            {tCommon("cancel")}
          </Button>
          {preflight?.canLeave && (
            <Button
              onClick={handleLeave}
              variant="warning"
              className="w-full sm:w-auto"
              isLoading={leaving}
              loadingText={t("leave.leaving")}
            >
              <span className="icon-[tabler--logout] size-4"></span>
              {t("leave.confirmButton")}
            </Button>
          )}
        </div>
      </div>
      <div className="modal-backdrop bg-black/50" onClick={onClose}></div>
    </div>
  );
}
