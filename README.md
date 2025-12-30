# Auktiva

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fthomsa%2Fauktiva&env=AUTH_SECRET,AUTH_URL,DATABASE_URL&envDescription=Required%20environment%20variables%20for%20Auktiva&envLink=https%3A%2F%2Fdocs.auktiva.org%2Fdevelopers%2Fdeployment&project-name=auktiva&repository-name=auktiva)
[![GitHub release](https://img.shields.io/github/v/release/thomsa/auktiva?include_prereleases)](https://github.com/thomsa/auktiva/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub stars](https://img.shields.io/github/stars/thomsa/auktiva)](https://github.com/thomsa/auktiva/stargazers)

A free, open-source auction platform for hosting private and public auctions. Perfect for charity events, fundraisers, schools, churches, company events, and community organizations.

**No payment processing** - all transactions are settled offline between participants.

🌐 **Live Demo**: [auktiva.org](https://auktiva.org)  
📚 **Documentation**: [docs.auktiva.org](https://docs.auktiva.org)  
📝 **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

## Features

### Auction Management

- **Create unlimited auctions** with customizable names, descriptions, and thumbnail images
- **Flexible timing** - set auction-wide end dates or individual end dates per item
- **Multiple access modes** - invite-only, link sharing, or open to all
- **Close auctions early** when needed

### Bidding

- **Real-time bid updates** - see the latest bids instantly with SWR
- **Multi-currency support** - USD, EUR, GBP, HUF, and 10+ currencies included
- **Bid history tracking** - view all your past bids and their status on the dashboard
- **Anonymous bidding** - three modes: always visible, always anonymous, or per-bid choice

### Items

- **Rich item listings** with multiple images, descriptions, and starting bids
- **Minimum bid increments** to ensure meaningful bid increases
- **Individual item timing** - end items at different times within the same auction
- **Split view** - browse items in a sidebar while viewing details

### Member Management

- **Role-based access control**:
  - **Owner** - full control over the auction including deletion
  - **Admin** - manage members, items, and auction settings
  - **Creator** - add and edit their own items
  - **Bidder** - view items and place bids
- **Invite system** with email invitations and shareable links
- **Member can invite** option for viral growth

### Notifications

- **In-app notifications** for outbids, auction wins, new items, and invites
- **Email notifications** (optional) via Brevo with user-controlled preferences
- **Email retry system** for failed deliveries with automatic retries

### Results & Export

- **Detailed results page** showing all winners
- **Personal win tracking** - see what you've won across all auctions
- **Export to JSON or CSV** for record keeping

## Release Strategy

Auktiva follows a **rolling release** model:

- **Only the latest version is supported** - We do not maintain older versions or backport fixes
- **Always update to latest** - Running older versions may have known issues that have been resolved
- **Bugs are fixed forward** - If you encounter a bug, update first before reporting

> ⚠️ **Keep your instance up to date.** Older versions are not maintained and may contain bugs or security issues fixed in newer releases.

## Requirements

- **Node.js 20.0.0 or higher** (LTS recommended)
- npm 10+ (comes with Node.js 20+)

Check your Node.js version:
```bash
node --version
```

If you need to upgrade, download from [nodejs.org](https://nodejs.org/) or use a version manager:
```bash
# Using nvm
nvm install 20
nvm use 20
```

## Installation

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/thomsa/auktiva/main/scripts/install.sh | bash
```

This will check prerequisites (including Node.js version), clone the repo, install dependencies, and launch the interactive setup wizard.

### Manual Install

```bash
git clone https://github.com/thomsa/auktiva.git
cd auktiva
npm install
npm run setup
```

The setup wizard will guide you through:

- **Storage configuration** - Local filesystem or S3-compatible storage
- **Database setup** - SQLite (local) or Turso (production)
- **Domain configuration** - Auto-generates secure AUTH_SECRET
- **Feature flags** - Enable/disable public auctions

After setup, visit your configured URL to create your first account.

### Manual Configuration

If you prefer to configure manually:

```bash
cp .env.example .env
# Edit .env with your settings

npm run db:push
npm run seed:currencies
npm run build
npm start
```

## Database Setup

Auktiva supports two database options:

### Option 1: Local SQLite (Development)

SQLite is the default and requires no additional setup. Perfect for development and small deployments.

```env
DATABASE_URL="file:./dev.db"
```

**Commands:**

```bash
npm run db:push        # Apply schema changes
npm run db:migrate     # Create and apply migrations
npm run db:studio      # Open database GUI
```

### Option 2: Turso (Production)

[Turso](https://turso.tech) is a distributed SQLite database, ideal for production deployments with edge computing support.

#### Setup Steps:

1. **Install Turso CLI**

   ```bash
   curl -sSfL https://get.tur.so/install.sh | bash
   turso auth login
   ```

2. **Create a database**

   ```bash
   turso db create auktiva
   turso db show auktiva --url    # Get the URL
   turso db tokens create auktiva # Get the auth token
   ```

3. **Configure environment**

   ```env
   DATABASE_URL="libsql://auktiva-yourorg.turso.io"
   DATABASE_AUTH_TOKEN="your-auth-token"
   ```

4. **Apply migrations**
   ```bash
   npm run db:migrate:turso
   ```

#### How it works:

| Environment | DATABASE_URL    | Prisma CLI        | Runtime        |
| ----------- | --------------- | ----------------- | -------------- |
| Development | `file:./dev.db` | ✅ Direct         | SQLite adapter |
| Production  | `libsql://...`  | Uses local SQLite | Turso adapter  |

The app automatically detects the database type from `DATABASE_URL` and uses the appropriate adapter:

- `file:./...` → BetterSqlite3 adapter
- `libsql://...` or `https://...` → LibSQL adapter (Turso)

## Configuration

### Environment Variables

```env
# =============================================================================
# DATABASE
# =============================================================================
# Local SQLite (development)
DATABASE_URL="file:./dev.db"

# OR Turso (production)
# DATABASE_URL="libsql://your-database.turso.io"
# DATABASE_AUTH_TOKEN="your-turso-auth-token"

# =============================================================================
# AUTHENTICATION
# =============================================================================
# Generate with: openssl rand -base64 32
AUTH_SECRET="your-secret-key"
AUTH_URL="http://localhost:3000"

# =============================================================================
# STORAGE
# =============================================================================
STORAGE_PROVIDER="local"  # or "s3" (local uses ./public/uploads)

# S3 storage (when STORAGE_PROVIDER="s3")
# S3_BUCKET="your-bucket-name"
# S3_REGION="us-east-1"
# S3_ACCESS_KEY_ID="your-access-key"
# S3_SECRET_ACCESS_KEY="your-secret-key"
# S3_ENDPOINT=""  # For S3-compatible services (MinIO, R2, etc.)

# =============================================================================
# EMAIL (Optional)
# =============================================================================
# EMAIL_PROVIDER="brevo"  # or "smtp"
# MAIL_FROM="noreply@yourdomain.com"
# MAIL_FROM_NAME="Your App Name"
# NEXT_PUBLIC_APP_URL="https://yourdomain.com"
# CRON_SECRET="your-cron-secret"  # For securing the retry-emails endpoint

# Brevo (when EMAIL_PROVIDER="brevo")
# BREVO_API_KEY="your-brevo-api-key"

# SMTP (when EMAIL_PROVIDER="smtp")
# SMTP_HOST="smtp.example.com"
# SMTP_PORT="587"
# SMTP_SECURE="false"
# SMTP_USER="your-username"
# SMTP_PASSWORD="your-password"

# =============================================================================
# FEATURES
# =============================================================================
ALLOW_OPEN_AUCTIONS="true"  # Set to "false" for hosted environments
```

### Email Notifications (Optional)

Auktiva can send email notifications for:

- **Welcome emails** when users register
- **Auction invites** when users are invited to auctions
- **New item notifications** when items are added to auctions you're a member of
- **Outbid notifications** when someone outbids you

Auktiva supports two email providers: **Brevo** (cloud service) and **SMTP** (any SMTP server).

#### Option 1: Brevo (Cloud Service)

[Brevo](https://www.brevo.com/) (formerly Sendinblue) offers a free tier with **300 emails/day** - perfect for small to medium deployments.

1. **Create a Brevo account** at [brevo.com](https://www.brevo.com/)

2. **Get your API key** from [Settings → API Keys](https://app.brevo.com/settings/keys/api)

3. **Configure environment variables**

   ```env
   EMAIL_PROVIDER="brevo"
   BREVO_API_KEY="your-brevo-api-key"
   MAIL_FROM="noreply@yourdomain.com"
   MAIL_FROM_NAME="Auktiva"
   NEXT_PUBLIC_APP_URL="https://yourdomain.com"
   CRON_SECRET="generate-with-openssl-rand-base64-32"
   ```

4. **Verify your sender domain** (recommended) in Brevo Settings → Senders & IP

#### Option 2: SMTP Server

Use any SMTP server (Gmail, Mailgun, Amazon SES, self-hosted, etc.).

```env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.example.com"
SMTP_PORT="587"
SMTP_SECURE="false"  # true for port 465, false for STARTTLS (port 587)
SMTP_USER="your-username"  # Optional, omit for no authentication
SMTP_PASSWORD="your-password"  # Optional
MAIL_FROM="noreply@yourdomain.com"
MAIL_FROM_NAME="Auktiva"
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

**Common SMTP configurations:**

| Provider | Host | Port | Secure |
|----------|------|------|--------|
| Gmail | smtp.gmail.com | 587 | false |
| Mailgun | smtp.mailgun.org | 587 | false |
| Amazon SES | email-smtp.{region}.amazonaws.com | 587 | false |
| SendGrid | smtp.sendgrid.net | 587 | false |
| Local (Mailpit) | localhost | 1025 | false |

#### Email Retry System

Failed emails are automatically retried via a cron job. On Vercel, this runs daily at 1:00 AM UTC. The system will retry up to 5 times before marking an email as abandoned.

#### User Email Preferences

Users can manage their email notification preferences in **Settings → Email Notifications**:

- Toggle notifications for new items in auctions (disabled by default)
- Toggle notifications when outbid (disabled by default)

Email notifications are disabled by default to conserve email quota. Users can enable them if they want email alerts in addition to in-app notifications.

### reCAPTCHA (Optional)

Protect registration from bots with Google reCAPTCHA v2 checkbox. If not configured, reCAPTCHA is completely disabled (useful for local development and self-hosting).

1. **Get reCAPTCHA keys** at [google.com/recaptcha/admin](https://www.google.com/recaptcha/admin)

   - Choose reCAPTCHA v2 → "I'm not a robot" Checkbox
   - Add your domain(s)

2. **Configure environment variables**
   ```env
   NEXT_PUBLIC_RECAPTCHA_SITE_KEY="your-site-key"
   RECAPTCHA_SECRET_KEY="your-secret-key"
   ```

The registration form will automatically show the reCAPTCHA checkbox widget.

## Deployment

### Vercel + Turso (Recommended)

1. Create a Turso database and get credentials
2. Push code to GitHub
3. Import project in Vercel
4. Set environment variables:
   - `DATABASE_URL` - Your Turso URL
   - `DATABASE_AUTH_TOKEN` - Your Turso token
   - `AUTH_SECRET` - Generate with `openssl rand -base64 32`
   - `AUTH_URL` - Your production URL
   - `BREVO_API_KEY` - (Optional) For email notifications
   - `MAIL_FROM` - (Optional) Sender email address
   - `CRON_SECRET` - (Optional) For email retry cron job
5. Deploy

**Note:** Database migrations are automatically applied during the Vercel build process.

### Self-Hosted

```bash
npm run build
npm start
```

Use a reverse proxy (nginx, caddy) for HTTPS.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: Prisma ORM 7 with SQLite/Turso (LibSQL)
- **Authentication**: NextAuth.js v4
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Icons**: Tabler Icons via Iconify
- **Forms**: React Hook Form + Zod validation
- **Data Fetching**: SWR for real-time updates
- **Email**: Brevo (formerly Sendinblue) with MJML templates
- **Storage**: Local filesystem or S3-compatible (AWS S3, MinIO, Cloudflare R2)
- **Image Processing**: Sharp for thumbnails and optimization

## Scripts

| Command                    | Description                     |
| -------------------------- | ------------------------------- |
| `npm run setup`            | Interactive setup wizard        |
| `npm run dev`              | Start development server        |
| `npm run build`            | Build for production            |
| `npm start`                | Start production server         |
| `npm run db:push`          | Push schema to database         |
| `npm run db:migrate`       | Create migration (local SQLite) |
| `npm run db:migrate:turso` | Apply migrations to Turso       |
| `npm run db:studio`        | Open Prisma Studio              |
| `npm run db:generate`      | Regenerate Prisma client        |
| `npm run seed:currencies`  | Seed currency data              |
| `npm run seed:test-db`     | Seed test data                  |

## Screenshots

_Coming soon_

## License

MIT License - feel free to use this for your own projects!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Created by [Tamas Lorincz](https://www.tamaslorincz.com)
