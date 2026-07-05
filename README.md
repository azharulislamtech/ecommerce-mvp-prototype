# ShopPilot E-commerce MVP

A responsive Next.js e-commerce prototype being hardened into a production-grade single-brand store.

## Current Status

- Storefront and admin UI prototype exists.
- Supabase PostgreSQL schema is versioned with Flyway.
- Flyway migrations are applied through schema version `5`.
- Public catalog pages read active categories/products and uploaded product images from Supabase; admin panel routes are protected by Supabase Auth; admin product CRUD is implemented with Supabase RLS; cart and checkout create real pending Supabase orders through a trusted PostgreSQL RPC; admin order list/details/dashboard overview are Supabase-backed; SSLCommerz hosted checkout is implemented with server-side validation and payment event logging.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Supabase PostgreSQL
- Supabase Storage
- Supabase Auth for admin users
- Flyway migrations
- Future backend target: Spring Boot + Kotlin

## Start Here For Future AI Or Engineers

Read these files before changing code:

- `COMPACT_HANDOFF.md`
- `AI_HANDOFF.md`
- `docs/production-roadmap.md`
- `docs/engineering-log.md`
- `docs/decision-log.md`
- `docs/supabase-setup.md`
- `docs/e2e-testing.md`
- `docs/payment-integration.md`

Every meaningful change must update `docs/engineering-log.md`. Architecture, database, and security decisions must update `docs/decision-log.md`.

## Project Structure

```text
src/
  app/                  Next.js routes, layouts, server actions, global CSS
  components/
    ui/                 Small reusable UI primitives
    modules/            Product, checkout, and page modules
    layouts/            Site and admin layouts
  lib/                  Mock data, Supabase helpers, payment adapters, types, utilities

db/
  migration/            Flyway versioned migrations
  seed/                 Optional seed SQL

docs/                   Production roadmap, logs, setup notes, decisions
```

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Supabase Database

Database setup is documented in `docs/supabase-setup.md`.

Check migration state:

```powershell
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" info
```

Run pending migrations:

```powershell
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" migrate
```

## Security Note

Do not commit or paste `.env.local`, `flyway.conf`, database passwords, service role keys, SSLCommerz credentials, or other payment gateway secrets. Rotate the Supabase service role key before production because it was exposed during setup.

Follow `docs/secret-rotation.md` to rotate the service role key safely. Verify any configured key with `npm run verify:service-key` (it never prints the key). Rotation is only complete once the old key is confirmed dead.
