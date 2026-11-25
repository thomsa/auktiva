# Spec Delta

## Purpose

Defines how Auktiva decides where its server publishes realtime events and
where browsers connect to receive them. It covers hosted Pusher Channels, a
self-hosted Pusher-compatible server, and realtime off, and keeps existing
configurations working.

## ADDED Requirements

### Requirement: Supported realtime providers

The system SHALL support three realtime modes, selected by
`NEXT_PUBLIC_REALTIME_DRIVER`: `pusher` (Pusher Channels), `soketi` (any
self-hosted server that implements the Pusher Channels protocol), and
`disabled`. Values SHALL match case-insensitively after trimming. An unset
or unrecognized value SHALL behave as `disabled` and log one server warning.

#### Scenario: Hosted Pusher keeps working

- **GIVEN** an instance configured with `NEXT_PUBLIC_REALTIME_DRIVER="pusher"` and valid `PUSHER_*` and `NEXT_PUBLIC_PUSHER_*` variables
- **WHEN** the instance runs after this change without any configuration edits
- **THEN** it publishes to and connects browsers to Pusher Channels exactly as before

#### Scenario: Realtime unset

- **GIVEN** an instance with no realtime variables
- **WHEN** a member opens an item page
- **THEN** no WebSocket connection is attempted and data refreshes by polling at the page's normal interval

#### Scenario: Unknown driver value

- **GIVEN** `NEXT_PUBLIC_REALTIME_DRIVER` is set to a value other than `pusher`, `soketi` or `disabled`
- **WHEN** the app resolves its realtime configuration
- **THEN** realtime is treated as disabled and no publish or connection is attempted
- **AND** the server logs one warning that names the unrecognized value

#### Scenario: Driver value with different case

- **GIVEN** `NEXT_PUBLIC_REALTIME_DRIVER` is set to `" Pusher "`
- **WHEN** the app resolves its realtime configuration
- **THEN** the `pusher` driver is used

### Requirement: Separate server publish endpoint

For a self-hosted server, the app SHALL resolve its server-side publish
endpoint (host, port, TLS) independently of the browser connection endpoint.
Server values that are unset SHALL fall back to the browser values, then to
port 6001 without TLS.

#### Scenario: Internal publish, public TLS browsers

- **GIVEN** `SOKETI_HOST="realtime"`, `SOKETI_PORT="6001"`, `SOKETI_USE_TLS="false"`, `NEXT_PUBLIC_SOKETI_HOST="push.example.org"`, `NEXT_PUBLIC_SOKETI_PORT="443"` and `NEXT_PUBLIC_SOKETI_USE_TLS="true"`
- **WHEN** the server publishes an event and a browser connects
- **THEN** the server sends the event to `http://realtime:6001`
- **AND** the browser connects to `wss://push.example.org:443`

#### Scenario: Remote publish over HTTPS

- **GIVEN** an app hosted on a different machine than the push server, configured with `SOKETI_HOST="push.example.org"`, `NEXT_PUBLIC_SOKETI_HOST="push.example.org"`, `NEXT_PUBLIC_SOKETI_PORT="443"`, `NEXT_PUBLIC_SOKETI_USE_TLS="true"`, and no `SOKETI_PORT` or `SOKETI_USE_TLS`
- **WHEN** the server publishes an event
- **THEN** the server sends it over HTTPS to `push.example.org:443`

#### Scenario: Existing self-hosted configuration unchanged

- **GIVEN** a configuration written before this change that sets only `SOKETI_HOST="127.0.0.1"`, `NEXT_PUBLIC_SOKETI_PORT="6001"` and `NEXT_PUBLIC_SOKETI_USE_TLS="false"`
- **WHEN** the server publishes an event
- **THEN** the server sends it to `http://127.0.0.1:6001` as before

#### Scenario: Invalid server port

- **GIVEN** `SOKETI_PORT` is set to a value that is not a port number from 1 to 65535, for example `"undefined"` or `""`
- **WHEN** the app resolves its publish endpoint
- **THEN** it falls back to `NEXT_PUBLIC_SOKETI_PORT`, then to 6001, and does not fail to start

### Requirement: Secrets stay server-side

The app SHALL keep the realtime app secret and app ID out of browser code and
client responses. Browsers SHALL receive only the public app key and the
connection endpoint.

#### Scenario: Client bundle inspection

- **GIVEN** a production build configured for a self-hosted server
- **WHEN** the client JavaScript bundles are searched for the configured `SOKETI_APP_SECRET` value
- **THEN** the value does not appear

### Requirement: Private channel authorization is provider-independent

The app SHALL authorize subscriptions to `private-user-*`,
`private-auction-*` and `private-item-*` channels with the same membership
rules whatever the driver, signing approvals with the configured app secret.

#### Scenario: Member subscribes through a self-hosted server

- **GIVEN** realtime uses a self-hosted server and a signed-in user is a member of an auction
- **WHEN** the browser subscribes to that auction's item channel
- **THEN** the auth endpoint returns a signature that the self-hosted server accepts, and the subscription succeeds

#### Scenario: Non-member is refused

- **GIVEN** realtime uses a self-hosted server and a signed-in user is not a member of an auction
- **WHEN** the browser requests authorization for one of that auction's item channels
- **THEN** the auth endpoint responds 403 and the user receives no events from that channel

### Requirement: Content Security Policy allows the configured realtime origin

When the self-hosted driver is configured with a public host, the app SHALL
include that WebSocket origin in the CSP `connect-src` directive alongside the
existing Pusher and localhost entries.

#### Scenario: TLS self-hosted origin

- **GIVEN** a build with `NEXT_PUBLIC_REALTIME_DRIVER="soketi"`, `NEXT_PUBLIC_SOKETI_HOST="push.example.org"` and `NEXT_PUBLIC_SOKETI_USE_TLS="true"`
- **WHEN** a page response's `Content-Security-Policy` header is read
- **THEN** its `connect-src` directive allows `wss://push.example.org` on the configured port
- **AND** it still allows `wss://*.pusher.com`

#### Scenario: Pusher or disabled build

- **GIVEN** a build with the `pusher` or `disabled` driver
- **WHEN** a page response's `Content-Security-Policy` header is read
- **THEN** `connect-src` matches the pre-change directive
