# Design

## Context

See proposal.md for the motivation. The current state at `bcae86d`:

- `processEndedItems()` (`src/lib/services/auction-end.service.ts`) runs
  without awaiting on every `GET /api/notifications`, so several runs can
  overlap. It selects `endDate < now, highestBidderId != null,
  winnerNotified = false` (50 per run), sends `notifyAuctionWon` and
  `queueItemWonEmail`, and then sets `winnerNotified = true`. Two runs that
  overlap can both notify the same winner.
- `claude/canonical-item-end` (67b91e8, unmerged) adds
  `endedItemsAwaitingNotificationWhere(now)`, which also covers published
  items without their own end date in ended auctions and skips drafts. It
  also adds `wouldReopenEndedItem()`, which makes the item PATCH refuse every
  reopen, including clearing a past end date (main still allows that). It
  ships an SQLite notifier test harness built from the migrations.
- `PATCH /api/auctions/[id]` and `POST /api/auctions/[id]/close` are owner
  only (`requireOwner`). `closeAuction` sets the auction end to now and gives
  every unended item, including those without their own end date, its own
  `endDate = now`. Those items can never reopen afterwards.
- The bid API decides "closed" with `isResultItemEnded(item.endDate,
  auction.endDate)`. Anti-snipe applies only to items with their own end
  date.
- Notifications store English `title`/`message` text on the server. E-mail
  templates are English MJML. The bell and the mobile sheet choose icons by
  `type`. Only `NOTIFICATION_NEW`, `NOTIFICATION_COUNT`, `BID_NEW` and the
  discussion events have client subscribers.
- The database is SQLite (local) or libSQL/Turso (production). Migrations
  are plain SQL applied by `prisma migrate` and `scripts/migrate-turso.ts`.

## Goals / Non-Goals

**Goals:**
- At-most-once delivery of the win notification per close, driven by
  recorded state.
- One shared code path that finds reopened items, whichever way the owner
  reopened them.
- A data repair for auctions that were already extended, with no SQL date
  comparisons.

**Non-Goals:**
- Changing `closeAuction` behavior, item-level reopening, anti-snipe for
  items that follow the auction, notification/e-mail localization, a
  resend button, and the `emailOnItemWon` default (see Resolved Decisions
  below).

## Decisions

### D1. Build on `claude/canonical-item-end`
Implementation starts after that branch merges, or is rebased onto it. It
reuses `endedItemsAwaitingNotificationWhere`, `wouldReopenEndedItem` and
`auction-end.service.test.ts`. *Alternative:* reimplement the null-dated
rule here. Rejected because it would duplicate the work and conflict with
the same lines.

### D2. Data model: keep the flag, add the record
`AuctionItem` additions:

| Field | Type | Meaning |
|---|---|---|
| `winnerNotified` (existing) | Boolean | `false` = a win notification is pending for whoever wins at the end |
| `winnerNotifiedUserId` | String? | user last told they won (plain ID, like `highestBidderId`) |
| `winnerNotifiedAmount` | Float? | `currentBid` at that time |
| `winnerNotifiedAt` | DateTime? | when it was recorded |

`winnerNotified` stays the indexed "pending" selector, so the notifier query
needs no column-to-column comparison. The record supports winner-change
detection, reopen targeting and the backfill. *Alternative:* drop the
boolean and select with Prisma field references
(`winnerNotifiedUserId != highestBidderId`). Rejected because NULL handling
makes it awkward and it adds no benefit.

`NotificationType` and `EmailType` each gain `BIDDING_REOPENED`. SQLite
stores enums as TEXT, so the enum additions emit no SQL, but the Prisma
schema and generated client change.

### D3. Notifier: claim, then notify
For each candidate from `endedItemsAwaitingNotificationWhere(now)`:
1. Snapshot `highestBidderId` and `currentBid`.
2. Claim it with `updateMany({ where: { id, winnerNotified: false,
   highestBidderId: snapshot }, data: { winnerNotified: true,
   winnerNotifiedUserId, winnerNotifiedAmount, winnerNotifiedAt: now } })`.
   Continue only when `count === 1`. The losing concurrent run skips the
   item.
3. If the effective end is more than 14 days before `now`
   (`STALE_WINNER_NOTIFICATION_MS`), stop here and send nothing.
4. Otherwise send `notifyAuctionWon` and `queueItemWonEmail`. If sending
   fails, log it and do not roll back. This is at-most-once delivery, the
   same as today when a send fails partway.

Winner changes are caught by construction. Every path that reopens an item
resets `winnerNotified = false` (D5), and bids are refused on closed items,
so a closed item's winner cannot change without a reopen. The backfill (D7)
handles winner changes that happened before the deploy. *Alternative:*
reset the flag in `placeBid`. Rejected because it touches the bid
transaction for no gain while reopen is the only gateway. If a future path
reopens items without the service, the claim condition on
`highestBidderId` still prevents a wrong-winner message.

### D4. Reopen service as the single entry point
New `src/lib/services/auction-reopen.service.ts`:

- `findClosedItems(auctionId, now)`: published items closed under
  `isResultItemEnded`, for the settings page and validation.
- `reopenBidding({ auctionId, actorId, endDate, itemIds })`: runs in one
  `prisma.$transaction`:
  1. Load the auction and the selected items. Validate that `endDate` is
     null or in the future and that each item is published, in this
     auction and currently closed. If not, throw `BadRequestError` and
     change nothing.
  2. Snapshot `closedBefore` = closed published items with ≥1 bid.
  3. Update the auction `endDate`. Set the selected items to
     `endDate: null` and `lastUpdatedById: actorId`.
  4. Compute `reopened` = items in `closedBefore` that are open under the
     new dates. This covers both the selected items and items without
     their own end date reopened by the auction move.
  5. Set those items to `winnerNotified: false` and keep their
     `winnerNotified*` record.
  6. Return `{ auction, reopened: [{ id, name, winnerNotifiedUserId }] }`.
  After commit, it calls `notifyBiddingReopened` (D6) and publishes
  `ITEM_UPDATED { endDate: null }` for each reopened item.
- `auctionService.updateAuction` delegates to `reopenBidding` with
  `itemIds: []` when `input.endDate` is present, so both entry points share
  the transition logic. A form save with an unchanged or still-future end
  date gives an empty `closedBefore ∩ open-after` and sends nothing.

Reopened items get `endDate = null` (they follow the auction). This
matches "closed with the auction" and makes later extensions apply to them
automatically. *Alternative:* give them the new auction end date as their
own date, which keeps anti-snipe. Rejected because a later auction
extension would leave them closed again, the same bug.

### D5. Reopen API and permission
`POST /api/auctions/[id]/reopen`, `[withAuth, requireOwner,
withValidation(reopenSchema)]`, body `{ endDate: string | null, itemIds:
string[] (max 500) }`. Response: `{ auction, reopenedCount,
notifiedCount }`. Only the owner may call it, consistent with auction PATCH
and close. The item PATCH guard from canonical-item-end stays as it is.

### D6. Bidding-reopened notifications
`notificationService.notifyBiddingReopened({ auctionId, auctionName,
actorId, endDate, reopened })`:
- Recipients: distinct `Bid.userId` over the reopened item IDs (one
  `findMany` with `distinct`), excluding `actorId`.
- Per recipient, one `createNotification` of type `BIDDING_REOPENED`.
  `itemId` is set when the recipient bid on exactly one reopened item, and
  `auctionId` is always set. The text is English, server-rendered and
  composed by a pure, unit-tested `buildBiddingReopenedMessage()`.
  Variants: single or several items, notified winner ("your win on X is no
  longer final"), and with or without an end time. Times are formatted as
  `d MMM yyyy, HH:mm 'UTC'`, because the server has no user time zone.
- E-mail: for recipients who are `winnerNotifiedUserId` of a reopened item,
  `queueBiddingReopenedEmail` sends when `emailOnItemWon === true` (the same
  opt-in as the original win e-mail). New template
  `src/lib/email/templates/bidding-reopened.ts` and `EmailType
  BIDDING_REOPENED`.
- Sends run sequentially and are awaited before the API responds, which is
  safe on serverless like `queueNewItemEmails`. Expected volume is tens to
  low hundreds. No separate rate limit is needed: notifications only fire on
  a closed→open transition (D4), which bounds them to the owner's explicit
  actions.

### D7. Migration and backfill
One migration `<ts>_add_winner_notification_record` in plain SQL, with no
date comparisons:
1. `ALTER TABLE auction_items ADD COLUMN` for the three fields.
2. For `winnerNotified = 1` rows: set `winnerNotifiedUserId` to the
   `userId` of the latest `AUCTION_WON` notification for the item (ordered
   by `createdAt`, a column-to-column order). If there is none, use
   `highestBidderId`. `winnerNotifiedAt` comes from that notification.
   `winnerNotifiedAmount = currentBid` only when the user equals
   `highestBidderId`.
3. `UPDATE auction_items SET winnerNotified = 0 WHERE winnerNotified = 1
   AND highestBidderId IS NOT NULL AND winnerNotifiedUserId IS NOT
   highestBidderId`. This repairs auctions extended before the deploy.

The migration is checked against a copy of a database with seed data and
through `migrate-turso.ts` semantics, which apply the SQL as is. Rollback:
the new columns are additive and the old code ignores them. Reverting the
code leaves step 3's re-queued rows to the old notifier, which notifies the
new winner once (the intended outcome).

### D8. UI
- Settings page (`src/pages/auctions/[id]/settings.tsx`): the
  server-side props add `closedItems: { id, name, endDate, bidCount }[]`
  from `findClosedItems`. A "Reopen bidding" card renders when the auction
  has ended or `closedItems.length > 0`. It has a datetime field
  (prefilled with the auction end if that is in the future), an optional
  "no end time" toggle, and a checkbox list with select all/none, all
  selected by default. Submitting shows a confirm dialog stating the item
  count and that bidders will be notified. On success, a toast shows the
  counts, `isEnded` is updated and the list is refreshed. Follow the
  existing card/`ConfirmDialog` patterns, accessible labels, a responsive
  list and `messages/*/auction.json` keys in en, de, es, hu and pl. The
  `design-taste-frontend` skill is required for this work.
- `notification-bell.tsx` and `mobile-notification-sheet.tsx`: add a
  `BIDDING_REOPENED` icon (`tabler--clock-play`, info tone).

### Shared interfaces and ordering
1. Schema + migration + `npm run db:generate` (everything else depends on
   the generated client).
2. The notifier (D3) and the reopen service (D4) both depend on (1) and
   are independent of each other. The notification and e-mail functions
   (D6) are used by D4.
3. API route (D5), then the UI (D8).

## Risks / Trade-offs

- [The stale guard hides a legitimate late notification on a low-traffic
  instance whose notifier did not run for 14 days] → The window is a named
  constant and is logged, so the organizer can still contact winners from
  the results page.
- [A send fails after the claim, so the winner is not notified] → Same
  at-most-once behavior as today. The failure is logged with the item ID.
  A resend tool is a possible follow-up.
- [Reopened items lose their own end date and so anti-snipe] → Known
  limitation, documented. Anti-snipe for items that follow the auction is
  out of scope.
- [The in-app and e-mail text is English and the times are UTC] → This is
  the existing limitation for all notifications. The UTC label keeps the
  time unambiguous.
- [The `auction-custom-currencies-and-rules` change in progress touches
  `notification.service.ts` and `bid.service.ts`] → This change does not
  edit `bid.service.ts`. Merge the notification service changes carefully.
- [`updateAuction` now runs in a transaction and may send notifications,
  so form saves get slower] → Only when items actually reopen. Otherwise
  it costs one extra read.
- [A large auction reopened with hundreds of bidders] → Sequential sends
  are bounded by the number of bidders. If it ever becomes a problem, move
  them to background processing.

## Resolved Decisions

Accepted by the maintainer on 2026-11-22, as recommended:

1. Build on `claude/canonical-item-end` and merge it first (D1).
2. A previous winner who wins again after a reopen gets a new "won"
   notification, because they were told the win was no longer final.
3. The reopen notice goes in-app to every bidder on the reopened items.
   E-mail goes only to previous winners who opted into item-won e-mails.
   No new setting.
4. The reopen card pre-selects all closed items. The owner can untick
   items that have their own end date. Items that follow the auction end
   always reopen when the auction end moves and cannot be unticked
   (narrowed during implementation, accepted by the maintainer on
   2026-11-22; see Implementation Notes, D8 item selection).
5. Reopened items drop their own end date and follow the auction. Losing
   anti-snipe on them is an accepted limitation.
6. Items that ended more than 14 days before the notifier sees them are
   recorded without sending anything.
7. Only the owner can reopen bidding.
8. No admin "resend winner notification" action in this change.
9. The `emailOnItemWon` default is left to a separate change.

## Implementation Notes

Recorded during implementation on 2026-11-22. They do not change the spec
deltas. The D3 failed-send note departs from D3's "do not roll back", and
the D8 item-selection note narrows Resolved Decision 4. The maintainer
accepted both on 2026-11-22.

- **D3 claim condition.** The claim also repeats the ended-item condition
  (`endedItemsAwaitingNotificationWhere(now)` plus `id` and the
  `highestBidderId` snapshot). Without it, an owner reopen that lands
  between the notifier's read and its claim let the claim succeed on an
  open item, and the next winner was never notified.
- **D3 failed sends.** The base branch retried failed sends by releasing
  the claim. The implementation keeps that retry only when nothing was
  delivered: the claim (and the previous `winnerNotified*` record) is
  restored when `notifyAuctionWon` throws and no `AUCTION_WON` row for this
  item and winner exists from this run. A failure after the in-app
  notification exists is logged and the claim is kept, so the in-app
  message stays at most once.
- **D4 counts.** `closedBefore` covers every closed published item, not
  only items with bids, so `reopenedCount` counts every item that moved from
  closed to open. Items without bids produce no recipients. The
  "no longer final" text and e-mail go only to a recorded winner whose
  notification was still current (`winnerNotified = true`) at reopen time.
  `reopenBidding` accepts `itemIds: []` (it then only moves the end date),
  and `actorId` may be null for internal callers.
- **D4 remaining race.** With the better-sqlite3 adapter, a notifier claim
  that commits between the reopen transaction's read and its writes can
  still send the old winner "You won" just before the reopen notice. The
  record stays pending, so the next close notifies the right winner. The
  libSQL adapter (production) serializes every statement and holds its
  mutex for a whole interactive transaction within one process
  (`auction-end.libsql.test.ts` runs the overlap and reopen-race tests on
  it). Across processes, at-most-once rests on the single conditional
  claim `UPDATE`; two separate clients against remote Turso were not
  exercised.
- **Settings end date.** A settings save with an end date goes through the
  reopen transition, so the main form shows the end date in the browser's
  local time, keeps it in step with the stored end after reopen, end-now and
  data refreshes, and refuses an unparseable value. It sends `endDate` only
  when the owner edited or cleared the field, as an ISO string with an
  offset (or null); an untouched field is left out, so a stale tab cannot
  re-close or re-extend an auction changed elsewhere. A refresh that brings
  a different stored end replaces an unsaved edit of that field. The PATCH
  schema requires an ISO date-time with offset, like the reopen schema.
  Before, the form showed UTC as local time and sent a value without an
  offset that the server read in its own time zone. The auction create page
  has the same pre-existing pattern and is not changed here.
- **Dependency.** The base branch was rewritten during implementation
  (69cfa95 replaced by 8be8f93, which drops the overlap claim of f9ad70d;
  ad31552 and 96b19c8 added). This change carries the claim itself (D3).
- **D7 migration name.** The migration is
  `20261122180000_add_winner_notification_record`, so it sorts after the
  base branch's `20261122170000_mark_past_null_dated_winners_notified`.
  Items that backfill marks as notified get the highest bidder as the
  recorded winner.
- **D8 item selection.** Items without their own end date follow the
  auction, so moving the auction end always reopens them (auction-reopen
  spec, "Moving the auction end reopens items that follow it"). The card
  shows them as included and not deselectable; only items with their own
  end date can be unticked.
