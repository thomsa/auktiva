# Proposal

## Why

The hosted Auktiva instance sends bid, discussion and notification updates
through Pusher Channels. Its free tier caps the instance at 100 concurrent
connections and 200,000 messages a day. The owner wants to run the push
service on their own Hetzner VM instead.

Auktiva already speaks the Pusher protocol through two drivers: `pusher` for
Pusher Channels and `soketi` for any self-hosted Pusher-compatible server. Most
of the app side already exists. Five gaps block a reliable move:

- The repository has no deployable, TLS-terminated bundle for a stand-alone
  push server on a VM, and nothing to check that bundle with.
- The server-side publish endpoint is tied to the browser's port and TLS
  settings. One setup cannot have the app publish to `http://<internal>:6001`
  while browsers use `wss://<public>:443`. The documented Docker example has
  exactly that mismatch.
- A browser that sees one connection error stops using realtime for the rest
  of its session. While realtime is configured but disconnected, polling
  slows to at least 60 seconds, even on the item page during live bidding. A
  self-hosted server restarts more often than Pusher, so this matters more.
- When a browser reconnects, it does not refetch the bids and notifications
  published while it was disconnected.
- The server image the repository references, Soketi, has had no release
  since 2023 and does not run on Node 20 or later.

## What Changes

- Add a stand-alone realtime server bundle under `deploy/realtime/`. It
  contains a Docker Compose file that runs a pinned, maintained
  Pusher-compatible server (Sockudo, provisional) behind Caddy with automatic
  TLS, a Caddyfile, an `.env.example`, health checks, a restart policy, log
  rotation and no publicly exposed internal ports. A proxy-less mode lets the
  server sit behind an existing reverse proxy.
- Add a realtime smoke-check script. It publishes a signed event to a server
  and confirms that a subscribed private-channel client receives it. Use it
  locally, after a VM deploy, and when cutting over.
- Split the app's server-side publish settings from the browser connection
  settings. New optional server-only `SOKETI_PORT` and `SOKETI_USE_TLS`
  variables fall back to the existing `NEXT_PUBLIC_SOKETI_*` values, so
  current configurations behave the same.
- Bound every publish call with a timeout, so an unreachable push server
  cannot hold up a request that awaits a publish.
- Add the configured self-hosted WebSocket origin to the CSP `connect-src`.
  Existing Pusher and localhost entries stay.
- Make the browser client resilient. Transient connection errors no longer
  turn realtime off for the session. Pages poll at their normal interval while
  realtime is configured but disconnected (provisional). Each page that
  depends on realtime refetches its data once after a reconnect.
- Docs: a Hetzner VM runbook (DNS, firewall, TLS, secrets, updates,
  monitoring), the Vercel-to-VM cutover and rollback steps, the new variables,
  and fixes to the existing Docker and nginx examples. The `docker-compose.yml`
  app service gets explicit internal `SOKETI_PORT` and `SOKETI_USE_TLS` values.
- Hosted Pusher (`pusher` driver) and realtime-off (`disabled`) configurations
  keep working unchanged. No variable is renamed or removed. Nothing in this
  change is **BREAKING**.

Out of scope:

- Moving the Next.js app itself off Vercel.
- Horizontal scaling of the push server (a Redis or NATS adapter).
- Presence channels or client events.
- A visible "live updates paused" indicator.
- Fixing `npm run setup`, which never writes the realtime choice to `.env`.
- Docker images that bake `NEXT_PUBLIC_*` values at build time without build
  args.
- Changing the legal page's list of hosting providers.

The last three are separate follow-ups.

## Capabilities

### New Capabilities

- `realtime-connection-config`: covers how the app resolves where it publishes
  events and where browsers connect, for hosted Pusher, a self-hosted
  Pusher-compatible server, or realtime off. It includes backward
  compatibility of existing variables and the CSP allowance.
- `realtime-degradation`: covers how the app behaves when the push service is
  slow, unreachable or reconnecting. Publishing never fails user actions.
  Clients fall back to polling, recover on their own and resynchronize missed
  updates.
- `realtime-server-deployment`: the contract for the shipped stand-alone push
  server bundle and smoke check. It covers TLS-only public access,
  private-channel signature enforcement, allowed origins, health checks,
  pinned versions and secret handling.

### Modified Capabilities

None. `openspec/specs/` has no existing capabilities.

## Impact

- Code: `src/lib/realtime/config.ts`, `src/lib/realtime/server.ts`,
  `src/lib/realtime/client.ts`, `src/hooks/realtime/usePusher.ts`,
  `src/contexts/NotificationContext.tsx`,
  `src/pages/auctions/[id]/items/[itemId].tsx`,
  `src/components/item/DiscussionSection.tsx`, `next.config.ts` (CSP).
- New files: `deploy/realtime/` (compose, Caddyfile, `.env.example`, short
  README), `scripts/realtime/smoke.ts`, and unit tests next to the realtime
  modules.
- Config: `.env.example`, `docker-compose.yml` (app service env only),
  `package.json` (a script for a local self-hosted push server and the smoke
  check). No new runtime npm dependencies. `pusher` and `pusher-js` stay.
- Docs: `docs/content/developers/realtime.mdx`, `deployment.mdx`,
  `environment-variables.mdx`, `troubleshooting.mdx`, `upgrading.mdx`, and the
  realtime polling note in `docs/content/users/realtime.mdx` if its intervals
  change.
- Operations: a new Hetzner VM service, a DNS record for a push subdomain, and
  new Vercel environment variables at cutover. Rollback means switching the
  driver variable back to `pusher` and redeploying.
- No Prisma schema change. No user-facing UI string change, so no translation
  changes.
