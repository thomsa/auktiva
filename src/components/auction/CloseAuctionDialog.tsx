import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ConfirmDialog } from "@/components/common";
import { useToast } from "@/components/ui/toast";
import type { UseConfirmDialogReturn } from "@/hooks/ui";
import type { AuctionItemStats } from "@/lib/auction-overview";

interface CloseAuctionDialogProps {
  /** Open state, loading flag and confirm wrapper from useConfirmDialog. */
  controller: UseConfirmDialogReturn;
  auctionId: string;
  auctionName: string;
  stats: AuctionItemStats;
  /** Items the owner cannot see (other members' drafts) that also close. */
  hiddenItemCount: number;
  /**
   * Bidding ended on every item while the dialog was open (the countdown ran
   * out), so there is nothing left to close.
   */
  alreadyEnded: boolean;
  /** Runs once after the auction is closed and the "Sold!" beat has shown. */
  onClosed: () => void;
}

/** Thrown for a non-OK API response so its server message reaches the UI. */
class CloseAuctionError extends Error {}

const BEAT_GAP_MS = 650;
const SOLD_HOLD_MS = 900;
const SOLD_HOLD_REDUCED_MS = 400;

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(callback: () => void) {
  const media = window.matchMedia(reducedMotionQuery);
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(reducedMotionQuery).matches,
    () => true,
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The owner's "going once, going twice…" confirmation for closing an auction.
 * A native modal <dialog> (focus trap, Esc, top layer) around the shared
 * ConfirmDialog actions, with a summary of what closes.
 *
 * Mount it with a fresh `key` for every opening: that resets the beats and
 * any earlier error synchronously.
 *
 * Beats: 1 = going once, 2 = going twice (both on open), 3 = sold (on success).
 */
export function CloseAuctionDialog({
  controller,
  auctionId,
  auctionName,
  stats,
  hiddenItemCount,
  alreadyEnded,
  onClosed,
}: CloseAuctionDialogProps) {
  const t = useTranslations("auction.overview.close");
  const tOverview = useTranslations("auction.overview");
  const tCommon = useTranslations("common");
  const { showToast } = useToast();
  const reducedMotion = usePrefersReducedMotion();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const endedResultsRef = useRef<HTMLAnchorElement>(null);
  const submittingRef = useRef(false);
  const titleId = useId();
  const summaryId = useId();
  const irreversibleId = useId();
  const [beat, setBeat] = useState(() => (reducedMotion ? 2 : 0));
  const [error, setError] = useState<string | null>(null);
  const { isOpen, isLoading, close, confirm } = controller;

  // Open and close the native dialog, and play the first two beats.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    if (reducedMotion) return;
    const timers = [
      setTimeout(() => setBeat((b) => Math.max(b, 1)), 120),
      setTimeout(() => setBeat((b) => Math.max(b, 2)), 120 + BEAT_GAP_MS),
    ];
    return () => timers.forEach(clearTimeout);
  }, [isOpen, reducedMotion]);

  // After a failed close, the disabled button gave focus up; hand it to the error.
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);

  const handleConfirm = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    // The confirm button disables while loading; keep focus inside the dialog.
    // (No tabIndex in markup: showModal would focus the box instead of Cancel.)
    const box = boxRef.current;
    if (box) {
      box.tabIndex = -1;
      box.focus();
    }

    try {
      await confirm(async () => {
        let res: Response;
        try {
          res = await fetch(`/api/auctions/${auctionId}/close`, {
            method: "POST",
          });
        } catch {
          throw new CloseAuctionError(t("error"));
        }
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new CloseAuctionError(body?.message || t("error"));
        }
        setBeat(3);
        await wait(reducedMotion ? SOLD_HOLD_REDUCED_MS : SOLD_HOLD_MS);
      });
      showToast(t("success"), "success");
      onClosed();
    } catch (err) {
      setError(err instanceof CloseAuctionError ? err.message : t("error"));
      setBeat(2);
      submittingRef.current = false;
    } finally {
      // The box only needed to hold focus during the request.
      boxRef.current?.removeAttribute("tabindex");
    }
  };

  const showEndedNote = alreadyEnded && !isLoading && beat !== 3;

  // The note replaces Cancel and Confirm; move focus to its primary control
  // instead of leaving it on the page body.
  useEffect(() => {
    if (showEndedNote) endedResultsRef.current?.focus();
  }, [showEndedNote]);

  const beatClass = (active: boolean) =>
    `motion-safe:transition-colors motion-safe:duration-500 ${
      active ? "text-base-content/80" : "text-base-content/25"
    }`;

  // The gavel lifts on "going twice" and strikes on "sold"; still under reduced motion.
  const gavelPose =
    beat === 3
      ? "rotate-0"
      : beat >= 1
        ? "motion-safe:rotate-[24deg]"
        : "rotate-0";

  return (
    <dialog
      ref={dialogRef}
      className="modal modal-bottom sm:modal-middle"
      aria-labelledby={titleId}
      aria-describedby={
        showEndedNote ? undefined : `${summaryId} ${irreversibleId}`
      }
      onCancel={(event) => {
        // Esc: React state decides whether the dialog closes.
        event.preventDefault();
        close();
      }}
      onClose={() => {
        // The browser can still close it (a repeated Esc is not cancelable).
        // Keep it up while the request runs; otherwise sync React state.
        if (!isOpen) return;
        if (isLoading) dialogRef.current?.showModal();
        else close();
      }}
    >
      <div ref={boxRef} className="modal-box max-w-md outline-none">
        <div className="flex items-center gap-3">
          <span
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
            aria-hidden="true"
          >
            <span
              className={`icon-[tabler--gavel] size-6 origin-bottom-right motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out ${gavelPose}`}
            ></span>
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold leading-tight">
              {t("title")}
            </h2>
            <p className="truncate text-sm text-base-content/60">
              {auctionName}
            </p>
          </div>
        </div>

        {showEndedNote ? (
          <div
            role="status"
            className="mt-5 rounded-lg bg-base-200/60 p-4 text-sm"
          >
            <p className="font-semibold">{t("alreadyEnded")}</p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row">
              <button
                type="button"
                className="btn btn-ghost w-full sm:w-auto"
                onClick={close}
              >
                {tCommon("close")}
              </button>
              <Link
                ref={endedResultsRef}
                href={`/auctions/${auctionId}/results`}
                className="btn btn-primary w-full sm:w-auto"
              >
                <span
                  className="icon-[tabler--trophy] size-4"
                  aria-hidden="true"
                ></span>
                {tOverview("viewResults")}
              </Link>
            </div>
          </div>
        ) : (
          <>
            <ol
              className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-base font-semibold"
              aria-hidden="true"
            >
              <li className={beatClass(beat >= 1)}>{t("beatOnce")}</li>
              <li className={beatClass(beat >= 2)}>{t("beatTwice")}</li>
              <li
                className={`motion-safe:transition-colors motion-safe:duration-300 ${
                  beat === 3
                    ? "font-extrabold text-primary"
                    : "text-base-content/25"
                }`}
              >
                {t("beatSold")}
              </li>
            </ol>

            <div id={summaryId} className="mt-4">
              <h3 className="sr-only">{t("summaryLabel")}</h3>
              <ul className="divide-y divide-base-content/5 text-sm tabular-nums">
                <li className="flex items-start gap-2.5 py-2">
                  <span
                    className="icon-[tabler--package] mt-0.5 size-4 shrink-0 text-base-content/50"
                    aria-hidden="true"
                  ></span>
                  <span>
                    <span className="font-semibold">
                      {t("items", { count: stats.totalItems })}
                    </span>
                    {stats.draftItems > 0 && (
                      <span className="block text-xs text-base-content/60">
                        {t("drafts", { count: stats.draftItems })}
                      </span>
                    )}
                  </span>
                </li>
                <li className="flex items-start gap-2.5 py-2">
                  <span
                    className="icon-[tabler--trophy] mt-0.5 size-4 shrink-0 text-base-content/50"
                    aria-hidden="true"
                  ></span>
                  <span>{t("winners", { count: stats.itemsWithBids })}</span>
                </li>
                <li className="flex items-start gap-2.5 py-2">
                  <span
                    className="icon-[tabler--tag-off] mt-0.5 size-4 shrink-0 text-base-content/50"
                    aria-hidden="true"
                  ></span>
                  <span>{t("unsold", { count: stats.itemsWithoutBids })}</span>
                </li>
                {hiddenItemCount > 0 && (
                  <li className="flex items-start gap-2.5 py-2">
                    <span
                      className="icon-[tabler--eye-off] mt-0.5 size-4 shrink-0 text-base-content/50"
                      aria-hidden="true"
                    ></span>
                    <span>{t("hiddenDrafts", { count: hiddenItemCount })}</span>
                  </li>
                )}
              </ul>
            </div>

            {error && (
              <div
                ref={alertRef}
                role="alert"
                tabIndex={-1}
                className="alert alert-error mt-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-error/40"
              >
                <span
                  className="icon-[tabler--alert-circle] size-5 shrink-0"
                  aria-hidden="true"
                ></span>
                <span>{error}</span>
              </div>
            )}

            {/* ConfirmDialog's title has no id; this copy names it for aria-describedby. */}
            <p id={irreversibleId} hidden>
              {t("irreversible")}
            </p>
            <ConfirmDialog
              isOpen={isOpen}
              title={t("irreversible")}
              confirmLabel={t("confirm")}
              variant="primary"
              isLoading={isLoading}
              onConfirm={handleConfirm}
              onCancel={close}
            />
          </>
        )}

        <p className="sr-only" aria-live="polite">
          {beat === 3 ? t("success") : isLoading ? t("closing") : ""}
        </p>
      </div>
      <div className="modal-backdrop">
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("dismiss")}
          onClick={close}
        ></button>
      </div>
    </dialog>
  );
}
