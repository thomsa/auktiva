# Design

## Context

Realtime today (see proposal.md, Why):

```
 Vercel (Next.js, Pages Router)                     Browser
 ┌──────────────────────────────┐                ┌──────────────────────┐
 │ services ── publish() ───────┼── HTTPS ──┐    │ usePusher.ts         │
 │  bid / discussion / item /   │           ▼    │  pusher-js singleton │
 │  member / notification /     │      Pusher    │  useChannel/useEvent │
 │  auction-reopen              │      Channels ◄┼── WSS ───────────────│
 │ /api/pusher/auth (membership)│◄──────── POST ─┼── private-* auth     │
 └──────────────────────────────┘                └──────────────────────┘
```

- **Drivers.** `src/lib/realtime/config.ts` and `src/lib/realtime/client.ts`
  resolve `NEXT_PUBLIC_REALTIME_DRIVER`: `pusher`, `soketi` or `disabled`.
  Any other value currently falls through to `pusher`. The `soketi` driver
  already passes `host`, `port` and `useTLS` to the `pusher` SDK, and
  `wsHost`, `wsPort` or `wssPort` and `forceTLS` to `pusher-js`.
- **Coupled endpoint settings.** The server side reuses
  `NEXT_PUBLIC_SOKETI_PORT` and `NEXT_PUBLIC_SOKETI_USE_TLS`. Only the host is
  separate (`SOKETI_HOST`).
- **Publishers.** These publish after their writes commit:
  - `bid.service.ts`: `bid:new` on `private-item-*` and `bid:outbid` on
    `private-user-*`, both fire-and-forget.
  - `discussion.service.ts`: `discussion:new` and `discussion:deleted` on
    `private-item-*`.
  - `item.service.ts`: `item:created` on `private-auction-*`.
  - `member.service.ts`: `item:updated`.
  - `notification.service.ts`: `notification:new` and `notification:count`
    on `private-user-*`.
  - `auction-reopen.service.ts`: `item:updated`, awaited.

  `publish()` catches and logs every error, but has no timeout.

- **Subscribers.**
  - `src/pages/auctions/[id]/items/[itemId].tsx`: `bid:new`.
  - `src/components/item/DiscussionSection.tsx`: `discussion:*`.
  - `src/contexts/NotificationContext.tsx`: `notification:*`.

  Nothing subscribes to `bid:outbid`, `item:created` or `item:updated`.

- **Auth.** `src/pages/api/pusher/auth.ts` checks the session and auction
  membership, then signs the channel with the app secret. All channels are
  private, and no presence channels or client events are used.
- **Client state.** In `usePusher.ts`, any `error` or `failed` connection
  event latches `connectionFailed = true` for the session.
  `useRealtimeSWRConfig` polls at `max(base, 60s)` while realtime is
  configured but disconnected, and turns off all revalidation while
  connected.
- **Build-time values.** `NEXT_PUBLIC_*` values are inlined at build time. On
  Vercel, changing them requires a rebuild.
- **Docker.** `docker-compose.yml` runs `quay.io/soketi/soketi:latest`.
  Soketi's last release, 1.6.x, dates from 2023, and it does not run on
  Node 20 or later.
- **Topology.** The hosted instance runs on Vercel (see the legal page and
  `.github/workflows/vercel-release.yml`). Vercel functions have no fixed
  egress IPs.
- **Tests.** No existing tests cover realtime.

## Goals / Non-Goals

**Goals:**

- Run the push service on one Hetzner VM with automatic TLS, keeping
  `pusher` and `pusher-js` (protocol-level compatibility, minimal app diff).
- Let the server publish endpoint differ from the browser endpoint.
- Make outages of a self-hosted server degrade cleanly and recover on their
  own.
- Keep the `pusher` and `disabled` configurations and every existing variable
  working unchanged.
- Ship a reproducible bundle and a smoke check that other self-hosters can
  reuse.

**Non-Goals:**

- Multi-node scaling: no Redis or NATS adapter, no load balancer.
- Presence channels, client events, message history.
- Moving the Next.js app to the VM.
- Replacing Soketi in the main `docker-compose.yml` or the existing
  `soketi:*` npm scripts.
- New UI.

## Decisions

### D1. Keep the Pusher protocol and deploy a Pusher-compatible server

Option comparison:

- **Sockudo, pinned (chosen, provisional).**
  - Code change: none for the protocol, only config and resilience.
  - Clients: unchanged.
  - Maintenance: active (4.x in 2026), MIT, Rust.
  - Footprint: tens of MB of RAM.
  - Notes: Protocol V1 is the strict Pusher mode and is what `pusher-js`
    uses. It has `/up` health checks and Prometheus metrics on `:9601`.
- **Soketi 1.6.**
  - Code change: none. It is already referenced in the repo.
  - Clients: unchanged.
  - Maintenance: no release since 2023, and the image is built on an older
    Node.
  - Footprint: about 100 MB.
  - Notes: lowest effort, but the image ages without fixes.
- **Laravel Reverb.**
  - Code change: none for the protocol.
  - Clients: unchanged.
  - Maintenance: active.
  - Footprint: PHP plus a Laravel skeleton.
  - Notes: needs a Laravel app to host it, which is a foreign stack here.
- **Centrifugo.**
  - Code change: large. It needs a new client SDK, JWT auth, a new
    publisher and new hooks.
  - Clients: replaced.
  - Maintenance: active.
  - Footprint: small.
  - Notes: a better feature set, but a rewrite.
- **Custom SSE or WebSocket service.**
  - Code change: large, plus a service we would own.
  - Clients: replaced.
  - Maintenance: ours.
  - Footprint: small.
  - Notes: reinvents auth, reconnects and fan-out.

The `soketi` driver name already means "self-hosted Pusher-compatible", so the
app needs no protocol code. Sockudo is chosen over Soketi for maintenance and
security fixes. Because every option speaks the same protocol, the bundle can
swap Soketi back in by changing one image, and the app does not care.

Pinning rules:

- Pin an exact Sockudo version tag when a stable release includes the current
  upstream security fixes. If those fixes are available only in an official
  upstream build, pin that image by its immutable manifest digest and record
  the upstream source revision and build in the bundle README.
- Configure Protocol V1 explicitly if the pinned version exposes a setting.
- Verify the following against the pinned version's reference, then record
  them in the bundle README:
  - the environment variable names, such as `SOCKUDO_DEFAULT_APP_ID`,
    `_KEY`, `_SECRET`, `HOST`, `METRICS_ENABLED` and `METRICS_PORT`;
  - the allowed-origins setting;
  - the setting that turns client events off.

### D2. Keep the driver and variable names, add two server-only overrides

Keep `NEXT_PUBLIC_REALTIME_DRIVER="soketi"` and the `SOKETI_*` names as the
generic self-hosted driver, and document them that way. Add these two
server-only variables:

- `SOKETI_PORT` resolves in this order: `SOKETI_PORT` (if it is a valid port
  number), then `NEXT_PUBLIC_SOKETI_PORT`, then 6001.
- `SOKETI_USE_TLS` resolves in this order: `SOKETI_USE_TLS` (if it is `true`
  or `false`), then `NEXT_PUBLIC_SOKETI_USE_TLS`, then `false`.

Parse driver values case-insensitively and trimmed. Treat unknown values as
`disabled` and warn once. Today they fall through to `pusher`.

Alternative considered: rename to `REALTIME_HOST`, `REALTIME_*`, keeping
aliases. That gives cleaner names but touches every doc, the CLI and every
self-hoster's mental model for no functional gain. It can be a later
follow-up.

Interface (shared contract for tasks 1.x and 3.x):

```ts
// src/lib/realtime/config.ts
export type RealtimeDriver = "soketi" | "pusher" | "disabled";
export function parseRealtimeDriver(raw: string | undefined): RealtimeDriver;
export function getRealtimeConfig(env?: NodeJS.ProcessEnv): RealtimeConfig; // env param for tests
// RealtimeConfig gains no new fields; host/port/useTLS now carry the server-side values
export const REALTIME_PUBLISH_TIMEOUT_MS = 5000;
// src/lib/realtime/client.ts
export function getClientConfig(): ClientRealtimeConfig; // uses parseRealtimeDriver; NEXT_PUBLIC_* read as literal process.env.NEXT_PUBLIC_X expressions
```

Client-side reads must stay literal `process.env.NEXT_PUBLIC_*` expressions so
Next.js can inline them. Do not read them through a passed `env` object in
browser code.

### D3. Publish timeout

Pass `timeout: REALTIME_PUBLISH_TIMEOUT_MS` (5 s) to the `pusher` constructor
for both drivers. Keep the catch-and-log behavior, and never log the secret.
Apply the same deadline to the caller's wait and close its HTTP agent when
the attempt ends, including when a rejected response stalls after its headers.

The fire-and-forget calls on Vercel keep their current semantics. Changing
them to `waitUntil` is out of scope (see Risks).

### D4. Client resilience and resync

In `usePusher.ts`:

- Latch `connectionFailed` only on the `failed` state, which `pusher-js` uses
  when no transport is supported. On `error` and `unavailable`, log and let
  `pusher-js` keep reconnecting with backoff.
- `useChannel` returns `null` only while no client exists. Channels subscribed
  during an outage are subscribed again by `pusher-js` when it reconnects.
- Expose a reconnect signal that increments each time the state goes from a
  non-connected state to `connected` after an earlier connected or
  unavailable period. The first connection does not count.

Extract a pure `resolveRealtimeSWRConfig({ isEnabled, isConnected,
baseInterval })` and unit-test it:

- Connected: as today, with no revalidation.
- Configured but disconnected: `refreshInterval = baseInterval` (provisional;
  today it is `max(base, 60 s)`), with revalidation on focus and on reconnect.
- Disabled: unchanged.

Consumers call `mutate()` once when the reconnect signal changes:

- the item page (item and bids),
- `NotificationContext` (list and count),
- `DiscussionSection` (discussions).

Wait for each private channel to confirm its subscription before refreshing
its data or stopping its polling. When a discussion refresh finishes, apply
any live discussion events received during the request to its snapshot.
Both notification events tell the client to fetch the saved list and unread
count, since separate publishes can arrive in either order.

These are data-refresh changes with no visual output. If an implementer adds
any visible element, `design-taste-frontend` must be loaded first.

### D5. CSP

`next.config.ts` builds `connect-src` at build time. When the parsed driver
is `soketi` and `NEXT_PUBLIC_SOKETI_HOST` is set, it appends
`wss://<host>:<port>` (or `ws://` when TLS is off). With TLS on port 443 it
also appends `wss://<host>`. CSP3 `https:` already matches `wss:` in current
browsers, but an explicit entry documents intent and covers `ws:`.

Extract a pure `buildConnectSrc(env)` helper, for example in
`src/lib/realtime/csp.ts`, and import it from `next.config.ts`. It must stay
importable from the config file: no path aliases and no server-only imports.

### D6. VM bundle layout (`deploy/realtime/`)

```
 Browser ── wss://push.<domain>/app/<key> ──┐
 Vercel fn ── https://push.<domain>/apps/<id>/events (HMAC-signed) ──┐
                                            ▼                        ▼
 Hetzner VM ┌───────────── docker compose (project "auktiva-realtime") ─────┐
            │ caddy:2.x (pinned)  :80,:443 published                       │
            │   push.<domain> { reverse_proxy realtime:6001 }  auto-TLS    │
            │   origin gate on /app/* if server lacks allowed_origins      │
            │ realtime: upstream Sockudo image, pinned by tag or digest   │
            │   expose 6001 (internal net only), metrics 9601 internal     │
            │   healthcheck GET /up ; restart: unless-stopped              │
            └───────────────────────────────────────────────────────────────┘
```

Files:

- `docker-compose.yml`.
- `Caddyfile`. Its hostname and ACME e-mail come from environment variables.
- `.env.example` with:
  - `REALTIME_HOSTNAME`, `ACME_EMAIL`;
  - `REALTIME_APP_ID`, `REALTIME_APP_KEY`, `REALTIME_APP_SECRET`;
  - `REALTIME_ALLOWED_ORIGINS`;
  - `REALTIME_BIND` for proxy-less mode.
- `.gitignore` for `.env`.
- A short `README.md` that links to the docs.

Profiles:

- **Default.** Caddy handles TLS. `realtime` publishes no ports.
- **`no-proxy`.** For a VM that already runs nginx or Traefik on 80 and 443.
  Caddy does not start, and `realtime` publishes `127.0.0.1:6001` only, for
  the existing proxy to forward to.

Docker published ports bypass `ufw`, so the bundle never publishes 6001 or
9601 on `0.0.0.0`.

Settings:

- Logging uses the `json-file` driver with `max-size: 10m` and `max-file: 3`.
- Caddy keeps certificates in a named volume. That is the only state, and a
  lost volume only means a re-issue. Nothing needs backups.
- Client events are off, because Auktiva never sends them.
- The max connections and payload limits stay at their defaults unless the
  pinned server defaults are under 10 KB per event. The `bid:new` payload is
  well under 1 KB.

### D7. VM operations (documented, user-executed)

- **Size.** The smallest shared-vCPU Hetzner Cloud instance is enough. This
  can also share the owner's existing VM.
- **DNS.** Add an A record and an AAAA record for `push.<domain>` pointing to
  the VM.
- **Firewall.** In the Hetzner Cloud Firewall, allow inbound TCP 80 and 443
  from anywhere, and TCP 22 from admin IPs only. Deny everything else. `ufw`
  is optional on top.
- **Secrets.** Generate them with `openssl rand -hex 16` (key) and
  `openssl rand -hex 32` (secret). Keep them in `deploy/realtime/.env` on the
  VM (mode 600) and in the Vercel environment.
- **Rotation.** Rotating the secret means a coordinated change on the VM and
  in Vercel, plus a redeploy. Auth fails for a few minutes; clients fall back
  to polling.
- **Updates.** Bump the pinned tag in the repo, then run `docker compose pull`
  and `docker compose up -d` on the VM. Run the smoke check after every
  update. No watchtower or auto-updates.
- **Monitoring.** Point an external uptime monitor at
  `https://push.<domain>/up`. Metrics on `:9601` are available over an SSH
  tunnel if needed.

### D8. Local development and verification

- Add `npm run realtime:local`. It runs the bundle's push server with the
  `no-proxy` profile and dev credentials on `127.0.0.1:6001`, using the same
  pinned image as production.
- Add `npm run realtime:smoke` (`tsx scripts/realtime/smoke.ts`). The script:
  - uses `pusher` to sign the publish and to sign the private-channel auth
    locally;
  - uses `pusher-js` in Node as the subscriber;
  - reads its endpoint and credentials from the same `SOKETI_*` and
    `NEXT_PUBLIC_SOKETI_*` variables as the app, or from command-line flags.
- Keep the existing `soketi:*` scripts unchanged.

## Risks / Trade-offs

- **Single point of failure on one VM.** D4 polling at the base interval and
  resync on reconnect keep the app correct during an outage. Uptime
  monitoring alerts the owner. Rollback to Pusher is an environment switch.
- **Load during an outage.** While disconnected, polling at 2 s on the item
  page makes every open item page hit `/api/auctions/.../items/...`. That
  equals the supported realtime-off mode, and polling pauses on hidden tabs.
- **Sockudo moves fast** (v1 to v4 in about 18 months, with a protocol V2).
  Pin the exact tag, and use the smoke check as the upgrade gate. Soketi stays
  a one-line fallback.
- **Fire-and-forget publishes on Vercel** may be cut off when the function
  freezes after it responds. This already happens with Pusher; a VM endpoint
  with similar latency does not make it worse. Follow-up: `waitUntil`.
- **Cutover strands open tabs.** Tabs loaded before the switch stay connected
  to Pusher, which no longer receives events. While connected, they do not
  poll, so they stay stale until reloaded. Mitigation: cut over in a quiet
  window with no item ending soon. Alternative: a temporary dual publish
  (rejected as extra code for a one-off; see the open decisions).
- **Old CSP or bundle on Vercel after an environment change.** The
  `NEXT_PUBLIC_*` values and CSP are build-time, so the runbook requires a
  rebuild without cache after changing the variables.
- **`allowed_origins` may be missing or named differently** in the pinned
  server version. Fall back to a Caddy `@badOrigin` matcher on `/app/*`. The
  smoke check and a manual cross-origin test verify this.
- **Changed polling while disconnected.** The fallback interval changes from
  at least 60 s to the base interval. The v1.23.0 section of `upgrading.mdx`
  describes the old timing for that release. Leave it as historical, and
  state the new behavior in `realtime.mdx`.
- **Unknown driver values now disable realtime.** Before this change they
  fell back to Pusher. Case-insensitive parsing plus a startup warning limit
  the surprise. Note it in the changelog.

## Migration Plan

1. Merge and release the app change. The hosted instance still uses the
   `pusher` driver; the only behavior changes are the resilience fixes.
2. Prepare the VM:
   - install Docker Engine and the Compose plugin;
   - copy `deploy/realtime/` and create `.env`;
   - add DNS for `push.<domain>`;
   - set the Hetzner firewall;
   - run `docker compose up -d`.
3. From a workstation, run `npm run realtime:smoke` against
   `https://push.<domain>`. It must exit 0. Also confirm that `/up` is
   healthy and that ports 6001 and 9601 are closed from outside.
4. In the Vercel production environment, set:
   - `NEXT_PUBLIC_REALTIME_DRIVER=soketi`;
   - `NEXT_PUBLIC_SOKETI_APP_KEY`;
   - `NEXT_PUBLIC_SOKETI_HOST=push.<domain>`;
   - `NEXT_PUBLIC_SOKETI_PORT=443`;
   - `NEXT_PUBLIC_SOKETI_USE_TLS=true`;
   - `SOKETI_APP_ID`, `SOKETI_APP_SECRET`;
   - `SOKETI_HOST=push.<domain>`.

   Keep the `PUSHER_*` values for rollback.

5. In a quiet window, redeploy production without the build cache: run the
   deploy hook, or use Redeploy in Vercel.
6. Verify:
   - in two browsers on one item page, a bid appears live;
   - the WebSocket in DevTools goes to `push.<domain>`;
   - the notification bell updates;
   - no CSP violations appear in the console.
7. Roll back if needed: set `NEXT_PUBLIC_REALTIME_DRIVER=pusher` and redeploy
   without cache. After a stable period, the owner deletes the Pusher app and
   its variables.

## Open Questions

- The exact Sockudo image pin, environment variable names and allowed-origins key
  for the pinned version. Resolve these during task 2.1 from the upstream
  reference. They do not change the specs or tasks.
