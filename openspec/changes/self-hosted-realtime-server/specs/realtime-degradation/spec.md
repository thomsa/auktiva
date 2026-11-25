# Spec Delta

## Purpose

Defines how Auktiva behaves when its realtime push service is slow,
unreachable or reconnecting, so that bids, discussions and notifications stay
correct and reasonably fresh without the push service.

## ADDED Requirements

### Requirement: Publishing never fails user actions

A failed, rejected or slow realtime publish SHALL NOT fail or roll back the
action that triggered it. The action's database changes SHALL be committed
before the event is published.

#### Scenario: Push server down while bidding

- **GIVEN** realtime is configured and the push server is unreachable
- **WHEN** a member places a valid bid
- **THEN** the bid is saved and the bid request succeeds
- **AND** the server logs the publish failure without the app secret

#### Scenario: Push server rejects the publish

- **GIVEN** realtime is configured with an app secret that the push server does not accept
- **WHEN** a member posts a discussion comment
- **THEN** the comment is saved and the request succeeds
- **AND** the server logs the rejected publish

### Requirement: Bounded publish time

Each publish attempt SHALL give up after a fixed timeout of at most 5 seconds,
so a request that waits for a publish finishes within that bound plus its own
work.

#### Scenario: Push server accepts connections but never responds

- **GIVEN** the configured push server accepts TCP connections but never answers HTTP requests
- **WHEN** an owner reopens bidding, which waits for its `item:updated` publishes
- **THEN** each publish attempt is abandoned after at most 5 seconds and the reopen request completes successfully

### Requirement: Polling fallback while disconnected

While realtime is configured but the browser is not connected, pages that use
realtime SHALL refresh by polling at the same interval they use when realtime
is disabled. While connected, they SHALL NOT poll.

#### Scenario: Item page during an outage

- **GIVEN** realtime is configured and the push server is unreachable
- **WHEN** a member keeps an item page with open bidding visible
- **THEN** the page refetches item and bid data at the item page's normal polling interval (2 seconds today)
- **AND** a bid placed by another member appears within that interval plus request time

#### Scenario: Connected item page

- **GIVEN** realtime is configured and the browser is connected
- **WHEN** a member keeps an item page visible
- **THEN** the page makes no periodic item refetches, and new bids arrive through realtime events

### Requirement: Automatic recovery after transient failures

A transient connection error or server restart SHALL NOT turn realtime off
for the rest of the browser session. The client SHALL keep retrying and SHALL
resume realtime delivery when the server is reachable again. Realtime SHALL
stay off for the session only when the browser cannot use any supported
transport.

#### Scenario: Push server restart

- **GIVEN** a member has an item page open with realtime connected
- **WHEN** the push server restarts and is reachable again within one minute
- **THEN** the browser reconnects without a page reload
- **AND** later bids by other members arrive through realtime events and polling stops again

#### Scenario: Channels opened during an outage

- **GIVEN** the push server is unreachable when a member opens an item page
- **WHEN** the push server becomes reachable later in the same browser session
- **THEN** the page subscribes to the item channel and receives later bids in realtime

### Requirement: Resynchronization after reconnect

When the browser regains a realtime connection after being disconnected, each
mounted page or provider that depends on realtime SHALL refetch its data once,
so that events published while disconnected are not lost.

#### Scenario: Bid placed during a short disconnect

- **GIVEN** a member's item page lost its realtime connection
- **WHEN** another member places a bid during the disconnect and the connection then recovers
- **THEN** the first member's page shows the new bid and current price after reconnecting, without a manual reload

#### Scenario: Notification created during a disconnect

- **GIVEN** a signed-in member's browser lost its realtime connection
- **WHEN** the member is outbid during the disconnect and the connection then recovers
- **THEN** the notification list and unread count include the outbid notification after reconnecting
