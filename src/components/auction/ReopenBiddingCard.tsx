import { FormEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/common";
import { useToast } from "@/components/ui/toast";
import { useFormatters } from "@/i18n";
import { useConfirmDialog } from "@/hooks/ui";

/** Mirrors the reopen API's `itemIds` limit. */
const MAX_REOPEN_ITEMS = 500;

export interface ReopenClosedItem {
  id: string;
  name: string;
  endDate: string | null;
  bidCount: number;
}

export interface ReopenBiddingResult {
  /** The auction's new end date (ISO), or null for no end. */
  endDate: string | null;
  /** IDs the owner submitted for reopening. */
  itemIds: string[];
}

interface ReopenBiddingCardProps {
  auctionId: string;
  /** Current auction end date (ISO), used to prefill the field. */
  auctionEndDate: string | null;
  isEnded: boolean;
  closedItems: ReopenClosedItem[];
  onReopened: (result: ReopenBiddingResult) => void;
  /** Called after an API error so the page can reload the closed items. */
  onFailed: () => void;
}

interface ReopenResponse {
  auction?: { endDate: string | null };
  reopenedCount?: number;
  notifiedCount?: number;
  message?: string;
}

/** Formats a date as a `datetime-local` value in the browser's time zone. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function ReopenBiddingCard({
  auctionId,
  auctionEndDate,
  isEnded,
  closedItems,
  onReopened,
  onFailed,
}: ReopenBiddingCardProps) {
  const t = useTranslations("auction.settings.reopen");
  const tErrors = useTranslations("errors");
  const { showToast } = useToast();
  const { formatDate } = useFormatters();
  const confirmDialog = useConfirmDialog();
  const fieldId = useId();
  const titleId = `${fieldId}-title`;
  const endDateId = `${fieldId}-end-date`;
  const endDateHintId = `${fieldId}-end-date-hint`;
  const endDateErrorId = `${fieldId}-end-date-error`;
  const noEndId = `${fieldId}-no-end`;
  const itemsErrorId = `${fieldId}-items-error`;
  const followsId = `${fieldId}-follows`;
  const followsNoteId = `${fieldId}-follows-note`;
  const selectAllRef = useRef<HTMLInputElement>(null);

  // Local time only exists in the browser, so the field and the item dates
  // are filled after mount to keep the server render and hydration identical.
  const [isMounted, setIsMounted] = useState(false);
  const [minValue, setMinValue] = useState("");
  const [endDate, setEndDate] = useState("");
  const [noEndTime, setNoEndTime] = useState(false);
  const [deselected, setDeselected] = useState<Set<string>>(() => new Set());
  const [endDateError, setEndDateError] = useState<string | null>(null);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    const now = new Date();
    setIsMounted(true);
    setMinValue(toLocalInputValue(now));
    if (auctionEndDate) {
      const end = new Date(auctionEndDate);
      if (end > now) setEndDate(toLocalInputValue(end));
    }
    // Prefill once; later prop changes must not overwrite the owner's input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Items with their own (stamped) end date are the owner's choice. Items
  // without one follow the auction end, so moving that end into the future
  // (or clearing it) always reopens them; they are shown but not selectable.
  const selectableItems = useMemo(
    () => closedItems.filter((item) => item.endDate !== null),
    [closedItems],
  );
  const followingItems = useMemo(
    () => closedItems.filter((item) => item.endDate === null),
    [closedItems],
  );
  const selectedIds = useMemo(
    () =>
      selectableItems.filter((i) => !deselected.has(i.id)).map((i) => i.id),
    [selectableItems, deselected],
  );
  const reopenCount = selectedIds.length + followingItems.length;
  const allSelected =
    selectableItems.length > 0 &&
    selectedIds.length === selectableItems.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const isLocked = isPending || confirmDialog.isOpen;

  const toggleItem = (id: string, checked: boolean) => {
    setItemsError(null);
    setDeselected((prev) => {
      const next = new Set(prev);
      if (checked) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = (checked: boolean) => {
    setItemsError(null);
    setDeselected(
      checked ? new Set() : new Set(selectableItems.map((item) => item.id)),
    );
  };

  /** Returns the ISO end date to send, or undefined when the input is invalid. */
  const resolveEndDate = (): string | null | undefined => {
    if (noEndTime) return null;
    if (!endDate) {
      setEndDateError(t("endDateRequired"));
      return undefined;
    }
    // A `datetime-local` value has no offset, so it parses as local time.
    const parsed = new Date(endDate);
    if (Number.isNaN(parsed.getTime()) || parsed <= new Date()) {
      setEndDateError(t("endDateInPast"));
      return undefined;
    }
    return parsed.toISOString();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const resolved = resolveEndDate();
    const tooMany = selectedIds.length > MAX_REOPEN_ITEMS;
    setItemsError(tooMany ? t("tooManyItems", { max: MAX_REOPEN_ITEMS }) : null);
    if (resolved === undefined) {
      document.getElementById(endDateId)?.focus();
      return;
    }
    if (tooMany) return;
    setEndDateError(null);
    confirmDialog.open();
  };

  const handleConfirm = async () => {
    // Re-check: time passes while the dialog is open.
    const resolved = resolveEndDate();
    if (resolved === undefined) {
      confirmDialog.close();
      return;
    }
    const itemIds = selectedIds;
    setIsPending(true);
    try {
      const res = await fetch(`/api/auctions/${auctionId}/reopen`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endDate: resolved, itemIds }),
      });
      const result = (await res.json().catch(() => ({}))) as ReopenResponse;

      if (!res.ok) {
        showToast(result.message || tErrors("auction.updateFailed"), "error");
        // The list may be stale (another tab changed the auction), so close
        // the dialog and let the page reload what is closed now.
        confirmDialog.close();
        onFailed();
        return;
      }

      showToast(
        t("success", {
          reopenedCount: result.reopenedCount ?? 0,
          notifiedCount: result.notifiedCount ?? 0,
        }),
        "success",
      );
      confirmDialog.close();
      onReopened({
        endDate: result.auction ? result.auction.endDate : resolved,
        itemIds,
      });
    } catch {
      showToast(tErrors("generic"), "error");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <section
      aria-labelledby={titleId}
      className="card bg-base-100/50 backdrop-blur-sm shadow-xl mt-8 border border-info/30"
    >
      <div className="card-body p-8">
        <h2 id={titleId} className="card-title text-info flex items-center gap-2">
          <span
            className="icon-[tabler--clock-play] size-6 shrink-0"
            aria-hidden="true"
          ></span>
          {t("title")}
        </h2>

        <p className="text-base-content/60 text-sm">
          {isEnded ? t("descriptionEnded") : t("descriptionLive")}
        </p>

        <form onSubmit={handleSubmit} noValidate className="mt-4">
          <fieldset disabled={isLocked} className="space-y-6 min-w-0">
            {/* End time */}
            <div className="space-y-3">
              <div className="form-control">
                <label className="label" htmlFor={endDateId}>
                  <span className="label-text font-medium">
                    {t("endDateLabel")}
                  </span>
                </label>
                <input
                  id={endDateId}
                  type="datetime-local"
                  value={endDate}
                  min={minValue || undefined}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setEndDateError(null);
                  }}
                  disabled={noEndTime}
                  required={!noEndTime}
                  aria-invalid={endDateError ? true : undefined}
                  aria-describedby={
                    endDateError
                      ? `${endDateErrorId} ${endDateHintId}`
                      : endDateHintId
                  }
                  className={`input input-bordered w-full bg-base-100 focus:bg-base-100 transition-colors ${
                    endDateError ? "input-error" : ""
                  }`}
                />
                {endDateError && (
                  <p
                    id={endDateErrorId}
                    role="alert"
                    className="text-sm text-error mt-2"
                  >
                    {endDateError}
                  </p>
                )}
                <p
                  id={endDateHintId}
                  className="text-xs text-base-content/60 mt-2"
                >
                  {t("endDateHint")}
                </p>
              </div>

              <label
                htmlFor={noEndId}
                className="flex items-start gap-3 cursor-pointer min-h-11 py-1"
              >
                <input
                  id={noEndId}
                  type="checkbox"
                  checked={noEndTime}
                  onChange={(e) => {
                    setNoEndTime(e.target.checked);
                    setEndDateError(null);
                  }}
                  className="toggle toggle-info mt-0.5 shrink-0"
                />
                <span className="min-w-0">
                  <span className="label-text font-medium block">
                    {t("noEndTime")}
                  </span>
                  <span className="text-xs text-base-content/60 block">
                    {t("noEndTimeHint")}
                  </span>
                </span>
              </label>
            </div>

            {/* Closed items */}
            <fieldset
              className="min-w-0"
              aria-describedby={itemsError ? itemsErrorId : undefined}
            >
              <legend className="label-text font-medium mb-2">
                {t("itemsLegend")}
              </legend>

              {closedItems.length === 0 ? (
                <p className="text-sm text-base-content/60 p-3 rounded-xl border border-base-content/10 bg-base-100">
                  {t("noClosedItems")}
                </p>
              ) : (
                <div className="space-y-3">
                  {selectableItems.length > 0 && (
                    <div className="rounded-xl border border-base-content/10 bg-base-100 overflow-hidden">
                      <label className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 min-h-11 cursor-pointer border-b border-base-content/10 bg-base-200/40">
                        <input
                          ref={selectAllRef}
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => toggleAll(e.target.checked)}
                          className="checkbox checkbox-info checkbox-sm shrink-0"
                        />
                        <span className="flex-1 min-w-0 text-sm font-medium">
                          {t("selectAll")}
                        </span>
                        <span
                          className="text-xs text-base-content/60 tabular-nums"
                          aria-live="polite"
                        >
                          {t("selectedCount", {
                            selected: selectedIds.length,
                            total: selectableItems.length,
                          })}
                        </span>
                      </label>

                      <ul className="max-h-80 overflow-y-auto divide-y divide-base-content/5">
                        {selectableItems.map((item) => (
                          <li key={item.id}>
                            <label className="flex items-start gap-3 px-3 py-2.5 min-h-11 cursor-pointer hover:bg-base-200/50 transition-colors">
                              <input
                                type="checkbox"
                                checked={!deselected.has(item.id)}
                                onChange={(e) =>
                                  toggleItem(item.id, e.target.checked)
                                }
                                className="checkbox checkbox-info checkbox-sm mt-0.5 shrink-0"
                              />
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium break-words">
                                  {item.name}
                                </span>
                                <span className="block text-xs text-base-content/60">
                                  {isMounted && item.endDate ? (
                                    <time dateTime={item.endDate}>
                                      {t("itemEndedAt", {
                                        date: formatDate(item.endDate),
                                      })}
                                    </time>
                                  ) : (
                                    t("itemEnded")
                                  )}
                                  <span aria-hidden="true"> · </span>
                                  {t("bidCount", { count: item.bidCount })}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {followingItems.length > 0 && (
                    <div
                      role="group"
                      aria-labelledby={followsId}
                      aria-describedby={followsNoteId}
                      className="rounded-xl border border-base-content/10 bg-base-100 overflow-hidden"
                    >
                      <div className="flex items-start gap-3 px-3 py-2 min-h-11 border-b border-base-content/10 bg-base-200/40">
                        <span
                          className="icon-[tabler--clock-play] size-5 text-info shrink-0"
                          aria-hidden="true"
                        ></span>
                        <span className="flex-1 min-w-0">
                          <span
                            id={followsId}
                            className="block text-sm font-medium"
                          >
                            {t("followsAuctionHeading", {
                              count: followingItems.length,
                            })}
                          </span>
                          <span
                            id={followsNoteId}
                            className="block text-xs text-base-content/60"
                          >
                            {t("followsAuctionNote")}
                          </span>
                        </span>
                      </div>

                      {/* No controls inside, so the scroll area itself takes
                          focus to stay scrollable from the keyboard. */}
                      <div
                        role="region"
                        aria-labelledby={followsId}
                        tabIndex={0}
                        className="max-h-80 overflow-y-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-info"
                      >
                        <ul className="divide-y divide-base-content/5">
                          {followingItems.map((item) => (
                            <li
                              key={item.id}
                              className="flex items-start gap-3 px-3 py-2.5"
                            >
                              <span
                                className="icon-[tabler--check] size-5 text-info shrink-0"
                                aria-hidden="true"
                              ></span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium break-words">
                                  {item.name}
                                </span>
                                <span className="block text-xs text-base-content/60">
                                  {t("bidCount", { count: item.bidCount })}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {itemsError && (
                <p
                  id={itemsErrorId}
                  role="alert"
                  className="text-sm text-error mt-2"
                >
                  {itemsError}
                </p>
              )}
            </fieldset>

            {!confirmDialog.isOpen && (
              <button
                type="submit"
                className="btn btn-info btn-outline w-full border-info/50 hover:bg-info hover:border-info"
              >
                <span
                  className="icon-[tabler--clock-play] size-5"
                  aria-hidden="true"
                ></span>
                {t("submit")}
              </button>
            )}
          </fieldset>
        </form>

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={t("confirmTitle", { count: reopenCount })}
          message={t("confirmMessage")}
          confirmLabel={t("confirmButton")}
          variant="primary"
          isLoading={isPending}
          onConfirm={handleConfirm}
          onCancel={confirmDialog.close}
        />
      </div>
    </section>
  );
}
