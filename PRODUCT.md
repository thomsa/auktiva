# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: auction organizers.** People who run an auction for a charity, school, church, office or circle of friends and family. They create the auction, add or import items, invite people, watch bidding, close the auction, and take the results away to settle offline. When needs conflict, the organizer's job comes first.

**Also served:**

- **Bidders.** Guests who usually join through an invite link or email, often during a live event and on a phone. They browse items, bid, follow outbids, and check what they've won.
- **Self-hosters.** Admins who install and run their own instance with the setup CLI, Docker, PM2 or Vercel.

## Product Purpose

Auktiva hosts private and public auctions with live bidding, from setup to a clear list of winners. It exists so community groups and individuals can run a fundraiser or a sell-off without auction software built for commercial sellers. Success means the organizer gets from "create auction" to trustworthy results with little friction, and bidders always know where they stand.

## Positioning

- **No payment processing, ever.** Auktiva never takes, holds or moves money. The product ends at the result, and organizers and participants settle offline.
- **Open source and self-hostable.** The software is MIT-licensed. Self-hosting is a first-class path alongside the hosted instance at auktiva.org, so operators can own their data.
- **Free today, with no promise about the future.** Copy may say Auktiva is free now. It must not promise "free forever", "no fees ever" or "no limits", because a paid tier may come later. The current landing and CTA copy (`messages/*/landing.json`) still says "100% free forever" and "no limits" and should be revised whenever it's touched.

## Operating Context

- **Typical use cases:** charity fundraisers and silent auctions, a yearly declutter, friends and family sales, office clearouts.
- **Joining:** invite-only, by shareable link, or open to all. Open auctions are gated by the `ALLOW_OPEN_AUCTIONS` instance flag. Members can be allowed to invite others.
- **Settlement:** after closing, organizers export results as CSV or JSON and handle the exchange offline.
- **Hosted instance:** auktiva.org runs on Turso with S3-compatible storage.
- **Self-hosted instances:** a setup wizard (`npm run setup`) chooses SQLite or Turso, local or S3 storage, an email provider (Brevo, SMTP or Amazon SES), optional Google and Microsoft OAuth, and optional realtime through Pusher or Soketi.
- **Releases:** rolling, and only the latest version is supported.
- **Documentation:** docs.auktiva.org, built from `docs/` (Nextra), with separate sections for users and developers.

## Capabilities and Constraints

- **Roles:** Owner (full control, including deletion), Admin (members, items, settings), Creator (their own items), Bidder (view and bid). Permission checks and bid invariants must hold across every surface.
- **Auctions:** auction-wide or per-item end dates, early close, leave and rejoin, bid extension (anti-sniping), and a choice of anonymous bidding mode (always visible, always anonymous, or per bid).
- **Items:** multiple images, rich-text descriptions, starting bids, minimum increments, per-item discussions, CSV import, bulk edit, and Auction Admin item editing.
- **Currencies:** multiple built-in currencies plus custom currencies with profiles, rules and denominations.
- **Notifications:** in-app notifications for outbids, wins, new items and invites, plus optional email with user preferences and automatic retries.
- **Personal views:** dashboard, bid history, listings, wins across auctions, settings and connected accounts.
- **Localization:** every user-facing string ships in English, German, Spanish, Hungarian and Polish (`messages/{en,de,es,hu,pl}`). Translations are updated together.
- **Seasonal theming:** a Christmas scene and decorations are applied when the document's `data-season` is `christmas`.
- **Stack constraints:** Next.js Pages Router, Prisma (SQLite or libSQL), Tailwind 4 with daisyUI. Schema changes ship with migrations and stay compatible with existing records.

## Brand Commitments

- **Name:** Auktiva.
- **Binding claims:** no payment processing; open source and self-hostable.
- **Not binding:** "free forever", "no limits" and privacy-first claims. Don't add them to new copy.

## Evidence on Hand

- **Usage numbers:** real figures (auctions run, users, value raised) live in the auktiva.org production database (Turso). Query them before citing anything, and never estimate or round them up.
  - **Auctions hosted:** about 452 on auktiva.org, as reported by the owner on 2026-11-22. Copy may say "450+ auctions". Re-query Turso before quoting a more precise or more recent figure.
  - **Users and value raised:** not yet provided.
- **Named organizations and quotes:** they exist, but each use needs the owner's approval. None are in the repo, so never invent or paraphrase one.
- **Demo assets:** a product walkthrough video (`public/pictures/auktiva-demo.mp4`, rendered from the Remotion source in `demo/`), plus `public/pictures/recording.gif`, `og-image.png`, `login-bg.png` and `christmas-santa.webp`.
- **Public proof:** the GitHub repo (github.com/thomsa/auktiva), its releases and `CHANGELOG.md`.

## Product Principles

1. **Organizer first.** Optimize the path from creating an auction to trustworthy results. Bidder speed matters, but not at the cost of the organizer's control.
2. **The product ends at the result.** Nothing may imply that Auktiva collects or moves money. Settlement language always points offline.
3. **Bid integrity is the trust.** Current price, timing, extensions, anonymity and permissions must be unambiguous everywhere they appear.
4. **Self-hosting is first-class.** Every feature must work across the supported deployment options and degrade cleanly when an optional service (email, OAuth, realtime, S3) isn't configured.
5. **Five languages, always.** A feature isn't finished until it works in every shipped locale.
