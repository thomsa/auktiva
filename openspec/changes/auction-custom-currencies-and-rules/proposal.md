## Why

Auktiva currently supports only single-value monetary bidding with fixed decimal assumptions, which does not fit game economies (e.g., LARP) that use custom currencies and denomination-based logic. This change is needed now to let auction organizers define auction-specific currencies and bid rules directly in product, reducing bidder confusion and manual post-auction reconciliation.

## What Changes

- Add auction-scoped custom currency profiles managed from the auction UI (modal-based creation/editing).
- Allow multiple custom currencies per auction, each with configurable conversion rate and fraction mode (`integer-only` or `decimal`).
- Make auction currency behavior authoritative for all items in that auction (no item-level currency behavior override).
- Allow items to configure minimum bid values/constraints within the selected auction currency profile.
- Add structured bid calculation rules configurable by organizers (e.g., denomination schemas, minimum increment unit, minimum component ratio).
- Extend bid validation to evaluate user-entered bid components against normalized value and configured auction rules.
- Update bidding UI and downstream surfaces (history/results/export/notifications) to support custom currency representations.

## Capabilities

### New Capabilities

- `auction-custom-currency-management`: Define and manage custom currencies and conversion rates at auction level, including fraction policy.
- `auction-currency-rule-engine`: Configure and enforce structured bid calculation and validation rules (increment semantics, denomination constraints, component ratios).
- `currency-aware-bidding-and-display`: Capture, validate, compare, and display bids using auction-defined currency formats and normalized value semantics.

### Modified Capabilities

- None.

## Impact

- Prisma schema and migrations for auction-scoped currency profiles and bid rule configuration.
- Auction settings API and UI to create/edit currencies in an auction modal.
- Item create/edit APIs and forms to set minimum bid constraints in auction-defined units.
- Bid API/service validation logic, realtime payloads, and bid form UX.
- Formatting layers, exports, notifications, and i18n messages that currently assume fixed two-decimal currency amounts.
- Documentation updates for user/admin setup and developer implementation details.
