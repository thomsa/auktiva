# Spec Delta

## Purpose

Defines when the winner of an ended auction item is notified, how the system records who was told, and how it re-notifies after the winner changes or bidding reopens without sending duplicates.

## ADDED Requirements

### Requirement: Winner notification uses the effective item end
The system SHALL treat a published item as ended for winner notification when its own end date has passed, or, if it has no end date of its own, when its auction's end date has passed. Draft items and items without a highest bidder SHALL NOT be notified.

#### Scenario: Item with its own past end date
- **WHEN** a published item's own end date has passed and it has a highest bidder who has not been notified
- **THEN** the system notifies that bidder that they won the item

#### Scenario: Item following the auction end
- **WHEN** a published item has no end date of its own, its auction's end date has passed, and it has a highest bidder who has not been notified
- **THEN** the system notifies that bidder that they won the item

#### Scenario: Item in an auction without an end date
- **WHEN** a published item has no end date of its own and its auction has no end date
- **THEN** the system does not send a winner notification for it

#### Scenario: Draft item
- **WHEN** an unpublished item's end has passed and it has a highest bidder
- **THEN** the system does not send a winner notification for it

### Requirement: Winner notification records who was told
When the system notifies a winner, it SHALL record the notified user, the winning amount at that time and when the notification was sent, and keep that record until the item's winner notification is reset.

#### Scenario: Record written on notification
- **WHEN** the system notifies user A that they won an item at amount 120
- **THEN** the item records user A as the notified winner, 120 as the notified amount and the notification time

### Requirement: Winner notification is sent at most once per close
For a given ended item and winner, the system SHALL send the win notification (in-app, plus the opted-in e-mail) at most once, including when several notifier runs process the same item at the same time.

#### Scenario: Concurrent notifier runs
- **WHEN** two notifier runs pick up the same ended item at the same time
- **THEN** the winner receives exactly one in-app win notification and at most one win e-mail

#### Scenario: Repeated runs after notification
- **WHEN** the notifier runs again after an item's winner has been notified, and the item's winner has not changed and the item has not been reopened
- **THEN** no further win notification is sent

### Requirement: Winner change triggers a new winner notification
When an ended item's current highest bidder differs from the recorded notified winner, the system SHALL notify the current highest bidder and replace the record.

#### Scenario: New winner after an extension
- **WHEN** user A was notified as winner, bidding reopened, user B placed the highest bid and the item ended again
- **THEN** user B receives the win notification and the item records user B as the notified winner

#### Scenario: Previous winner is not told they won again
- **WHEN** user B replaces user A as winner of an ended item
- **THEN** user A receives no new win notification

### Requirement: Reopening resets the winner notification
When an item reopens for bidding, the system SHALL mark its winner notification as pending again while keeping the previous record for reference. At the next close, the winner at that time SHALL be notified, even if it is the same user who was notified before.

#### Scenario: Same winner after a reopen
- **WHEN** user A was notified as winner, the item was reopened, nobody outbid user A and the item ended again
- **THEN** user A receives a win notification again, confirming the win is now final

#### Scenario: Reopened item that is still open
- **WHEN** an item has been reopened and its end has not passed yet
- **THEN** no win notification is sent for it

### Requirement: Existing notification records stay compatible
On upgrade, items already marked as notified SHALL keep a recorded notified winner. The system SHALL use the user from the item's latest won notification, or the current highest bidder if there is none. Items whose recorded winner differs from the current highest bidder SHALL become pending again.

#### Scenario: Unchanged past auction
- **WHEN** an item was marked as notified before the upgrade and its highest bidder is the user who received the won notification
- **THEN** after the upgrade that user is recorded as the notified winner and no new notification is sent

#### Scenario: Auction extended before the upgrade
- **WHEN** an item was marked as notified for user A before the upgrade and user B has since become the highest bidder
- **THEN** after the upgrade the item is pending, and user B is notified once the item has ended

#### Scenario: Won notification was deleted
- **WHEN** an item was marked as notified before the upgrade but its won notification no longer exists
- **THEN** the current highest bidder is recorded as the notified winner and no new notification is sent

### Requirement: Stale ended items are recorded without late messages
When the notifier first finds a pending item whose effective end was more than 14 days ago, the system SHALL record its current highest bidder as the notified winner without sending an in-app notification or e-mail.

#### Scenario: Auction that ended long ago
- **WHEN** a pending item with a highest bidder has an effective end more than 14 days in the past
- **THEN** the system records the winner and sends no message

#### Scenario: Recently ended item
- **WHEN** a pending item with a highest bidder has an effective end 2 days in the past
- **THEN** the system sends the win notification

### Requirement: Win e-mail follows the user's setting
The win e-mail SHALL be sent only to winners who enabled item-won e-mails. The in-app win notification SHALL be sent regardless of that setting.

#### Scenario: E-mail disabled
- **WHEN** a winner has not enabled item-won e-mails
- **THEN** they receive the in-app win notification and no e-mail
