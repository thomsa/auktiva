## ADDED Requirements

### Requirement: Auction rule engine uses structured rule types

The system MUST evaluate bid validity using structured, parameterized rule types configured per auction currency profile, and MUST NOT execute arbitrary user code.

#### Scenario: Evaluate configured structured rules

- **WHEN** a bid is submitted in an auction with custom currency rules
- **THEN** the system evaluates the bid against enabled structured rule types and returns deterministic pass/fail results

#### Scenario: Reject unsupported rule type

- **WHEN** a configuration payload includes an unknown or unsupported rule type
- **THEN** the system rejects the configuration with a validation error

### Requirement: Conversion rates normalize bid values

The system SHALL normalize bid values to a comparison base unit using auction-configured conversion rates.

#### Scenario: Convert denomination bid to base unit

- **WHEN** a bidder submits denomination-based values mapped by conversion rates
- **THEN** the system computes and stores the normalized base-unit value for comparison

### Requirement: Minimum increment semantics are configurable

The system SHALL enforce minimum increment using the configured increment unit and currency semantics for the auction.

#### Scenario: Increment in smallest configured unit

- **WHEN** the auction config defines minimum increment in a smallest unit
- **THEN** a submitted bid below current-highest plus that increment is rejected

### Requirement: Component ratio constraints can be enforced

The system SHALL support constraints requiring a minimum percentage contribution from a configured component (for example copper share).

#### Scenario: Reject bid below component ratio threshold

- **WHEN** a bid's configured component contribution is below the required minimum ratio
- **THEN** the system rejects the bid with a rule violation message

### Requirement: Equal normalized value is not a higher bid

The system MUST treat bids equal to current highest normalized value as not higher and reject them for placement.

#### Scenario: Equal nominal value submitted

- **WHEN** a bidder submits a bid that normalizes to exactly the current highest value
- **THEN** the system rejects it as not higher than the current bid
