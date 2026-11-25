# Auktiva realtime server

Use the [realtime runbook](../../docs/content/developers/realtime.mdx) to set
up the VM, configure Auktiva, and verify delivery.

Copy `.env.example` to `.env` and set the host, ACME contact, credentials, and
allowed origins before starting Compose. The sample selects the `proxy`
profile for `docker compose up -d`. Caddy handles HTTP redirects and TLS on
ports 80 and 443. Use `docker compose --profile no-proxy up -d` for an existing
proxy on the VM. This selects `realtime-local` with `127.0.0.1:6001` as the
default host listener. Use the same profile for later Compose operations,
or set `COMPOSE_PROFILES=no-proxy` in `.env` to make it the default.

Both profiles use `ghcr.io/sockudo/sockudo:5.2.0`. The proxied profile uses
`caddy:2.11.9-alpine` with [automatic HTTPS](https://caddyserver.com/docs/automatic-https).

| Setting                                                                                                                                                      | Pinned upstream reference                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `HOST`, `PORT`, `SOCKUDO_DEFAULT_APP_ENABLED`, `SOCKUDO_DEFAULT_APP_ID`, `SOCKUDO_DEFAULT_APP_KEY`, `SOCKUDO_DEFAULT_APP_SECRET`                             | [Sockudo environment variables](https://github.com/sockudo/sockudo/blob/v5.2.0/docs/content/docs/reference/environment-variables.mdx)             |
| Pusher clients use Protocol V1 by default, retaining Pusher HTTP signing and WebSocket frames                                                                | [Sockudo 5.2.0 release](https://github.com/sockudo/sockudo/releases/tag/v5.2.0)                                                                   |
| `/up` reports dependency health                                                                                                                              | [Sockudo HTTP endpoints](https://github.com/sockudo/sockudo/blob/v5.2.0/docs/content/docs/reference/http-endpoints.mdx)                           |
| `METRICS_ENABLED`, `METRICS_HOST`, `METRICS_PORT` enable the internal `9601` metrics listener                                                                | [Sockudo metrics variables](https://github.com/sockudo/sockudo/blob/v5.2.0/docs/content/docs/reference/environment-variables.mdx#metrics)         |
| `SOCKUDO_DEFAULT_APP_ALLOWED_ORIGINS` takes a comma-separated browser origin list. `SOCKUDO_DEFAULT_APP_ENABLE_CLIENT_MESSAGES=false` disables client events | [Sockudo default app variables](https://github.com/sockudo/sockudo/blob/v5.2.0/docs/content/docs/reference/environment-variables.mdx#default-app) |
