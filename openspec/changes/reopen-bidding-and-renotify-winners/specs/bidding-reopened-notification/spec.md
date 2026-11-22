# Spec Delta

## Purpose

Tells bidders, and especially previously notified winners, that bidding has reopened on items they bid on and when it now closes, so a stale "You won" message is corrected and bidders can bid again.

## ADDED Requirements

### Requirement: Bidders on reopened items are notified
When one or more items reopen in a single owner action, the system SHALL send one in-app "bidding reopened" notification to each distinct user who has a bid on at least one of those items.

#### Scenario: Bidders across several items
- **WHEN** the owner reopens items X and Y, user A bid on both and user B bid only on Y
- **THEN** user A receives one notification and user B receives one notification

#### Scenario: Reopened item without bids
- **WHEN** the only reopened item has no bids
- **THEN** no bidding-reopened notification is sent

#### Scenario: Members who did not bid
- **WHEN** items reopen in an auction with members who never bid on them
- **THEN** those members receive no bidding-reopened notification

#### Scenario: The owner bid on a reopened item
- **WHEN** the owner who performs the reopen has a bid on a reopened item
- **THEN** the owner receives no bidding-reopened notification for their own action

### Requirement: Notification states the items and the new close time
The bidding-reopened notification SHALL name the auction, the reopened item (or the number of reopened items the user bid on), and the new auction close time in UTC, or state that there is no end time.

#### Scenario: Single item with an end date
- **WHEN** a user bid on one reopened item and the auction now ends on 30 Nov 2026 at 18:00 UTC
- **THEN** the notification names that item and the auction and states it closes on 30 Nov 2026, 18:00 UTC

#### Scenario: Several items
- **WHEN** a user bid on three reopened items
- **THEN** the notification states that bidding reopened on 3 items in the auction and links to the auction

### Requirement: Previously notified winners are told the win is not final
A user who was recorded as the notified winner of a reopened item SHALL receive notification text saying that the earlier win is no longer final and the item can be outbid until the new close time.

#### Scenario: Notified winner of a reopened item
- **WHEN** user A was notified as winner of item X and item X is reopened
- **THEN** user A's bidding-reopened notification says the win on item X is no longer final and gives the new close time

### Requirement: E-mail goes only to notified winners who opted in
The system SHALL send a bidding-reopened e-mail only to previously notified winners of reopened items who enabled item-won e-mails. Other bidders SHALL receive the in-app notification only.

#### Scenario: Notified winner with item-won e-mails enabled
- **WHEN** a notified winner of a reopened item has item-won e-mails enabled
- **THEN** they receive one bidding-reopened e-mail in addition to the in-app notification

#### Scenario: Bidder who was not a notified winner
- **WHEN** a user who bid on a reopened item was not its notified winner
- **THEN** they receive no bidding-reopened e-mail

### Requirement: Reopen notifications are sent once per reopen
The system SHALL send bidding-reopened notifications only when items move from closed to open. Saving the auction again, or changing the end date while items are already open, SHALL NOT send them again.

#### Scenario: Owner saves settings again after a reopen
- **WHEN** the owner saves the auction settings form again with the same future end date
- **THEN** no bidding-reopened notification is sent

#### Scenario: Owner corrects the new end time
- **WHEN** the owner moves the end date of a reopened, still-running auction from 18:00 to 20:00
- **THEN** no bidding-reopened notification is sent

### Requirement: Reopen notifications appear in real time
Bidding-reopened notifications SHALL be delivered to connected clients in real time, as other notifications are, and SHALL display with their own icon in the notification bell and the mobile notification sheet.

#### Scenario: Recipient is online
- **WHEN** a recipient has the app open while the owner reopens an item they bid on
- **THEN** the notification appears in their notification list without a page reload, shown with the bidding-reopened icon
