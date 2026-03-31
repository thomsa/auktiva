## 1. Data Model and Migration

- [x] 1.1 Add auction-scoped custom currency profile models (currencies, conversion settings, fraction policy, rule configs) in `prisma/schema.prisma`
- [x] 1.2 Add bid storage fields for normalized comparison value and structured entered representation
- [x] 1.3 Create and validate Prisma migration for new currency/rule entities and bid fields
- [x] 1.4 Update seed strategy for development data to include representative custom currency configurations

## 2. Backend Services and Validation

- [x] 2.1 Implement auction currency profile service for create/update/archive/read operations with authorization checks
- [x] 2.2 Implement structured rule evaluator (increment, ratio, denomination, equality rejection) without executable user code
- [x] 2.3 Refactor bid placement validation to use auction currency profile and normalized comparison value
- [x] 2.4 Update item service/contracts to support item minimum constraints within auction-defined currency behavior
- [x] 2.5 Update realtime event payload contracts to include currency context and normalized values

## 3. API Surface

- [x] 3.1 Add auction settings API endpoints for managing custom currencies and auction currency rules
- [x] 3.2 Update item create/edit endpoints to accept and validate item-level minimum constraints in auction currency units
- [x] 3.3 Update bid placement endpoint schema from scalar-only assumptions to currency-profile-aware payloads
- [x] 3.4 Add consistent error payloads for rule violations (e.g., equal-not-higher, ratio threshold, increment failures)

## 4. Frontend UX

- [ ] 4.1 Build auction modal UI for custom currency creation/editing (fraction mode, conversion, rule setup, previews)
- [ ] 4.2 Update item forms to expose minimum-value configuration constrained by auction currency profile
- [x] 4.3 Refactor bid form to render scalar or denomination inputs based on auction currency configuration
- [ ] 4.4 Update bid display surfaces (item page, bid history, listings/results sidebars) to show configured currency representation
- [x] 4.5 Add validation feedback UX for structured rule failures in bid submission flow

## 5. Cross-Cutting Updates

- [ ] 5.1 Replace hardcoded two-decimal formatting paths with centralized currency-aware formatting utilities
- [ ] 5.2 Update exports and notification templates to include display representation and normalized value metadata
- [ ] 5.3 Add/adjust i18n keys for custom currency modal, fraction guidance examples, and rule validation errors

## 6. Verification and Documentation

- [ ] 6.1 Add targeted tests for rule evaluator and bid comparison semantics (including equal-value rejection)
- [ ] 6.2 Add integration tests for auction currency configuration and bid placement API flows
- [x] 6.3 Add user documentation for configuring custom auction currencies and rules
- [x] 6.4 Add developer documentation covering schema, rule engine behavior, and migration considerations
