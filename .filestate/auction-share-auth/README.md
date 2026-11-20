# Auktiva auction share fix filestate

The branch already includes the six source changes. The patch is retained for handoff.

The auth flow preserves the auction destination during registration, email verification and resend, and sign-in. The DOM regression passed with stubbed dependencies, and the original snapshot failed because its verification URL omitted the destination. The archived browser-check script references dependencies on the original machine.

For full verification, install the repository's locked dependencies and run the app with a disposable database and test inbox. Open a public auction share link while logged out, register a fresh account, verify the email in a fresh browser context, and sign in. Confirm the exact auction opens and the database records membership. Check existing-account sign-in from the share link and ordinary dashboard login. Run the repository checks before deployment, then repeat the share flow after deployment.

Full verification remains pending. The original environment blocked Chromium startup, Docker access, and terminal GitHub DNS. No deployment was performed.
