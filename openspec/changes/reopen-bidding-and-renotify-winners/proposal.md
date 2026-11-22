# Proposal

## Why

An organizer let a charity auction end, then extended it and asked whether
Auktiva could "reset winners" so the new winners get the e-mail. It cannot:
the auction-end notifier sets `winnerNotified = true` once and never looks at
the item again, so a winner who takes the lead during an extension is never
told. Extending is also only half supported. Moving the auction end date
reopens items that follow the auction, but items that "End auction now"
stamped with their own end date stay closed, and the item API refuses to
reopen them. The auction can look live while its items are closed, and the
previous winners keep a "You won" message that is no longer true.

## What Changes

- Record who was told they won an item, at what amount and when, instead of
  only a boolean. Notify the winner whenever an ended item has a winner who
  has not been told yet: after a reopen and re-close, and after a winner
  change. An item that is not reopened never notifies the same winner twice,
  even when several notifier runs overlap.
- Give owners a "Reopen bidding" action. It sets a new auction end date and
  reopens the closed items the owner selects, which then follow the auction
  end again. Item-level reopening stays blocked. Saving a later end date in
  the auction form still reopens the items that follow the auction, and
  those items go through the same notifications.
- When items reopen, send one in-app "bidding is open again until <time>"
  notification to each user who bid on them. A previously notified winner
  is told the win is no longer final, and also gets an e-mail if they opted
  into item-won e-mails. The win notification is reset, so the winner at the
  next close is notified again.
- Use the canonical item-end rule (an item's own end date wins, otherwise it
  ends with the auction) for winner notifications, so items that follow the
  auction end also notify their winners. This builds on the unmerged
  `claude/canonical-item-end` branch.
- Migration with backfill: existing `winnerNotified = true` rows keep the
  user who was told, taken from their `AUCTION_WON` notification, or from
  the highest bidder when that is missing. Rows where that person is no
  longer the highest bidder are queued again. This also repairs auctions
  that were already extended before the deploy. Items that ended more than
  14 days before the upgrade, or before the notifier first sees them, are
  recorded without sending late messages. The upgrade guide gives
  operators a pre-check, the migrate-then-deploy order and a post-deploy
  repair (`scripts/upgrade/v1.23.0`).
- New notification type and e-mail type `BIDDING_REOPENED`, with icons in
  the notification bell and the mobile sheet. New UI strings are added in
  all five locales (en, de, es, hu, pl).

Out of scope: an admin "resend winner notification" button, changing the
`emailOnItemWon` default, localizing server-rendered notification and e-mail
text (already English-only for every type), and anti-snipe for items that
follow the auction end.

## Capabilities

### New Capabilities

- `winner-notification`: deciding when the winner of an ended item is
  notified, recording who was told, re-notifying after winner changes and
  reopenings, and keeping existing records compatible.
- `auction-reopen`: how an owner reopens bidding on an ended or partly
  closed auction, which items reopen, and the permissions and invariants
  that apply.
- `bidding-reopened-notification`: who is told that bidding reopened, on
  which channels, with what content, and how duplicates are avoided.

### Modified Capabilities

None. There are no baseline specs in `openspec/specs/` yet.

## Impact

- **Schema/migration**: `AuctionItem` gains `winnerNotifiedUserId`,
  `winnerNotifiedAmount` and `winnerNotifiedAt`. `NotificationType` and
  `EmailType` gain `BIDDING_REOPENED`. Backfill SQL runs inside the
  migration, which is applied by both `prisma migrate` and
  `scripts/migrate-turso.ts`.
- **Services**: `src/lib/services/auction-end.service.ts` (claiming and
  notification rules), new `src/lib/services/auction-reopen.service.ts`,
  `src/lib/services/auction.service.ts` (end date update routes through
  reopen detection), `src/lib/services/notification.service.ts`, and
  `src/lib/email/service.ts` plus a new template.
- **API**: new `POST /api/auctions/[id]/reopen` (owner only).
  `PATCH /api/auctions/[id]` triggers reopen notifications when its end
  date change reopens items. The item PATCH reopen guard is unchanged.
- **UI**: the auction settings page gets a "Reopen bidding" card, and the
  notification bell and mobile sheet get an icon for the new type.
  Translations go in `messages/{en,de,es,hu,pl}`.
- **Dependency**: land `claude/canonical-item-end` (implemented on its tip
  96b19c8: 67b91e8, e345f4b, 8be8f93, ad31552 and 96b19c8)
  first. This change reuses its ended-item query, its reopen guard and its
  SQLite notifier test harness.
- **Realtime**: publishes `ITEM_UPDATED` for reopened items. Notifications
  already reach clients through `NOTIFICATION_NEW`.
