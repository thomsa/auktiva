## Context

Auktiva currently models currency and bids as a single scalar amount (`Float`) with broad two-decimal assumptions in UI, API validation, exports, notifications, and realtime payloads. The target change introduces auction-scoped custom currency behavior that can include integer-only currencies, decimal currencies, and denomination-based bidding semantics (such as gold/silver/copper) while preserving deterministic bid comparison.

This change is cross-cutting across Prisma schema, auction/item/bid services, API contracts, frontend forms, and formatting/rendering layers. It also requires migration strategy because current data model assumes a single amount field with no structured rule metadata.

## Goals / Non-Goals

**Goals:**

- Enable auction organizers to define and manage multiple custom currencies from auction settings UI (modal flow).
- Enforce auction-level currency behavior for all items in an auction.
- Allow items to configure minimum bid constraints within auction currency semantics.
- Support organizer-configurable structured bid rules (fraction policy, conversion rates, denomination schema, increment semantics, ratio constraints).
- Preserve strict and transparent bid ordering by normalizing bids into deterministic base units.
- Keep rule execution safe by avoiding user-defined executable code.

**Non-Goals:**

- Supporting arbitrary expression languages or script execution for bid calculations.
- Cross-auction global custom currencies in this phase (scope is auction-owned configurations).
- Retroactive reinterpretation of historical bids from already-finished auctions beyond explicit migration behavior.
- Replacing all existing fixed currencies immediately; existing mode remains supported.

## Decisions

1. Auction-level currency profile is the source of truth

- Decision: Introduce an auction-owned currency configuration layer that all items in the auction must use for currency behavior.
- Rationale: Matches product rule that items cannot override currency behavior and keeps bidder experience consistent within one auction.
- Alternative considered: Item-level currency behavior override. Rejected due to user requirement and higher cognitive overhead.

2. Separate “display/input representation” from “comparison value”

- Decision: Store both user-entered bid representation and a normalized base-unit numeric value for comparison.
- Rationale: Denomination composition (e.g., copper share) may have meaning, but winner ordering still needs deterministic numeric comparison.
- Alternative considered: Compare only by structured components. Rejected because it complicates ranking and tie logic.

3. Structured rule engine configuration, not executable formulas

- Decision: Rule types are predefined and parameterized (e.g., minimum increment, minimum component ratio, denomination schema).
- Rationale: Safe, testable, and auditable; avoids injection/security and runtime instability.
- Alternative considered: Free-form formulas. Rejected for safety and maintainability reasons.

4. Fraction policy is explicit per custom currency

- Decision: Each custom currency defines whether fraction is allowed, with a canonical precision (0 for integer mode, 2 for decimal mode in v1).
- Rationale: Directly addresses product need and simplifies UI/input validation.
- Alternative considered: Unlimited precision. Rejected due to complexity and UX ambiguity.

5. Migration by additive schema evolution and staged rollout

- Decision: Add new auction currency/rule entities and bid normalized fields while keeping legacy scalar amount paths during transition.
- Rationale: Reduces risk; enables gradual switch of API/UI behavior per auction configuration.
- Alternative considered: Big-bang replacement. Rejected due to high breakage risk across many surfaces.

## Risks / Trade-offs

- [Cross-cutting regression surface] → Mitigation: feature flag or configuration gate by auction mode; incremental rollout; focused tests around bid validation and display.
- [Rule misconfiguration by organizers] → Mitigation: modal previews, guardrails, and schema-level validation with actionable errors.
- [Data model complexity increase] → Mitigation: keep rule types small and explicit, with clear ownership and serialization boundaries.
- [Legacy/UI formatting inconsistencies] → Mitigation: centralize currency-format rendering helpers and remove ad-hoc `toFixed(2)` paths over time.
- [Migration ambiguity for existing auctions] → Mitigation: preserve legacy behavior for auctions without custom currency profiles; opt-in migration path.
