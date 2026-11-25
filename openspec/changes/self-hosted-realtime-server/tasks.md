# Tasks

Dependencies and parallelism:

- Group 1 is the shared foundation. It owns `src/lib/realtime/config.ts`,
  `client.ts` and `server.ts`, and fixes the D2 interface.
- Group 2 (VM bundle and smoke check) depends only on the D2 variable names
  and can run in parallel with group 1.
- Groups 3 (client resilience) and 4 (CSP) start after task 1.1 lands. They
  can run in parallel with each other.
- Group 5 is integration and browser QA on the combined result.

Prerequisites:

- Node from `.nvmrc`, `npm ci`, `npm run db:generate`, and a local SQLite
  database.
- Docker Engine for the local push server (tasks 2.x and 5.x).

UI note: no task changes visible UI or translations. Tasks 3.2 to 3.4 edit
React data-refresh code in pages, components and contexts. Per AGENTS.md, the
developer loads `design-taste-frontend` before editing those files and keeps
the rendered output unchanged.

## 1. Realtime configuration foundation

Owner files:

- `src/lib/realtime/config.ts`, `src/lib/realtime/client.ts`,
  `src/lib/realtime/server.ts`;
- new `src/lib/realtime/config.test.ts` and
  `src/lib/realtime/server.test.ts`;
- `.env.example`, `docker-compose.yml` (the `auktiva` service env only),
  `docs/content/developers/environment-variables.mdx`.

Tasks:

- [x] 1.1 Add `parseRealtimeDriver` and use it in `getRealtimeConfig` and
      `getClientConfig`.
  - The parser trims, matches case-insensitively, and maps unknown values to
    `disabled` with one server-side warning.
  - `getRealtimeConfig(env = process.env)` is accepted for tests.
  - Client code keeps literal `process.env.NEXT_PUBLIC_*` reads.
  - Verify: `npx tsx --test src/lib/realtime/config.test.ts` covers the
    unset, unknown, `" Pusher "` and each valid driver.
  - Specs: Supported realtime providers, all scenarios.
- [x] 1.2 Resolve the server-side publish endpoint as D2 describes.
  - `SOKETI_PORT` resolves to a valid `SOKETI_PORT`, then
    `NEXT_PUBLIC_SOKETI_PORT`, then 6001.
  - `SOKETI_USE_TLS` resolves to `SOKETI_USE_TLS`, then
    `NEXT_PUBLIC_SOKETI_USE_TLS`, then `false`.
  - The browser config stays on the `NEXT_PUBLIC_*` values.
  - Verify: `config.test.ts` covers the internal-publish/public-TLS,
    remote-HTTPS, legacy-unchanged and invalid-port (`"undefined"`, `""`,
    `"70000"`) scenarios.
  - Specs: Separate server publish endpoint.
- [x] 1.3 Pass `timeout: REALTIME_PUBLISH_TIMEOUT_MS` (5000) to the `pusher`
      constructor for both drivers.
  - Keep `publish` and `publishToMany` catching and logging errors.
  - Make sure no log line includes the app secret.
  - Verify: `npx tsx --test src/lib/realtime/server.test.ts` starts a local
    TCP server that accepts connections and never responds. It asserts that
    `publish()` resolves within 6 s without throwing, and that a 401 response
    resolves without throwing.
  - Specs: Publishing never fails user actions, Bounded publish time.
- [x] 1.4 Add `SOKETI_PORT` and `SOKETI_USE_TLS` to `.env.example` and
      `docs/content/developers/environment-variables.mdx`.
  - Describe the `soketi` driver as "any self-hosted Pusher-compatible server
    (Sockudo, Soketi)".
  - Correct the Docker production example: internal `SOKETI_HOST=soketi`,
    `SOKETI_PORT=6001`, `SOKETI_USE_TLS=false`; public `443` with TLS.
  - Add a Vercel + self-hosted server example.
  - In `docker-compose.yml`, set `SOKETI_PORT=6001` and
    `SOKETI_USE_TLS=false` on the `auktiva` service. Leave the Soketi service
    unchanged.
  - Verify: `docker compose config` succeeds, and the documented examples
    match the scenarios in `specs/realtime-connection-config`.

## 2. Stand-alone push server bundle and smoke check

Owner files:

- new `deploy/realtime/` (`docker-compose.yml`, `Caddyfile`, `.env.example`,
  `README.md`);
- new `scripts/realtime/smoke.ts`;
- `package.json` scripts;
- `docs/content/developers/realtime.mdx`,
  `docs/content/developers/deployment.mdx`.

Tasks:

- [x] 2.1 Choose and pin the server image.
  - Pin the current security-fixed `ghcr.io/sockudo/sockudo` release, or
    pin an official patched upstream build by manifest digest when no
    such release exists. Pick a Caddy 2.x version tag.
  - From the pinned image's upstream reference, confirm and record in
    `deploy/realtime/README.md`:
    - the default-app environment variable names;
    - Protocol V1/Pusher compatibility;
    - the `/up` health endpoint;
    - the metrics port and switch;
    - the allowed-origins and client-events settings.
  - Verify: the README lists each name with its upstream doc link, and no
    image uses an unpinned tag. If using an upstream build instead of a
    release, record the associated source revision and build.
- [x] 2.2 Write `deploy/realtime/docker-compose.yml`, `Caddyfile` and
      `.env.example` per design D6.
  - Default profile: Caddy on 80 and 443 with automatic TLS for
    `${REALTIME_HOSTNAME}` and reverse-proxy to `realtime:6001`.
  - `realtime` publishes no host ports.
  - `no-proxy` profile: `realtime` publishes only `127.0.0.1:6001`.
  - Health checks, `restart: unless-stopped`, json-file log limits, a named
    volume for Caddy data, client events off, and allowed origins from
    `REALTIME_ALLOWED_ORIGINS`.
  - If the server has no allowed-origins setting, use a Caddy `Origin`
    matcher on `/app/*`.
  - Verify: `docker compose -f deploy/realtime/docker-compose.yml config`
    succeeds for both profiles, and `git check-ignore deploy/realtime/.env`
    confirms the file is ignored.
  - Specs: TLS-only public endpoint, Internal ports are not exposed, Allowed
    origins, Health checks and restart, Pinned versions and bounded logs,
    Secrets are never committed.
- [x] 2.3 Add `scripts/realtime/smoke.ts` and `npm run realtime:smoke`.
  - Read the D2 variables, or `--host`, `--port`, `--tls`, `--app-id`,
    `--key` and `--secret` flags.
  - Sign the `private-item-smoke-<random>` auth locally with `pusher`.
  - Subscribe with `pusher-js` in Node, publish `bid:new`, and assert
    delivery within 10 s.
  - Print timings, never the secret, and exit non-zero naming the failing
    step.
  - Verify against `npm run realtime:local` (task 2.4): a correct secret
    exits 0, and a wrong secret exits non-zero with the secret absent from
    the output.
  - Specs: Smoke check, Pusher protocol compatibility, Private channel
    signatures are enforced.
- [x] 2.4 Add `npm run realtime:local`.
  - It starts the bundle's `no-proxy` profile with the dev credentials
    `auktiva` / `dev-key` / `dev-secret` on `127.0.0.1:6001` and allowed
    origin `http://localhost:3000`.
  - Keep the existing `soketi:*` and `dev:realtime` scripts unchanged.
  - Verify: `curl -fsS http://127.0.0.1:6001/up` succeeds while it runs, and
    the smoke check passes.
- [x] 2.5 Verify the bundle's security behavior locally.
  - A forged subscription signature is refused.
  - An unsigned `curl` POST to `/apps/<id>/events` returns 4xx.
  - A WebSocket opened with `Origin: https://evil.example.net` is refused.
  - Record the commands and outputs in the QA report.
  - Specs: Private channel signatures are enforced, Allowed origins.
- [x] 2.6 Document the Hetzner VM runbook and the Vercel cutover in
      `docs/content/developers/realtime.mdx`, per design D7 and the Migration
      Plan. Cover:
  - sizing, DNS, the Hetzner Cloud Firewall (including the Docker and `ufw`
    caveat), Docker installation, `.env` creation and permissions;
  - `docker compose up -d`, the smoke check, the external `/up` uptime
    monitor;
  - updates through pinned image changes, secret rotation;
  - the Vercel variables, the rebuild-without-cache requirement, the quiet
    window, and rollback to `pusher`.

  In `docs/content/developers/deployment.mdx`:
  - add a "Vercel app + self-hosted realtime server" section;
  - fix the nginx Soketi example to use `listen 443` with certbot, matching
    `NEXT_PUBLIC_SOKETI_PORT=443`;
  - add the `no-proxy` profile for existing nginx.

  Verify: run the documented commands in order against the local bundle
  (`no-proxy` profile) and check that every variable name matches the code.

## 3. Client resilience and resync

Depends on 1.1.

Owner files:

- `src/hooks/realtime/usePusher.ts`;
- new `src/lib/realtime/fallback.ts` and its test;
- `src/pages/auctions/[id]/items/[itemId].tsx`;
- `src/contexts/NotificationContext.tsx`;
- `src/components/item/DiscussionSection.tsx`;
- `docs/content/developers/realtime.mdx` (the fallback section only, after
  2.6, or coordinated with the group 2 owner);
- `docs/content/users/realtime.mdx`;
- `docs/content/developers/troubleshooting.mdx`.

Tasks:

- [x] 3.1 Extract `resolveRealtimeSWRConfig` into
      `src/lib/realtime/fallback.ts` and use it from `useRealtimeSWRConfig` and
      `useFallbackPollingInterval`.
  - Connected: no revalidation.
  - Configured but disconnected: the base interval with focus and reconnect
    revalidation.
  - Disabled: unchanged.
  - Verify: `npx tsx --test src/lib/realtime/fallback.test.ts` covers the
    three states and a base interval of 0 for a hidden tab or an ended item.
  - Specs: Polling fallback while disconnected.
- [x] 3.2 In `usePusher.ts`, latch `connectionFailed` only on `failed`.
  - Log `error` and `unavailable` without disabling.
  - `pusher-js` keeps reconnecting, and channels subscribed during an outage
    deliver after recovery.
  - Add a `useRealtimeReconnect()` counter that increments on each
    non-connected to `connected` transition after the first connection.
  - Verify: covered by browser checks 5.4 and 5.5.
  - Specs: Automatic recovery after transient failures.
- [x] 3.3 Refetch once on each reconnect signal change:
  - the item page `mutate()` (item and bids);
  - `NotificationContext` (list and count);
  - `DiscussionSection` (discussions).

  Keep rendered output unchanged, and load `design-taste-frontend` first.

  Verify: browser check 5.5, plus `npm run lint` on the files.

  Specs: Resynchronization after reconnect.

- [x] 3.4 Update the fallback descriptions.
  - In `docs/content/developers/realtime.mdx`, describe polling at the normal
    interval while disconnected, automatic reconnect and resync.
  - In `docs/content/users/realtime.mdx`, fix the "falls back to polling"
    wording to match.
  - In `docs/content/developers/troubleshooting.mdx`, add the
    self-hosted-server symptoms: CSP, origin refusal, 401 on publish.
  - Leave the v1.23.0 section of `upgrading.mdx` unchanged as historical.
  - Verify: `npx prettier --check` on the changed `.mdx` files passes,
    `npm ci && npm run build` in `docs/` succeeds in a separate checkout or
    in sequence with other builds, and the wording matches spec
    `realtime-degradation`.

## 4. CSP for the self-hosted origin

Depends on 1.1.

Owner files:

- `next.config.ts`;
- new `src/lib/realtime/csp.ts` and its test.

Tasks:

- [x] 4.1 Add `buildConnectSrc(env)` per design D5 and use it in
      `next.config.ts`.
  - Use a relative import with no path aliases.
  - If Next cannot load the import from the config file, inline the helper
    in `next.config.ts` and test it there by import.
  - Verify: `npx tsx --test src/lib/realtime/csp.test.ts`. TLS on 443 and on
    a custom port, `ws:` without TLS, and the `pusher` and `disabled` builds
    give the pre-change directive.
  - Specs: Content Security Policy allows the configured realtime origin.
- [x] 4.2 Verify built headers.
  - Run `npm run build` with `NEXT_PUBLIC_REALTIME_DRIVER=soketi`,
    `NEXT_PUBLIC_SOKETI_HOST=push.example.org`,
    `NEXT_PUBLIC_SOKETI_PORT=443` and `NEXT_PUBLIC_SOKETI_USE_TLS=true`.
  - Start the build and confirm that `curl -sI http://localhost:<port>/`
    shows `wss://push.example.org` in `connect-src`.
  - Repeat with the `pusher` driver and confirm the directive is unchanged.

## 5. Integration and browser QA

Run on the integrated revision, in a single worktree. Use port 3100 for the
app and 6001 for the push server. Use a fresh local SQLite database seeded
with one auction, two members and one open item.

Tasks:

- [x] 5.1 Static checks.
  - Run `npm run db:generate`, `npm run lint`, `npx tsc --noEmit` and
    `npm test`. The new test files are `src/lib/realtime/config.test.ts`,
    `server.test.ts`, `fallback.test.ts` and `csp.test.ts`, plus the existing
    suite.
  - Run `npm run build` with the `disabled` driver.
  - Report the exact commands and results.
- [x] 5.2 Secret check.
  - Build with a recognizable `SOKETI_APP_SECRET`.
  - Grep `.next/static` for it and expect no matches.
  - Specs: Secrets stay server-side.
- [x] 5.3 Browser check (browser-qa): live delivery.
  - Run `npm run realtime:local`, then the app with the `soketi` driver
    pointed at `127.0.0.1:6001`.
  - Open two member sessions on the same item. A bid from session A appears
    in session B without reload.
  - A discussion comment appears live.
  - The outbid member's notification bell count updates.
  - The unread count matches the saved notifications when the two realtime
    notification events arrive in either order.
  - No CSP violations in the console.
  - The WebSocket goes to `127.0.0.1:6001`.
  - Record screenshots or network evidence.
  - Specs: Private channel authorization (member scenario), Pusher protocol
    compatibility.
- [x] 5.4 Browser check: outage and recovery.
  - Stop the push server while the item page is open. The bid request still
    succeeds, and the page refreshes by polling at about 2 s (the network
    panel shows periodic item GETs).
  - Start the server again within one minute. The page reconnects without
    reload, periodic GETs stop, and later bids arrive live.
  - Also open an item page during the outage and confirm live updates after
    the server returns.
  - Specs: Publishing never fails user actions, Polling fallback while
    disconnected, Automatic recovery after transient failures.
- [x] 5.5 Browser check: resync.
  - Block the WebSocket for session B (stop the server briefly).
  - Place a bid and trigger an outbid from session A while B is
    disconnected.
  - Restore the server. Session B shows the new bid and the outbid
    notification after reconnect, without reload.
  - Delay a discussion refresh after reconnect, deliver live discussion
    events during the request, then confirm the snapshot preserves them.
  - Specs: Resynchronization after reconnect.
- [x] 5.6 Browser check: authorization and regressions.
  - A non-member requesting `/api/pusher/auth` for the item channel gets 403.
  - With the `disabled` driver, the item page polls at 2 s and no WebSocket
    is opened.
  - With the `pusher` driver and no reachable Pusher credentials, the app
    stays usable through polling. Use real Pusher test credentials if the
    owner provides them.
  - Specs: Supported realtime providers, Non-member is refused.

## Workflow follow-up

These steps are user-executed operations outside tracked task progress.
Each runs after the integrated change is published.

- Provision the Hetzner VM per the realtime runbook (task 2.6):
  - DNS for the push subdomain;
  - the Hetzner Cloud Firewall;
  - `deploy/realtime/.env`, then `docker compose up -d`.
- Run `npm run realtime:smoke` against `https://<push-host>`, check `/up`,
  and confirm that ports 6001 and 9601 are closed from outside.
- Set the Vercel production variables, redeploy without cache in a quiet
  window, then repeat the two-browser bid check on production.
- Keep the Pusher variables for rollback until the owner deletes the Pusher
  app.
- Archive the change after review and verification.
- Separate follow-ups:
  - fix `npm run setup` so it writes the realtime choice to `.env`;
  - pass `NEXT_PUBLIC_*` build args in the Dockerfile and compose;
  - consider `waitUntil` for fire-and-forget publishes on Vercel;
  - optionally update the legal hosting-provider text.
