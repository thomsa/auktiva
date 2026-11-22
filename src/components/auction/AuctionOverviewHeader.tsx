import {
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useLocale, useTranslations } from "next-intl";
import { useFormatters } from "@/i18n";
import { useConfirmDialog } from "@/hooks/ui";
import {
  getAuctionItemStats,
  getAuctionTiming,
  getCountdownParts,
  getHiddenItemCount,
  getOverviewAccess,
  getTickUntil,
  type AuctionPhase,
  type OverviewItem,
  type TimingItem,
} from "@/lib/auction-overview";
import { CloseAuctionDialog } from "./CloseAuctionDialog";
import { useAuctionShareLink } from "./useAuctionShareLink";

interface AuctionOverviewHeaderProps {
  auction: {
    id: string;
    name: string;
    endDate: string | null;
    itemEndMode: string;
    joinMode: string;
    _count: { items: number };
  };
  /** Items the viewer can see, as loaded from /details. */
  items: Array<OverviewItem & TimingItem>;
  role: string;
  /** Called when the auction moves on by itself (deadline or last item end). */
  onDeadlineReached?: () => void;
  /**
   * Reports the phase, when bidding ended and how many items are still open,
   * whenever any of them or the auction's end date changes. The open count
   * changes when an item's own end passes, even within one phase.
   */
  onPhaseChange?: (
    phase: AuctionPhase,
    endedAt: number | null,
    openItemCount: number,
  ) => void;
}

// --- Clock -----------------------------------------------------------------
// The current time through useSyncExternalStore. The server snapshot is null,
// so no time-dependent markup renders during SSR or hydration. The snapshot is
// the real, unrounded time read at each tick (rounding is for display only),
// so the header changes phase on the same boundary as bidding. The interval
// runs only until the latest end that can still change the header, stops
// itself after it, and is cleared on unmount.

const getServerNow = () => null;

function createClock() {
  let now = Date.now();
  return {
    read: () => now,
    sync: () => {
      now = Date.now();
    },
  };
}

function useNow(tickUntil: number | null): number | null {
  const [clock] = useState(createClock);
  const subscribe = useCallback(
    (onChange: () => void) => {
      clock.sync();
      if (tickUntil === null || clock.read() > tickUntil) return () => {};
      const id = window.setInterval(() => {
        clock.sync();
        onChange();
        if (clock.read() > tickUntil) window.clearInterval(id);
      }, 1000);
      return () => window.clearInterval(id);
    },
    [clock, tickUntil],
  );
  return useSyncExternalStore(subscribe, clock.read, getServerNow);
}

// --- Pieces ----------------------------------------------------------------

function StatusBadge({ phase }: { phase: AuctionPhase }) {
  const t = useTranslations("auction.overview.status");
  if (phase === "ended") {
    return (
      <span className="badge badge-error gap-1 font-semibold">
        <span
          className="icon-[tabler--flag-filled] size-3.5"
          aria-hidden="true"
        ></span>
        {t("ended")}
      </span>
    );
  }
  if (phase === "open") {
    return (
      <span className="badge badge-ghost gap-1 font-semibold">
        <span
          className="icon-[tabler--infinity] size-3.5"
          aria-hidden="true"
        ></span>
        {t("open")}
      </span>
    );
  }
  // Live is the auction's own state, not a bid outcome: brand indigo, not success.
  return (
    <span className="badge badge-primary badge-soft gap-1.5 font-semibold">
      <span
        className="size-1.5 rounded-full bg-current"
        aria-hidden="true"
      ></span>
      {phase === "overtime" ? t("overtime") : t("live")}
    </span>
  );
}

/**
 * One label/value pair. Below sm the facts sit in a 2-column grid and each
 * pair spans two subgrid rows, so labels share a row (bottom-aligned when one
 * wraps) and values share the next: a long German or Polish label can no
 * longer push its value below its neighbour's.
 */
function Fact({
  label,
  children,
  detail,
  className = "",
}: {
  label: string;
  children: ReactNode;
  detail?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`row-span-2 grid min-w-0 grid-rows-subgrid sm:block ${className}`}
    >
      <dt className="self-end text-xs font-medium uppercase tracking-wide text-base-content/50">
        {label}
      </dt>
      <dd className="sm:mt-1.5">
        <div className="text-lg font-bold leading-tight">{children}</div>
        {detail && (
          <div className="mt-0.5 text-xs text-base-content/60">{detail}</div>
        )}
      </dd>
    </div>
  );
}

const factPlaceholder = (
  <span className="skeleton inline-block h-5 w-20 align-middle"></span>
);

const secondaryButton =
  "btn btn-outline border-base-content/15 font-medium text-base-content hover:border-base-content/25 hover:bg-base-200";

/**
 * The auction's own state at the top of the overview. Owner and admins get
 * status, time left, bid activity and the organizer actions; everyone else
 * gets one slim status line.
 */
export function AuctionOverviewHeader({
  auction,
  items,
  role,
  onDeadlineReached,
  onPhaseChange,
}: AuctionOverviewHeaderProps) {
  const t = useTranslations("auction.overview");
  const router = useRouter();
  const { formatDate, formatNumber } = useFormatters();
  const closeDialog = useConfirmDialog();
  // A fresh dialog per opening resets its beats and errors synchronously.
  const [dialogSession, setDialogSession] = useState(0);
  const { copied, copyShareLink } = useAuctionShareLink(auction.id);

  const tickUntil = getTickUntil(auction, items);
  const now = useNow(tickUntil);
  const timing = now === null ? null : getAuctionTiming(auction, items, now);

  const stats = useMemo(() => getAuctionItemStats(items), [items]);
  const hiddenItemCount = getHiddenItemCount(
    auction._count.items,
    items.length,
  );

  // Refresh when the clock moves the auction on: live to overtime or ended,
  // or overtime to ended.
  const previousPhase = useRef<AuctionPhase | null>(null);
  useEffect(() => {
    const phase = timing?.phase ?? null;
    const previous = previousPhase.current;
    if (
      (previous === "live" && (phase === "overtime" || phase === "ended")) ||
      (previous === "overtime" && phase === "ended")
    ) {
      onDeadlineReached?.();
    }
    previousPhase.current = phase;
  }, [timing?.phase, onDeadlineReached]);

  const onPhaseChangeRef = useRef(onPhaseChange);
  useEffect(() => {
    onPhaseChangeRef.current = onPhaseChange;
  });
  const currentPhase = timing?.phase ?? null;
  const currentEndedAt = timing?.endedAt ?? null;
  const currentOpenItems = timing?.openItemCount ?? 0;
  useEffect(() => {
    if (currentPhase) {
      onPhaseChangeRef.current?.(
        currentPhase,
        currentEndedAt,
        currentOpenItems,
      );
    }
  }, [currentPhase, currentEndedAt, currentOpenItems, auction.endDate]);

  const access = getOverviewAccess(role, timing?.phase ?? "ended");

  // If the dialog closes after its trigger disappeared (bidding ended while it
  // was open), hand focus to View results rather than the page body.
  const resultsLinkRef = useRef<HTMLAnchorElement>(null);
  const dialogWasOpen = useRef(false);
  useEffect(() => {
    if (dialogWasOpen.current && !closeDialog.isOpen && !access.canClose) {
      resultsLinkRef.current?.focus();
    }
    dialogWasOpen.current = closeDialog.isOpen;
  }, [closeDialog.isOpen, access.canClose]);

  // Phones pair the secondary actions two per row. When any label is wider
  // than half the row (long German, Spanish or Hungarian copy), every one
  // takes a full row instead, so no row is left half empty. The share button
  // holds both of its labels (one invisible), so its width and this result do
  // not change when "Copied!" swaps in.
  const locale = useLocale();
  const isOwner = role === "OWNER";
  const isShareable =
    auction.joinMode === "FREE" || auction.joinMode === "LINK";
  const actionsRef = useRef<HTMLDivElement>(null);
  const [stackPairs, setStackPairs] = useState(false);
  useEffect(() => {
    const group = actionsRef.current;
    if (!group || typeof ResizeObserver === "undefined") return;
    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const gap = parseFloat(getComputedStyle(group).columnGap) || 0;
      const half = (group.clientWidth - gap) / 2;
      const range = document.createRange();
      const tooWide = [
        ...group.querySelectorAll<HTMLElement>("[data-pair]"),
      ].some((button) => {
        if (button.offsetParent === null) return false;
        range.selectNodeContents(button);
        const style = getComputedStyle(button);
        const needed =
          range.getBoundingClientRect().width +
          parseFloat(style.paddingLeft) +
          parseFloat(style.paddingRight) +
          parseFloat(style.borderLeftWidth) +
          parseFloat(style.borderRightWidth);
        // Any overflow at all would make min-w-fit wrap one pair, so round
        // the needed width up instead of allowing a tolerance.
        return Math.ceil(needed) > half;
      });
      setStackPairs(tooWide);
    };
    // Fires once on observe, then on every width change; fonts that finish
    // loading later can widen labels without resizing the group.
    const observer = new ResizeObserver(measure);
    observer.observe(group);
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [
    access.isOrganizer,
    access.canClose,
    access.canViewResults,
    isOwner,
    isShareable,
    locale,
  ]);

  const countdownText = (msLeft: number) => {
    const parts = getCountdownParts(msLeft);
    return t(`countdown.${parts.format}`, {
      days: parts.days,
      hours: parts.hours,
      minutes: parts.minutes,
      seconds: String(parts.seconds).padStart(
        parts.format === "minutes" ? 2 : 1,
        "0",
      ),
    });
  };

  const endDateText = auction.endDate ? formatDate(auction.endDate) : "";
  // Bidding can end after the auction's own deadline (a late item end).
  const endedAtText =
    timing?.endedAt != null
      ? formatDate(new Date(timing.endedAt))
      : endDateText;
  const openCloseDialog = () => {
    setDialogSession((session) => session + 1);
    closeDialog.open();
  };
  const openText = isOwner ? t("openOwner") : t("openOthers");

  // --- Slim line for creators and bidders --------------------------------
  if (!access.isOrganizer) {
    let timeText: ReactNode = null;
    if (timing?.phase === "ended") {
      timeText = endedAtText;
    } else if (timing?.phase === "overtime") {
      timeText = (
        <>
          {t("deadlinePassed")}
          <span className="text-base-content/50">
            {" · "}
            {t("itemsStillOpen", { count: timing.openItemCount })}
          </span>
        </>
      );
    } else if (timing?.perItem) {
      timeText = (
        <>
          {t("perItem")}
          {timing.endsAt !== null && (
            <span className="text-base-content/50">
              {" · "}
              {t("perItemDeadline", { date: endDateText })}
            </span>
          )}
        </>
      );
    } else if (timing?.phase === "live" && timing.msLeft !== null) {
      timeText = (
        <>
          <span className="font-semibold text-secondary tabular-nums">
            {t("timeLeft", { time: countdownText(timing.msLeft) })}
          </span>
          <span className="text-base-content/50">
            {" · "}
            {t("endsOn", { date: endDateText })}
          </span>
        </>
      );
    } else if (timing?.phase === "open") {
      timeText = openText;
    }

    return (
      <p className="mt-3 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-base-content/70">
        {timing ? <StatusBadge phase={timing.phase} /> : factPlaceholder}
        {timeText && <span>{timeText}</span>}
      </p>
    );
  }

  // --- Organizer strip ---------------------------------------------------
  let timeLabel = t("timeLabel");
  let timeValue: ReactNode = factPlaceholder;
  let timeDetail: ReactNode = null;
  if (timing?.phase === "ended") {
    timeLabel = t("endedLabel");
    timeValue = <span className="text-base">{endedAtText}</span>;
  } else if (timing?.phase === "overtime") {
    timeLabel = t("biddingLabel");
    timeValue = <span className="text-base">{t("deadlinePassed")}</span>;
    timeDetail = t("itemsStillOpen", { count: timing.openItemCount });
  } else if (timing?.perItem) {
    timeValue = <span className="text-base">{t("perItem")}</span>;
    timeDetail =
      timing.endsAt !== null
        ? t("perItemDeadline", { date: endDateText })
        : openText;
  } else if (timing?.phase === "live" && timing.msLeft !== null) {
    timeValue = (
      <time dateTime={auction.endDate ?? undefined} className="text-secondary">
        {countdownText(timing.msLeft)}
      </time>
    );
    timeDetail = t("endsOn", { date: endDateText });
  } else if (timing?.phase === "open") {
    timeValue = <span className="text-base">{openText}</span>;
  }

  // Phones: Close takes the first row, the rest pair up two per row. With an
  // odd number of the rest, the first of them (View results) takes a full row
  // so no button is left alone; if any label is too wide to pair, all of them
  // take full rows. From sm every button keeps its own width.
  const pairedCount =
    (access.canViewResults ? 1 : 0) +
    2 + // Invite and Members
    (isShareable ? 1 : 0) +
    (isOwner ? 1 : 0);
  const fullRow = "grow basis-full whitespace-nowrap sm:grow-0 sm:basis-auto";
  const halfRow =
    "grow basis-[calc(50%-0.25rem)] min-w-fit whitespace-nowrap sm:grow-0 sm:basis-auto";
  const pairRow = stackPairs ? fullRow : halfRow;
  const resultsRow = pairedCount % 2 === 1 ? fullRow : pairRow;
  const manageButton = `${secondaryButton} ${pairRow} lg:hidden`;

  return (
    <section
      aria-label={t("regionLabel")}
      className="mt-5 flex flex-col gap-5 border-t border-base-content/10 pt-5 lg:flex-row lg:items-end lg:justify-between lg:gap-10"
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5 tabular-nums sm:flex sm:flex-wrap sm:gap-x-10 sm:gap-y-4">
        <Fact label={t("statusLabel")} className="max-sm:mb-3">
          {timing ? <StatusBadge phase={timing.phase} /> : factPlaceholder}
        </Fact>
        <Fact label={timeLabel} detail={timeDetail} className="max-sm:mb-3">
          {timeValue}
        </Fact>
        <Fact label={t("bidsLabel")}>{formatNumber(stats.totalBids)}</Fact>
        <Fact label={t("itemsWithBidsLabel")}>
          {stats.totalItems === 0 ? (
            <span className="text-base">{t("noItemsYet")}</span>
          ) : (
            t("itemsWithBids", {
              withBids: formatNumber(stats.itemsWithBids),
              total: formatNumber(stats.totalItems),
            })
          )}
        </Fact>
      </dl>

      <div
        ref={actionsRef}
        role="group"
        aria-label={t("manageLabel")}
        className="flex flex-wrap gap-2 lg:shrink-0 lg:flex-nowrap"
      >
        {access.canClose && (
          <button
            type="button"
            className={`btn btn-primary shadow-md shadow-primary/20 ${fullRow}`}
            onClick={openCloseDialog}
          >
            <span
              className="icon-[tabler--gavel] size-5"
              aria-hidden="true"
            ></span>
            {t("closeAuction")}
          </button>
        )}
        {access.canViewResults && (
          <Link
            ref={resultsLinkRef}
            href={`/auctions/${auction.id}/results`}
            className={`${secondaryButton} ${resultsRow}`}
            // Measured for pairing only when it shares a row.
            data-pair={pairedCount % 2 === 0 ? "" : undefined}
          >
            <span
              className="icon-[tabler--trophy] size-5"
              aria-hidden="true"
            ></span>
            {t("viewResults")}
          </Link>
        )}
        {/* The sidebar's organizer actions, moved up for phones and tablets.
            Below sm this wrapper is display: contents, so the buttons pair up
            with View results in one grid of rows. From sm to lg it keeps the
            manage set together: the owner's always starts its own row (it is
            the bigger set, and Close or View results leads), while the admin's
            sits beside View results when it fits. Wrapped rows keep the
            0.5rem gap of either flex container. */}
        <div
          className={`max-sm:contents sm:flex sm:flex-wrap sm:gap-2 lg:hidden ${
            isOwner ? "sm:basis-full" : ""
          }`}
        >
          <Link
            href={`/auctions/${auction.id}/invite`}
            className={manageButton}
            data-pair
          >
            <span
              className="icon-[tabler--user-plus] size-5"
              aria-hidden="true"
            ></span>
            {t("actions.invite")}
          </Link>
          {isShareable && (
            <button
              type="button"
              onClick={copyShareLink}
              className={manageButton}
              data-pair
            >
              <span
                className={`size-5 ${
                  copied ? "icon-[tabler--check]" : "icon-[tabler--share]"
                }`}
                aria-hidden="true"
              ></span>
              <span className="grid">
                <span
                  className={`col-start-1 row-start-1 ${copied ? "invisible" : ""}`}
                >
                  {t("actions.share")}
                </span>
                <span
                  className={`col-start-1 row-start-1 ${copied ? "" : "invisible"}`}
                >
                  {t("actions.linkCopied")}
                </span>
              </span>
            </button>
          )}
          <Link
            href={`/auctions/${auction.id}/members`}
            className={manageButton}
            data-pair
          >
            <span
              className="icon-[tabler--users] size-5"
              aria-hidden="true"
            ></span>
            {t("actions.members")}
          </Link>
          {isOwner && (
            <Link
              href={`/auctions/${auction.id}/settings`}
              className={manageButton}
              data-pair
            >
              <span
                className="icon-[tabler--adjustments-horizontal] size-5"
                aria-hidden="true"
              ></span>
              {t("actions.settings")}
            </Link>
          )}
        </div>
      </div>

      {/* Stays mounted while open, so a deadline passing mid-flow cannot unmount it. */}
      {(access.canClose || closeDialog.isOpen) && (
        <CloseAuctionDialog
          key={dialogSession}
          controller={closeDialog}
          auctionId={auction.id}
          auctionName={auction.name}
          stats={stats}
          hiddenItemCount={hiddenItemCount}
          alreadyEnded={timing?.phase === "ended"}
          onClosed={() => router.push(`/auctions/${auction.id}/results`)}
        />
      )}
    </section>
  );
}
