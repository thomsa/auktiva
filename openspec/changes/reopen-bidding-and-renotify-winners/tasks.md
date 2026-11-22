# Tasks

Prerequisite: `claude/canonical-item-end` is merged into `main`, or this
branch is rebased onto it (design D1). Before editing, check
`git rev-parse --show-toplevel` in each worktree. Use `.nvmrc`, then run
`npm ci` and `npm run db:generate`.

Parallelism: group 1 runs first. Groups 2 and 3 can then run in parallel
(file ownership is listed per group). Group 4 needs 3. Group 5 needs 4.
Group 6 runs last. Browser QA is required for group 5 and the end-to-end
check in 6.2.

## 1. Schema, migration and backfill (owner: `prisma/`)

- [x] 1.1 Add `winnerNotifiedUserId String?`, `winnerNotifiedAmount Float?` and `winnerNotifiedAt DateTime?` to `AuctionItem`, and `BIDDING_REOPENED` to `NotificationType` and `EmailType` in `prisma/schema.prisma`. Verify that `npm run db:generate` succeeds.
- [x] 1.2 Create migration `prisma/migrations/<timestamp>_add_winner_notification_record/migration.sql` with the three `ALTER TABLE` statements and the D7 backfill: copy the user and time from the latest `AUCTION_WON` notification, fall back to `highestBidderId`, then re-queue rows whose recorded user is not the current highest bidder. Use no SQL date comparisons. Verify that `npx prisma migrate dev` applies cleanly on a fresh local SQLite DB and that `npx prisma migrate diff` shows no drift.
- [x] 1.3 Add `src/lib/services/winner-notification-backfill.test.ts`, which builds a SQLite DB from the migrations before the new one (reuse the canonical-item-end harness pattern), seeds the three spec cases ("Unchanged past auction", "Auction extended before the upgrade", "Won notification was deleted"), applies the new migration and asserts the resulting records and `winnerNotified` values. Verify with `npx tsx --test src/lib/services/winner-notification-backfill.test.ts`.

## 2. Winner notifier (owner: `src/lib/services/auction-end.service.ts` and its test)

- [x] 2.1 Rewrite `processEndedItems()` to claim each candidate with a conditional `updateMany` (`winnerNotified: false` and the `highestBidderId` snapshot) that writes the `winnerNotified*` record, and to send messages only when `count === 1` (design D3). Verify with a test in `auction-end.service.test.ts` that runs two `processEndedItems()` calls at once and gets exactly one `AUCTION_WON` notification (spec: "Concurrent notifier runs").
- [x] 2.2 Add the `STALE_WINNER_NOTIFICATION_MS` (14 days) guard, which records the winner and sends nothing when the effective end is older than that. Verify with tests for "Auction that ended long ago" and "Recently ended item", including an item that follows the auction end.
- [x] 2.3 Add notifier tests for "New winner after an extension", "Previous winner is not told they won again", "Same winner after a reopen" (pending flag reset by hand in the fixture), "Repeated runs after notification", "Draft item" and "Item in an auction without an end date". Verify with `npx tsx --test src/lib/services/auction-end.service.test.ts`.

## 3. Bidding-reopened messages (owner: `src/lib/services/notification.service.ts`, `src/lib/email/service.ts`, `src/lib/email/templates/bidding-reopened.ts`, `src/lib/email/templates/index.ts`)

- [x] 3.1 Add a pure `buildBiddingReopenedMessage()` (title and message for a single item or several, the notified-winner variant, and with or without an end time, with the time formatted as `d MMM yyyy, HH:mm UTC`). Verify with unit tests in `src/lib/services/notification.service.test.ts` that cover the scenarios "Single item with an end date", "Several items" and "Notified winner of a reopened item".
- [x] 3.2 Add `notifyBiddingReopened({ auctionId, auctionName, actorId, endDate, reopened })`. It finds the distinct bidders on the reopened items, leaves out the actor, creates one `BIDDING_REOPENED` notification each, and returns the recipient count. Verify with an SQLite-backed test for "Bidders across several items", "Reopened item without bids", "Members who did not bid" and "The owner bid on a reopened item".
- [x] 3.3 Add the `bidding-reopened` MJML template and `queueBiddingReopenedEmail`, which sends only when `emailOnItemWon === true`, and call it from `notifyBiddingReopened` for notified winners only. Verify with tests for "Notified winner with item-won e-mails enabled" and "Bidder who was not a notified winner" (check the `EmailLog` rows, or stub the sender).

## 4. Reopen service and API (owner: `src/lib/services/auction-reopen.service.ts`, `src/lib/services/auction.service.ts`, `src/lib/api/handlers/auction.handlers.ts`, `src/lib/api/handlers/index.ts`, `src/pages/api/auctions/[id]/reopen.ts`)

- [x] 4.1 Implement `findClosedItems()` and `reopenBidding()` according to design D4. It runs in a transaction, validates everything before writing, sets the selected items to `endDate = null`, computes `reopened` from the before and after states, resets `winnerNotified` on reopened items, and then calls `notifyBiddingReopened` and publishes `ITEM_UPDATED`. Verify with SQLite-backed tests in `auction-reopen.service.test.ts` for "Owner reopens an ended auction", "Stamped item reopens", "Auction extended again later", "Item from another auction", "Item already open", "End date not in the future" and "Bidding continues from the current price" (bids, `currentBid` and `highestBidderId` unchanged).
- [x] 4.2 Route `updateAuction`'s end date changes through the reopen transition with `itemIds: []`. Verify with tests for "Auction form extension", "Extension before the auction ended", "Owner saves settings again after a reopen" and "Owner corrects the new end time".
- [x] 4.3 Add `reopenSchema` (zod: `endDate` string|null, `itemIds` array of at most 500 entries), the `reopenAuction` handler and `src/pages/api/auctions/[id]/reopen.ts` with `[withAuth, requireOwner, withValidation]`. Verify with handler tests for "Admin or bidder tries to reopen" (403) and a successful owner call that returns `reopenedCount`/`notifiedCount`.
- [x] 4.4 Confirm that the canonical-item-end `wouldReopenEndedItem` guard still rejects item-level reopens. Verify that the existing guard tests pass and add one for "Item editor extends an ended item" if it is missing.

## 5. UI (owner: `src/pages/auctions/[id]/settings.tsx`, `src/components/notifications/*`, `messages/{en,de,es,hu,pl}/auction.json`; load `design-taste-frontend` before editing)

- [x] 5.1 Load and apply the `design-taste-frontend` skill. Add `closedItems` to the settings page's server-side props and build the "Reopen bidding" card: end date field, "no end time" toggle, item checklist with select all/none (all selected by default), and a confirm dialog. It calls `POST /api/auctions/[id]/reopen`, shows a toast with the counts on success and updates the ended state. Verify that `npx tsc --noEmit` and `npm run lint` pass, and use browser QA for "Auction live but items closed" and "Successful reopen feedback" at mobile and desktop widths.
- [x] 5.2 Add the `BIDDING_REOPENED` icon case to `notification-bell.tsx` and `mobile-notification-sheet.tsx`. Verify in browser QA that a reopen notification shows the new icon in both views (spec: "Recipient is online").
- [x] 5.3 Add the new UI strings to `messages/{en,de,es,hu,pl}/auction.json` with matching key sets. Verify that every locale has the same keys (a key-diff script or the existing i18n check) and that the card renders in `de` and `hu` without overflow.

## 6. Integration checks

- [x] 6.1 Run `npx tsx --test` over all touched and existing test files, then `npm run lint`, `npx tsc --noEmit` and `npm run build`. Verify that all pass and record the exact commands and results.
- [x] 6.2 End-to-end browser QA on a local SQLite DB with its own port and test data. Seed an auction, two bidders and a published item. Close the auction ("End auction now"), poll notifications (user A gets "won"), reopen through the settings card (user A gets "no longer final"), have user B outbid, end the auction again, and poll (user B gets "won", user A gets nothing new). Verify the notification list for each user and the item page state with screenshots.

## 7. Production upgrade readiness (added 2026-11-22, before v1.23.0)

- [x] 7.1 Dry-run the upgrade on libSQL. Build a database from the migrations that shipped in v1.22.0, seed v1.22.0 data, run the pre-check, and apply the two new migrations the way `scripts/migrate-turso.ts` does, twice. Then run the v1.23.0 notifier through the libSQL adapter. Verify with `src/lib/services/winner-migration-upgrade.test.ts`.
- [x] 7.2 Cover the transition. Show that v1.23.0 code on the v1.22.0 schema fails, and that the v1.22.0 notifier on the migrated schema sends only correct messages but leaves stale records. Then repair and deploy, and show that nobody is messaged twice. Verify with `src/lib/services/winner-migration-window.test.ts`.
- [x] 7.3 In the migration, record (instead of re-queuing) changed winners whose effective end is more than 14 days old (design D7 step 3), and let the data steps run again on their own. Update `winner-notification-backfill.test.ts` to use relative dates and add the stale and still-open cases.
- [x] 7.4 Add `scripts/upgrade/v1.23.0/{precheck,backfill,repair,verify}.sql` and `scripts/upgrade/run-sql.ts`. A test keeps `backfill.sql` equal to the migrations' data statements.
- [x] 7.5 Write "Upgrading to v1.23.0" in `docs/content/developers/upgrading.mdx`: the operator-facing changes since v1.22.0 and the Vercel/Turso and self-hosted runbooks, with the window and rollback.

## Verification record

Candidate e5acce3 on `claude/winner-renotify`, stacked on
`claude/canonical-item-end` 96b19c8. Independent QA and browser QA both
passed on that SHA (2026-11-22), Node 22.21.1:

- `LOG_LEVEL=silent npx tsx --test $(git ls-files 'src/**/*.test.ts' | sort)`:
  135 tests, 135 pass. Includes the libSQL adapter run
  (`auction-end.libsql.test.ts`, migrations applied with `executeMultiple`).
- `npx tsc --noEmit`: pass. `npm run lint`: 0 errors (6 existing
  `no-img-element` warnings in untouched files). `npm run build`: pass.
- `openspec validate reopen-bidding-and-renotify-winners --strict`: valid.
  `npx prisma migrate diff --from-migrations prisma/migrations --to-schema
  prisma/schema.prisma --exit-code`: no difference.
- Locales: the new `auction.settings.reopen.*` and `endDateInvalid` keys match
  in all five locales. de/es/hu/pl were already missing
  `auction.settings.adminEditingDefaults`, `defaultItemsEditableByAdmin` and
  `defaultItemsEditableByAdminDescription` on the base; not changed here.
- Browser QA (isolated SQLite DB, port 3427, `next dev --webpack`, default
  and America/New_York server zones): 6.2 end to end, mixed item groups,
  stale tabs in both directions, the reopen card's 400 refresh, edited and
  cleared end dates, invalid dates, 375px and desktop in en/de/hu with
  light and dark themes.
- Not covered: real-time push (soketi not available locally; the
  bidding-reopened notification and its icon were verified arriving through
  the polling fallback without a reload), real e-mail delivery (EmailLog
  rows are asserted with a local SMTP stub), Firefox and Safari.

## Workflow follow-up

- Hand off to `publisher` after QA and browser QA pass for the same revision.
- Archive the change once it is merged and reviewed.
