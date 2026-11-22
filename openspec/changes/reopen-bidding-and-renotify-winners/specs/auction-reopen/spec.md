# Spec Delta

## Purpose

Lets an auction owner reopen bidding on an ended or partly closed auction by setting a new end time and choosing which closed items reopen, while keeping bids and permissions consistent.

## ADDED Requirements

### Requirement: Owner can reopen bidding
The system SHALL let the auction owner reopen bidding by giving a new auction end date in the future and a set of closed items to reopen. Only the owner SHALL be allowed to do this.

#### Scenario: Owner reopens an ended auction
- **WHEN** the owner of an ended auction reopens bidding with an end date 3 days from now and selects two closed items
- **THEN** the auction's end date becomes that date and both items accept bids until then

#### Scenario: Admin or bidder tries to reopen
- **WHEN** an auction admin, item creator or bidder who is not the owner calls the reopen action
- **THEN** the request is rejected as forbidden and nothing changes

#### Scenario: End date not in the future
- **WHEN** the owner submits a reopen with an end date that is not in the future
- **THEN** the request is rejected with a validation error and nothing changes

### Requirement: Reopened items follow the auction end
An item reopened through the reopen action SHALL drop its own end date and end with the auction from then on.

#### Scenario: Stamped item reopens
- **WHEN** an item that "End auction now" gave its own past end date is reopened
- **THEN** the item has no end date of its own and closes when the auction closes

#### Scenario: Auction extended again later
- **WHEN** a reopened item's auction end date is later moved further out
- **THEN** the item stays open until the new auction end date

### Requirement: Only closed items of the auction can be selected
The reopen action SHALL accept only published items of the same auction that are closed. Unknown, draft, already open or other-auction item IDs SHALL cause the whole request to be rejected.

#### Scenario: Item from another auction
- **WHEN** the owner submits an item ID that belongs to a different auction
- **THEN** the request is rejected and nothing changes

#### Scenario: Item already open
- **WHEN** the owner selects an item that is still open
- **THEN** the request is rejected and nothing changes

### Requirement: Moving the auction end reopens items that follow it
When the owner moves an ended auction's end date into the future or clears it, items without their own end date reopen. They SHALL be treated as reopened items for notifications.

#### Scenario: Auction form extension
- **WHEN** the owner saves a future end date in the auction settings form for an auction whose end date has passed
- **THEN** items without their own end date accept bids again and are handled as reopened items

#### Scenario: Extension before the auction ended
- **WHEN** the owner moves a still-running auction's end date further out
- **THEN** no item counts as reopened and no reopen notifications are sent

### Requirement: Items cannot be reopened individually
Changing an item's own end date SHALL NOT reopen an item that has ended, whoever makes the change. Reopening goes through the owner's reopen action.

#### Scenario: Item editor extends an ended item
- **WHEN** an item creator or admin sets a future end date on an ended item, or clears its past end date
- **THEN** the request is rejected and the item stays closed

### Requirement: Bids are preserved when bidding reopens
Reopening SHALL keep every existing bid, the current highest bid and the highest bidder. New bids SHALL follow the usual minimum bid rules relative to the current highest bid.

#### Scenario: Bidding continues from the current price
- **WHEN** an item with a highest bid of 120 is reopened
- **THEN** the item still shows 120 and the same highest bidder, and a new bid must meet the minimum above 120

### Requirement: Owner sees and resolves closed items in a live auction
The auction settings page SHALL show the owner a "Reopen bidding" section when the auction has ended or any published item is closed while the auction is live. It lists the closed items, with all selected by default.

#### Scenario: Auction live but items closed
- **WHEN** the owner opens settings for an auction with a future end date and three published items closed by "End auction now"
- **THEN** the page shows the reopen section listing the three items, all selected, with the auction's end date prefilled

#### Scenario: Successful reopen feedback
- **WHEN** the owner submits the reopen section successfully
- **THEN** the page confirms how many items reopened and how many bidders were notified, and the auction shows as live
