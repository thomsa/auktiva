## ADDED Requirements

### Requirement: Bid input matches configured currency representation

The system SHALL render bid input controls based on auction currency configuration, including single-value and denomination-based entry patterns.

#### Scenario: Render denomination input controls

- **WHEN** an auction currency profile defines denomination components
- **THEN** the bid UI presents one input per component using configured labels and ordering

#### Scenario: Render scalar input for single-value currency

- **WHEN** an auction currency profile defines scalar currency input
- **THEN** the bid UI presents a single numeric field with the configured fraction behavior

### Requirement: Bid placement uses normalized comparison and rule validation

Bid placement MUST compute normalized comparison value and enforce auction rules before persisting bid and updating current highest state.

#### Scenario: Successful bid placement with valid rules

- **WHEN** a bidder submits a bid that is higher than current highest and passes all configured rules
- **THEN** the system stores the bid, updates item highest bid state, and emits bid events

#### Scenario: Bid rejected by validation rules

- **WHEN** a bidder submits a bid that fails rule evaluation
- **THEN** the system returns a validation error explaining the violated rule and does not mutate bidding state

### Requirement: Bid history and surfaces preserve entered representation

The system SHALL preserve and present the user-entered bid representation in history and related surfaces while also using normalized values for ordering semantics.

#### Scenario: Display entered denomination representation

- **WHEN** bid history is rendered for an item using denomination currency mode
- **THEN** each bid displays its entered components in configured format

### Requirement: Realtime and exports are currency-aware

Realtime bid events and exported data MUST include enough currency metadata and normalized value data to reconstruct ordering and display.

#### Scenario: Realtime payload includes currency context

- **WHEN** a new bid event is published
- **THEN** the payload includes currency profile reference and normalized value alongside displayable bid representation

#### Scenario: Export includes normalized and display values

- **WHEN** auction results are exported
- **THEN** export rows include both display representation and normalized comparison value for each bid/result entry
