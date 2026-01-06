---
trigger: always_on
---

# Auktiva - Project Context for Windsurf

> This file provides complete context for Windsurf AI to understand the project architecture, tech stack, and current state.

## Project Overview

**Auktiva** is a private auction platform where users can create auctions, invite participants, add items, and conduct bidding. The platform supports role-based permissions (Owner, Admin, Bidder) and multiple currencies.

## Tech Stack

### Core Framework

- **Next.js 16** with **Pages Router** (NOT App Router)
- **TypeScript** for type safety
- **React 19** for UI components

### Database & ORM

- **Prisma 7** with SQLite (development)
- **Better SQLite3 adapter** (`@prisma/adapter-better-sqlite3`)
- Database file: `./dev.db` (project root)
- Generated client: `src/generated/prisma`
- Config: `prisma.config.ts` (Prisma 7 style)
- IMPORTANT: Whenever you change schema you need to generate a migration file
- IMPORTANT: On production we use Turso DB and it requires migrations to be run. It's scripts are available in ./scripts/migrate-turso

### Authentication

- **NextAuth v4** (NOT v5 - downgraded for Next.js 16 compatibility)
- Credentials provider (email/password)
- JWT session strategy
- Password hashing with `bcryptjs`

### Styling & UI

- **Tailwind CSS v4** with `@tailwindcss/postcss`
- **FlyonUI** component library (DaisyUI-like semantic classes)
- **Tabler Icons** via `@iconify/tailwind4`
- Themes: `light` and `dark` (FlyonUI defaults)

### Validation

- **Zod** for schema validation

## Project Structure

```
auktiva/
├── prisma/
│   ├── schema.prisma          # Database models
│   ├── seed.ts                # Database seeding (currencies)
│   └── dev.db                 # SQLite database
├── prisma.config.ts           # Prisma 7 configuration
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── navbar.tsx     # Navigation bar with theme toggle
│   │   └── providers/
│   │       └── theme-provider.tsx  # Theme context (light/dark)
│   ├── generated/
│   │   └── prisma/            # Generated Prisma client
│   ├── lib/
│   │   ├── auth.ts            # NextAuth v4 configuration
│   │   └── prisma.ts          # Prisma client singleton
│   ├── pages/
│   │   ├── _app.tsx           # App wrapper (SessionProvider, ThemeProvider)
│   │   ├── _document.tsx      # Custom document (data-theme attribute)
│   │   ├── index.tsx          # Root redirect (to login or dashboard)
│   │   ├── login.tsx          # Login page
│   │   ├── register.tsx       # Registration page
│   │   ├── dashboard.tsx      # User dashboard
│   │   └── api/
│   │       └── auth/
│   │           ├── [...nextauth].ts  # NextAuth handler
│   │           └── register.ts       # Registration API
│   ├── styles/
│   │   └── globals.css        # Tailwind v4 + FlyonUI config
│   └── types/
│       └── next-auth.d.ts     # NextAuth type extensions
├── .env                       # Environment variables
├── package.json
├── postcss.config.mjs         # PostCSS with @tailwindcss/postcss
└── tsconfig.json
```

## Authentication Flow

### NextAuth v4 Configuration (`src/lib/auth.ts`)

- Uses `CredentialsProvider` with email/password
- JWT session strategy
- Custom pages: `/login`, `/login` (error)
- Session includes `user.id`

### Protected Routes

- Use `getServerSession(context.req, context.res, authOptions)` in `getServerSideProps`
- Redirect to `/login` if not authenticated

### Registration

- API route: `POST /api/auth/register`
- Validates with Zod schema
- Hashes password with bcryptjs (12 rounds)
- Creates user in database

## Styling Guidelines

### CSS Configuration (`src/styles/globals.css`)

```css
@import "tailwindcss";

@plugin "flyonui" {
  themes:
    [ "light",
    "dark"];
}

@plugin "@iconify/tailwind4" {
  prefixes: tabler;
}
```

### Theme System

- Uses `data-theme` attribute on `<html>`
- ThemeProvider manages state and localStorage
- Storage key: `auktiva-theme`
- Values: `light`, `dark`, `system`

### FlyonUI Classes

- Semantic classes like `btn`, `card`, `input`, `alert`
- Color classes: `btn-primary`, `bg-base-100`, `text-base-content`
- Icon classes: `icon-[tabler--icon-name]`

## Environment Variables

```env
DATABASE_URL="file:./dev.db"
AUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## Commands

```bash
# Development
npm run dev

# Database
npm run db:generate    # Generate Prisma client
npm run db:push        # Push schema to database
npm run db:seed        # Seed currencies

# Build
npm run build
npm start
```

## Important Notes

### Pages Router (NOT App Router)

- All pages in `src/pages/`
- No `"use client"` directives needed (except for components using hooks)
- Use `getServerSideProps` for server-side data fetching
- API routes in `src/pages/api/`

### Prisma 7 Specifics

- Configuration in `prisma.config.ts` (not in schema.prisma)
- Requires adapter for SQLite: `@prisma/adapter-better-sqlite3`
- Client generated to `src/generated/prisma`
- Import from `@/generated/prisma` or `@prisma/client`

### NextAuth v4 (NOT v5)

- v5 beta has compatibility issues with Next.js 16
- Use `getServerSession` from `next-auth` (not `next-auth/next`)
- Export `authOptions` from `src/lib/auth.ts`

### Known Lint Warnings (Non-blocking)

- CSS `@plugin` warnings: IDE doesn't recognize Tailwind v4 syntax
- `setState in useEffect` in theme-provider: Intentional for localStorage sync

## Feature Roadmap

### Phase 1 (Completed)

- [x] Project setup with Next.js 16 + Pages Router
- [x] Prisma 7 with SQLite
- [x] NextAuth v4 authentication
- [x] Login/Register pages
- [x] Dashboard page
- [x] Theme switching (light/dark)
- [x] FlyonUI styling

### Phase 2 (Completed)

- [x] Create auction flow (`/auctions/create`)
- [x] Auction detail page (`/auctions/[id]`)
- [x] Invite system (`/auctions/[id]/invite`, `/invite/[token]`)
- [x] Item management (`/auctions/[id]/items/create`)
- [x] Bidding system (`/auctions/[id]/items/[itemId]`)

### Phase 3 (Pending)

- [ ] Real-time updates (polling)
- [ ] Auction closing logic
- [ ] Winner determination
- [ ] Member management page

### Phase 4 (Pending)

- [ ] User settings
- [ ] Notifications
- [ ] Auction history
- [ ] Export/reporting

## Code Patterns

### Server-Side Auth Check

```typescript
export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);

  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }

  return { props: { user: session.user } };
};
```

### API Route with Validation

```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  /* ... */
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.issues });
  }

  // Handle request...
}
```

### Component with Theme

```typescript
import { useTheme } from "@/components/providers/theme-provider";

export function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button onClick={() => setTheme(resolvedTheme === "light" ? "dark" : "light")}>
      Toggle Theme
    </button>
  );
}
```
