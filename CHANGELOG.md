# Changelog

All notable changes to Auktiva will be documented in this file.

## [1.16.6] - 2026-01-08

### 📚 Documentation

- Add MDX documentation requirements and clean up bid error logging

## [1.16.5] - 2026-01-08

### 📚 Documentation

- Simplify Soketi host configuration callout formatting

## [1.16.4] - 2026-01-08

### 🚀 Features

- Add UserAvatar component and improve bid error logging

## [1.16.3] - 2026-01-08

### 🚀 Features

- Add type-safe channel names with branded types for realtime system

## [1.16.2] - 2026-01-08

### 🚀 Features

- Add Vercel Live to CSP and improve realtime/theme hydration

## [1.16.1] - 2026-01-07

### 🚀 Features

- Add Pusher WebSocket domain to CSP connect-src directive

## [1.16.0] - 2026-01-07

### 🚀 Features

- Add realtime WebSocket support with Soketi and Pusher integration 

## [1.15.0] - 2026-01-07

### 🚀 Features

- Add discussion system with rich text editor enhancements and bulk edit support
- Add detailed explanation for open auctions feature in CLI setup

## [1.14.1] - 2026-01-06

### 📚 Documentation

- Remove WebSocket references from landing page and documentation

## [1.14.0] - 2026-01-05

### 🚀 Features

- Introduce redirect after login to original urls
- Add polling interval hook with tab visibility and priority-based intervals

## [1.13.0] - 2026-01-02

### 🚀 Features

- Add filtering and sorting to bulk edit table

## [1.12.1] - 2026-01-01

### 📚 Documentation

- Add bulk edit and CSV import documentation

## [1.12.0] - 2026-01-01

### 🚀 Features

- Add bulk edit and CSV import UI buttons with translations
- Add draft/publish system for auction items with translations

## [1.11.4] - 2025-12-31

### ⚙️ Miscellaneous

- Revert to dompurify, add Vercel Live CSP, and format code

## [1.11.3] - 2025-12-31

## [1.11.2] - 2025-12-31

### 🐛 Bug Fixes

- Replace dompurify with isomorphic-dompurify for SSR compatibility

## [1.11.1] - 2025-12-31

### 🐛 Bug Fixes

- Add Callout component import to security documentation

## [1.11.0] - 2025-12-31

### ⚙️ Miscellaneous

- Remove Windsurf context files, add security documentation, and update dependencies

### 🚀 Features

- Add email verification system with translations and rate limiting

## [1.10.0] - 2025-12-30

### 🚀 Features

- Add public auction sharing with OG metadata and copy link functionality

## [1.9.0] - 2025-12-30

### 🚀 Features

- Allow item owners to end their items early from detail page
- Add rich text editor support for auction and item descriptions with translations

## [1.8.3] - 2025-12-30

### 🚀 Features

- Add changelog page with translations and markdown support

## [1.8.2] - 2025-12-30

### ⚙️ Miscellaneous

- Format code and update OAuth documentation to include Microsoft provider

## [1.8.1] - 2025-12-30

### 🚀 Features

- Add SEO metadata for login page and optimize notification polling for authenticated users
- Add Microsoft OAuth provider display in settings connected accounts section

## [1.7.1] - 2025-12-30

### 📚 Documentation

- Add release strategy documentation and improve email provider backward compatibility
- Add Callout component import to installation documentation
- Update Amazon SES SMTP host example to use specific region

## [1.7.0] - 2025-12-30

### ⚙️ Miscellaneous

- Add conditional docs deployment to release workflow

### 🐛 Bug Fixes

- Remove deprecated deploy.sh script in favor of install.sh and update.sh
- Update PM2 commands to use ecosystem.config.js for process management
- Local storage URL building to use /api/uploads prefix instead of public url
- Add automatic database backup to update script and fix local storage bucket configuration
- Simplify local storage configuration by removing customizable path settings

### 🚀 Features

- Add logs and backups directories to gitignore and create logs directory during setup
- Improve setup wizard with clearer service port and public URL configuration
- Add configurable PORT setting to setup wizard
- Add --latest flag to install script for installing from main branch
- Update install and update scripts to use latest release tag instead of main branch
- Add SMTP email provider support alongside Brevo

## [1.6.8] - 2025-12-29

### Scripts

- Add Node.js 20+ requirement and version validation

## [1.6.7] - 2025-12-28

### 🚀 Features

- Send welcome email to new users signing up with Google

## [1.6.6] - 2025-12-28

### 🔧 Refactoring

- Consolidate email queue functions into email service module

## [1.6.5] - 2025-12-28

### 🐛 Bug Fixes

- Convert email border-radius values from rem to px for MJML compatibility

## [1.6.4] - 2025-12-28

### 🐛 Bug Fixes

- Remove unused email handlers import from auth handlers

## [1.6.3] - 2025-12-28

### ⚙️ Miscellaneous

- Reduce email processing cron frequency from every minute to daily

## [1.6.2] - 2025-12-28

### 🚀 Features

- Add item won email notifications and improve email logging
- Add winner notification tracking and background auction processing
- Refactor notifications to use centralized NotificationContext

## [1.6.1] - 2025-12-27

### Scripts

- Add vercel ignore-build script

### 🚀 Features

- Add quick links section to mobile settings page

## [1.6.0] - 2025-12-27

### 🚀 Features

- Add skeleton loading states for all major pages

## [1.5.0] - 2025-12-27

### ⚙️ Miscellaneous

- Remove ignoreCommand from Vercel configuration

### 🚀 Features

- Add "My Listings" section and improve item owner visibility

## [1.4.1] - 2025-12-27

### ⚙️ Miscellaneous

- Replace git deployment config with ignore command for version tags

## [1.4.0] - 2025-12-27

### 🚀 Features

- Add mobile bottom navigation and improve mobile UX

## [1.3.1] - 2025-12-26

### ⚙️ Miscellaneous

- Explicitly specify changelog file path in PR creation workflow

### 🚀 Features

- Disable deployment admin features on hosted deployments

## [1.3.0] - 2025-12-26

### ⚙️ Miscellaneous

- Change changelog workflow to create PR on tag push instead of direct commit
- Revert changelog workflow to commit directly to main branch

### 📚 Documentation

- Add deployment admin section and expand account deletion documentation

### 🚀 Features

- Add account deletion functionality with GDPR compliance

## [1.2.0] - 2025-12-26

### ⚙️ Miscellaneous

- Change changelog workflow to create PR on tag push instead of direct commit
- Remove tag trigger from changelog workflow

## [1.1.16] - 2025-12-26

### 🚀 Features

- Add debug logging for version info fetching in settings page

## [1.1.15] - 2025-12-25

### 🚀 Features

- Add version information display and update functionality for deployment admins

## [1.1.14] - 2025-12-25

### 🚀 Features

- Simplify update API response handling by removing detailed messages

## [1.1.13] - 2025-12-25

### 🚀 Features

- Improve update flow reliability by starting polling immediately

## [1.1.12] - 2025-12-25

### 🚀 Features

- Add automatic PM2 restart to update script
- Add deployment admin transfer functionality with user validation

## [1.1.11] - 2025-12-25

### 🚀 Features

- Add auto-push on version bump and improve update UI/logging

## [1.1.10] - 2025-12-25

### 🚀 Features

- Add npm version tag prefix configuration

## [1.1.8] - 2025-12-25

### 🐛 Bug Fixes

- Improve CLI setup database initialization and error handling
- Skip Vercel builds for changelog commits
- Use pre-built git-cliff binary instead of Docker action

### 🚀 Features

- Add update timeout handling and progress indicator
- Add deployment admin role and in-app update system
- Add automatic changelog and release workflows

## [1.1.5] - 2025-12-25

## [1.1.4] - 2025-12-25

## [1.1.3] - 2025-12-25

## [1.1.2] - 2025-12-25

## [1.1.1] - 2025-12-17

### 🐛 Bug Fixes

- Missing translations added

## [1.1.0] - 2025-12-17

### 🚀 Features

- Add recording of main features to landing

## [1.0.0] - 2025-12-16

## [0.2.0] - 2025-12-15

## [0.1.1] - 2025-12-15

### 🐛 Bug Fixes

- Use executeMultiple for Turso migrations to handle PRAGMA and table dependencies

### 🚀 Features

- Add conditional currency seeding to Vercel build

---
*Generated by [git-cliff](https://git-cliff.org)*
