# Auktiva

A comprehensive auction platform for hosting private and public auctions. Perfect for charity events, estate sales, club fundraisers, or any group needing a simple yet powerful auction solution.

## Features

### Auction Management
- **Create unlimited auctions** with customizable names, descriptions, and thumbnail images
- **Flexible timing** - set auction-wide end dates or individual end dates per item
- **Multiple access modes** - invite-only, link sharing, or open to all
- **Close auctions early** when needed

### Bidding
- **Real-time bid updates** - see the latest bids instantly
- **Multi-currency support** - USD, EUR, GBP, and 10+ currencies included
- **Bid history tracking** - view all your past bids and their status
- **Anonymous bidding option** - hide bidder identities if desired

### Items
- **Rich item listings** with multiple images, descriptions, and starting bids
- **Minimum bid increments** to ensure meaningful bid increases
- **Individual item timing** - end items at different times within the same auction
- **Grid or list view** for browsing items

### Member Management
- **Role-based access control**:
  - **Owner** - full control over the auction
  - **Admin** - manage members and items
  - **Creator** - add and edit their own items
  - **Bidder** - place bids only
- **Invite system** with email invitations and shareable links
- **Member can invite** option for viral growth

### Results & Export
- **Detailed results page** showing all winners
- **Personal win tracking** - see what you've won
- **Export to JSON or CSV** for record keeping

## Installation

### One-Line Install

```bash
curl -fsSL https://raw.githubusercontent.com/thomsa/auktiva/main/scripts/install.sh | bash
```

This will check prerequisites, clone the repo, install dependencies, and launch the interactive setup wizard.

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

| Environment | DATABASE_URL | Prisma CLI | Runtime |
|-------------|--------------|------------|---------|
| Development | `file:./dev.db` | ✅ Direct | SQLite adapter |
| Production | `libsql://...` | Uses local SQLite | Turso adapter |

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
STORAGE_PROVIDER="local"  # or "s3"

# Local storage
STORAGE_LOCAL_PATH="./public/uploads"
STORAGE_LOCAL_URL_PREFIX="/uploads"

# S3 storage (when STORAGE_PROVIDER="s3")
# S3_BUCKET="your-bucket-name"
# S3_REGION="us-east-1"
# S3_ACCESS_KEY_ID="your-access-key"
# S3_SECRET_ACCESS_KEY="your-secret-key"
# S3_ENDPOINT=""  # For S3-compatible services (MinIO, R2, etc.)

# =============================================================================
# FEATURES
# =============================================================================
ALLOW_OPEN_AUCTIONS="true"  # Set to "false" for hosted environments
```

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
5. Deploy

### Self-Hosted

```bash
npm run build
npm start
```

Use a reverse proxy (nginx, caddy) for HTTPS.

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: Prisma ORM with SQLite/Turso (LibSQL)
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS 4 + DaisyUI 5
- **Storage**: Local filesystem or S3-compatible

## Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Interactive setup wizard |
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run db:push` | Push schema to database |
| `npm run db:migrate` | Create migration (local SQLite) |
| `npm run db:migrate:turso` | Apply migrations to Turso |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run seed:currencies` | Seed currency data |
| `npm run seed:test-db` | Seed test data |

## License

MIT License - feel free to use this for your own projects!

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
