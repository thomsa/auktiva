# Changelog

All notable changes to Auktiva will be documented in this file.

## [1.11.4] - 2025-12-31

### ⚙️ Miscellaneous

- Revert to dompurify, add Vercel Live CSP, and format code by @thomsa

## [1.11.3] - 2025-12-31

## [1.11.2] - 2025-12-31

### 🐛 Bug Fixes

- Replace dompurify with isomorphic-dompurify for SSR compatibility by @thomsa

## [1.11.1] - 2025-12-31

### 🐛 Bug Fixes

- Add Callout component import to security documentation by @thomsa

## [1.11.0] - 2025-12-31

### ⚙️ Miscellaneous

- Remove Windsurf context files, add security documentation, and update dependencies by @thomsa

### 🚀 Features

- Add email verification system with translations and rate limiting by @thomsa

## [1.10.0] - 2025-12-30

### 🚀 Features

- Add public auction sharing with OG metadata and copy link functionality by @thomsa

## [1.9.0] - 2025-12-30

### 🚀 Features

- Allow item owners to end their items early from detail page by @thomsa
- Add rich text editor support for auction and item descriptions with translations by @thomsa

## [1.8.3] - 2025-12-30

### 🚀 Features

- Add changelog page with translations and markdown support by @thomsa

## [1.8.2] - 2025-12-30

### ⚙️ Miscellaneous

- Format code and update OAuth documentation to include Microsoft provider by @thomsa

## [1.8.1] - 2025-12-30

### 🚀 Features

- Add SEO metadata for login page and optimize notification polling for authenticated users by @thomsa
- Add Microsoft OAuth provider display in settings connected accounts section by @thomsa

## [1.7.1] - 2025-12-30

### 📚 Documentation

- Add release strategy documentation and improve email provider backward compatibility by @thomsa
- Add Callout component import to installation documentation by @thomsa
- Update Amazon SES SMTP host example to use specific region by @thomsa

## [1.7.0] - 2025-12-30

### ⚙️ Miscellaneous

- Add conditional docs deployment to release workflow by @thomsa

### 🐛 Bug Fixes

- Remove deprecated deploy.sh script in favor of install.sh and update.sh by @thomsa
- Update PM2 commands to use ecosystem.config.js for process management by @thomsa
- Local storage URL building to use /api/uploads prefix instead of public url by @thomsa
- Add automatic database backup to update script and fix local storage bucket configuration by @thomsa
- Simplify local storage configuration by removing customizable path settings by @thomsa

### 🚀 Features

- Add logs and backups directories to gitignore and create logs directory during setup by @thomsa
- Improve setup wizard with clearer service port and public URL configuration by @thomsa
- Add configurable PORT setting to setup wizard by @thomsa
- Add --latest flag to install script for installing from main branch by @thomsa
- Update install and update scripts to use latest release tag instead of main branch by @thomsa
- Add SMTP email provider support alongside Brevo by @thomsa

## [1.6.8] - 2025-12-29

### Scripts

- Add Node.js 20+ requirement and version validation by @thomsa

## [1.6.7] - 2025-12-28

### 🚀 Features

- Send welcome email to new users signing up with Google by @thomsa

## [1.6.6] - 2025-12-28

### 🔧 Refactoring

- Consolidate email queue functions into email service module by @thomsa

## [1.6.5] - 2025-12-28

### 🐛 Bug Fixes

- Convert email border-radius values from rem to px for MJML compatibility by @thomsa

## [1.6.4] - 2025-12-28

### 🐛 Bug Fixes

- Remove unused email handlers import from auth handlers by @thomsa

## [1.6.3] - 2025-12-28

### ⚙️ Miscellaneous

- Reduce email processing cron frequency from every minute to daily by @thomsa

## [1.6.2] - 2025-12-28

### 🚀 Features

- Add item won email notifications and improve email logging by @thomsa
- Add winner notification tracking and background auction processing by @thomsa
- Refactor notifications to use centralized NotificationContext by @thomsa

## [1.6.1] - 2025-12-27

### Scripts

- Add vercel ignore-build script by @thomsa

### 🚀 Features

- Add quick links section to mobile settings page by @thomsa

## [1.6.0] - 2025-12-27

### 🚀 Features

- Add skeleton loading states for all major pages by @thomsa

## [1.5.0] - 2025-12-27

### ⚙️ Miscellaneous

- Remove ignoreCommand from Vercel configuration by @thomsa

### 🚀 Features

- Add "My Listings" section and improve item owner visibility by @thomsa

## [1.4.1] - 2025-12-27

### ⚙️ Miscellaneous

- Replace git deployment config with ignore command for version tags by @thomsa

## [1.4.0] - 2025-12-27

### 🚀 Features

- Add mobile bottom navigation and improve mobile UX by @thomsa

## [1.3.1] - 2025-12-26

### ⚙️ Miscellaneous

- Explicitly specify changelog file path in PR creation workflow by @thomsa

### 🚀 Features

- Disable deployment admin features on hosted deployments by @thomsa

## [1.3.0] - 2025-12-26

### ⚙️ Miscellaneous

- Change changelog workflow to create PR on tag push instead of direct commit by @thomsa
- Revert changelog workflow to commit directly to main branch by @thomsa

### 📚 Documentation

- Add deployment admin section and expand account deletion documentation by @thomsa

### 🚀 Features

- Add account deletion functionality with GDPR compliance by @thomsa

## [1.2.0] - 2025-12-26

### ⚙️ Miscellaneous

- Change changelog workflow to create PR on tag push instead of direct commit by @thomsa
- Remove tag trigger from changelog workflow by @thomsa

## [1.1.16] - 2025-12-26

### 🚀 Features

- Add debug logging for version info fetching in settings page by @thomsa

## [1.1.15] - 2025-12-25

### 🚀 Features

- Add version information display and update functionality for deployment admins by @thomsa

## [1.1.14] - 2025-12-25

### 🚀 Features

- Simplify update API response handling by removing detailed messages by @thomsa

## [1.1.13] - 2025-12-25

### 🚀 Features

- Improve update flow reliability by starting polling immediately by @thomsa

## [1.1.12] - 2025-12-25

### 🚀 Features

- Add automatic PM2 restart to update script by @thomsa
- Add deployment admin transfer functionality with user validation by @thomsa

## [1.1.11] - 2025-12-25

### 🚀 Features

- Add auto-push on version bump and improve update UI/logging by @thomsa

## [1.1.10] - 2025-12-25

### 🚀 Features

- Add npm version tag prefix configuration by @thomsa

## [1.1.8] - 2025-12-25

### 🐛 Bug Fixes

- Improve CLI setup database initialization and error handling by @thomsa
- Skip Vercel builds for changelog commits by @thomsa
- Use pre-built git-cliff binary instead of Docker action by @thomsa

### 🚀 Features

- Add update timeout handling and progress indicator by @thomsa
- Add deployment admin role and in-app update system by @thomsa
- Add automatic changelog and release workflows by @thomsa

## [1.1.5] - 2025-12-25

## [1.1.4] - 2025-12-25

## [1.1.3] - 2025-12-25

## [1.1.2] - 2025-12-25

## [1.1.1] - 2025-12-17

### 🐛 Bug Fixes

- Missing translations added by @thomsa

## [1.1.0] - 2025-12-17

### 🚀 Features

- Add recording of main features to landing by @thomsa

## [1.0.0] - 2025-12-16

## [0.2.0] - 2025-12-15

## [0.1.1] - 2025-12-15

### 🐛 Bug Fixes

- Use executeMultiple for Turso migrations to handle PRAGMA and table dependencies by @thomsa

### 🚀 Features

- Add conditional currency seeding to Vercel build by @thomsa

---
*Generated by [git-cliff](https://git-cliff.org)*
