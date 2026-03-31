## ADDED Requirements

### Requirement: Auction owners can manage custom currencies

The system SHALL allow authorized auction managers to create, update, and archive multiple custom currencies at auction scope using an auction settings modal.

#### Scenario: Create custom currency in auction modal

- **WHEN** an authorized user submits a valid custom currency definition in the auction modal
- **THEN** the system stores the currency under that auction and returns it in auction currency settings

#### Scenario: Reject unauthorized currency changes

- **WHEN** a non-authorized user attempts to create or edit auction custom currencies
- **THEN** the system denies the operation with an authorization error

### Requirement: Custom currency definition includes fraction policy

Each custom currency definition MUST include whether fractional values are allowed, and the system MUST expose example input formatting for integer-only and decimal modes.

#### Scenario: Integer-only currency definition

- **WHEN** the organizer sets fraction policy to integer-only
- **THEN** bid input and validation for that currency accept only whole numbers

#### Scenario: Decimal currency definition

- **WHEN** the organizer sets fraction policy to decimal mode
- **THEN** bid input and validation for that currency accept decimal values according to configured precision

### Requirement: Auction currency behavior applies to all items

Currency behavior for an auction MUST be governed only by the auction currency profile and MUST NOT be overridden at item level.

#### Scenario: Item uses auction currency behavior

- **WHEN** an item is created or edited in an auction with custom currency settings
- **THEN** the item inherits the auction currency behavior without offering item-level currency behavior override

### Requirement: Items can define minimum bid constraints

Items SHALL allow configuration of minimum bid values and increments within the auction-defined currency semantics.

#### Scenario: Item minimum in auction-defined units

- **WHEN** an organizer sets minimum starting value and minimum increment for an item
- **THEN** the system stores and validates those minima using the auction currency profile and rules
