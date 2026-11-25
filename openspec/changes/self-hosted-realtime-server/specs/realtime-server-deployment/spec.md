# Spec Delta

## Purpose

Defines the contract for the stand-alone realtime push server bundle that
Auktiva ships for a single VM, and for the smoke check that proves a deployed
server works with Auktiva's events and private channels.

## ADDED Requirements

### Requirement: Pusher protocol compatibility

The bundled push server SHALL accept signed event publishes through the
Pusher Channels HTTP API and deliver them to clients using the Pusher Channels
WebSocket protocol, so the app's existing `pusher` server SDK and `pusher-js`
client work with only host, port and TLS settings changed.

#### Scenario: Event delivered to a private channel subscriber

- **GIVEN** the bundle is running and a client subscribed to `private-item-smoke` with a valid channel signature
- **WHEN** a signed `bid:new` event is published to `private-item-smoke`
- **THEN** the subscribed client receives the event with an unchanged payload

### Requirement: Private channel signatures are enforced

The push server SHALL refuse subscriptions to `private-` channels that are
not signed with the configured app secret, and SHALL refuse unsigned or
wrongly signed HTTP publishes.

#### Scenario: Forged subscription

- **WHEN** a client subscribes to `private-user-someone` with a signature made from a different secret
- **THEN** the server refuses the subscription and the client receives no events on that channel

#### Scenario: Unsigned publish

- **WHEN** an HTTP publish request without a valid signature is sent to the server
- **THEN** the server rejects it with a 4xx status and delivers nothing

### Requirement: TLS-only public endpoint

The bundle SHALL expose the push server publicly only through HTTPS and WSS on
port 443 of the configured hostname, with certificates issued and renewed
automatically. HTTP on port 80 SHALL only redirect or serve certificate
challenges.

#### Scenario: Browser connection over WSS

- **GIVEN** the bundle is running on a VM with DNS for the configured hostname pointing to it
- **WHEN** a browser opens `wss://<hostname>/app/<key>`
- **THEN** the TLS handshake succeeds with a publicly trusted certificate for that hostname and the WebSocket upgrade succeeds

#### Scenario: Plain HTTP

- **WHEN** a client requests `http://<hostname>/`
- **THEN** it is redirected to HTTPS and no push API response is served over plain HTTP

### Requirement: Internal ports are not exposed

The push server's own listener and its metrics listener SHALL NOT be
published on the VM's public interfaces. They are reachable only from the
bundle's reverse proxy, or, in proxy-less mode, only on the VM's loopback
interface.

#### Scenario: Port scan from outside

- **GIVEN** the bundle is running in its default mode
- **WHEN** the VM's public address is probed on the server and metrics ports (6001 and 9601 by default)
- **THEN** both connections are refused or time out

### Requirement: Allowed origins

The push server SHALL accept browser WebSocket connections only from the
origins listed in the bundle configuration, for example the Auktiva app's
public origin.

#### Scenario: Connection from an unlisted origin

- **GIVEN** the allowed origins list contains only `https://app.example.org`
- **WHEN** a browser page served from `https://evil.example.net` opens a WebSocket with the public app key
- **THEN** the server refuses the connection

### Requirement: Health checks and restart

The bundle SHALL define container health checks for the push server and the
proxy. It SHALL restart crashed containers automatically and start them again
after a VM reboot. A public HTTPS health URL SHALL report the server's status
for external uptime monitoring.

#### Scenario: Server process crash

- **GIVEN** the bundle is running
- **WHEN** the push server process exits unexpectedly
- **THEN** the container restarts without operator action, and the public health URL reports healthy again once it is up

#### Scenario: VM reboot

- **WHEN** the VM reboots
- **THEN** the push server and proxy are running and healthy again without operator action

### Requirement: Pinned versions and bounded logs

The bundle SHALL pin each container image by an explicit version tag or an
immutable manifest digest. It SHALL cap container log size so logs cannot
fill the disk.

#### Scenario: Compose file review

- **WHEN** the bundle's compose file is inspected
- **THEN** every image is pinned by an explicit version tag or an immutable manifest digest and every service has a log size limit

### Requirement: Secrets are never committed

The bundle SHALL read the app ID, key, secret, hostname and allowed origins
from an untracked environment file. Only an example file with placeholders
SHALL be committed.

#### Scenario: Repository check

- **WHEN** the repository is searched for the bundle's environment file
- **THEN** only the example file is tracked, and the real file is ignored by Git

### Requirement: Smoke check

The repository SHALL provide a smoke check command. Given an endpoint and
credentials, it signs a private-channel subscription, publishes a test event,
and exits non-zero unless the event arrives within a timeout. It SHALL never
print the app secret.

#### Scenario: Healthy server

- **GIVEN** a reachable server and matching credentials
- **WHEN** the smoke check runs
- **THEN** it reports the round-trip time and exits with status 0

#### Scenario: Wrong secret

- **GIVEN** a reachable server and a secret that does not match
- **WHEN** the smoke check runs
- **THEN** it reports which step failed (publish or subscribe) and exits non-zero without printing the secret
