# Auktiva - Windsurf AI Context

> **IMPORTANT**: Read this file at the start of every new chat session to understand the project.

## Quick Reference

| Aspect | Value |
|--------|-------|
| Framework | Next.js 16 with **Pages Router** |
| Auth | NextAuth **v4** (NOT v5) |
| ORM | Prisma **7** with SQLite |
| Styling | Tailwind v4 + FlyonUI |
| Icons | Tabler via @iconify/tailwind4 |

## Critical Rules

1. **ALWAYS use Pages Router** - Files go in `src/pages/`, NOT `src/app/`
2. **NEVER use App Router patterns** - No `"use client"` at top of pages, no `app/` directory
3. **Use NextAuth v4 API** - `getServerSession(req, res, authOptions)`, NOT `auth()`
4. **Prisma 7 config** - Uses `prisma.config.ts`, adapter required for SQLite

## File Locations

```
src/pages/           # All pages (Pages Router)
src/pages/api/       # API routes
src/components/      # React components
src/lib/auth.ts      # NextAuth v4 config (exports authOptions)
src/lib/prisma.ts    # Prisma client singleton
src/styles/globals.css  # Tailwind v4 + FlyonUI
```

## Common Patterns

### Protected Page
```typescript
import { GetServerSideProps } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  if (!session) {
    return { redirect: { destination: "/login", permanent: false } };
  }
  return { props: { user: session.user } };
};
```

### API Route
```typescript
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  // ...
}
```

### FlyonUI Components
```tsx
// Buttons
<button className="btn btn-primary">Primary</button>
<button className="btn btn-ghost btn-circle">
  <span className="icon-[tabler--settings] size-5"></span>
</button>

// Cards
<div className="card bg-base-100 shadow-xl">
  <div className="card-body">
    <h2 className="card-title">Title</h2>
    <p>Content</p>
  </div>
</div>

// Forms
<input className="input input-bordered w-full" />
<div className="alert alert-error">Error message</div>
```

## Current State

### Completed
- Authentication (login/register)
- Dashboard page
- Theme switching
- Database schema with all models

### Next Steps
- Create auction flow
- Auction detail page
- Item management
- Bidding system

## Full Documentation

See `.windsurf/project-context.md` for complete architecture details, database schema, and code patterns.
