# Auktiva auction share fix filestate

Commit `05037db` contains the six source changes. The patch and the original stubbed browser check are retained for reference. The archived browser check depends on packages and paths from the original machine.

## Local verification

The production build ran in Chromium with a fresh SQLite database and a loopback SMTP inbox.

- A logged-out visitor registered from an open auction share page. The verification email opened in a fresh browser context, verified the account, and redirected to sign-in. Sign-in opened the exact auction and created its `BIDDER` membership.
- A visitor registered for a link-only auction through the sign-in page's sign-up link. A resent email preserved the auction destination. The explicit sign-in link in the verification page led to the correct auction, and SQLite recorded the membership.
- An existing account signed in from the auction share page, opened the exact auction, and gained membership. Direct sign-in and sign-in from a protected dashboard request both landed on the dashboard without creating a membership.

The production build, TypeScript, and lint checks passed. The Windows build reported standalone trace-copy warnings. Prettier still reports five files from the base branch when using the checkout's line endings. Prisma's migration CLI returned a schema engine error on this machine, so the fixture database was created by applying all 19 checked-in SQLite migrations directly.

Production deployment and post-deploy verification are pending review.
