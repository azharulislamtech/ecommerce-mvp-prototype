# Kena Sathi E-commerce

A responsive Next.js e-commerce storefront for Kena Sathi, focused on product discovery, checkout, order tracking, and admin management.

## Current Status

- Kena Sathi storefront and admin UI are deployed on the production domain.
- Shared SVG branding, browser/favicon/Apple icons, manifest icons and Organization logo metadata use the same emerald/gold KS identity. Master artwork: `src/app/icon.svg`; derived PNG icons: `public/brand/`.
- Supabase PostgreSQL schema is versioned with Flyway.
- Authorized rollout on 2026-10-02 applied V8-V10 (schema `10`) and deployed the hardening revision to `https://kenasathi.com`. Live release checks and non-destructive browser regressions passed; see `docs/production-release.md` for evidence and remaining operational gates.
- Hardening adds Next.js 16/React 19, checkout retry protection, atomic stock/payment updates, category SEO, structured data, health checks and isolated regression tests. Follow `docs/production-release.md` for release evidence and remaining account-side gates.
- Public catalog pages read active categories/products and uploaded product images from Supabase; admin panel routes are protected by Supabase Auth; admin product CRUD is implemented with Supabase RLS; cart and checkout create real pending Cash on Delivery Supabase orders through a trusted PostgreSQL RPC with district-based delivery charges; admin order list/details/dashboard overview are Supabase-backed; SSLCommerz hosted checkout code is implemented but disabled by default until gateway verification/customer demand.

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
npm run test:unit
npm run test:db
npm run test:e2e:production
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

Do not commit or paste `.env.local`, `flyway.conf`, database passwords, service role keys, SSLCommerz credentials, or other payment gateway secrets. The Supabase service role key that was exposed during setup was **rotated on 2026-07-07** (migrated to a new Supabase secret key; the legacy `service_role` JWT was disabled).

Follow `docs/secret-rotation.md` for the runbook if a future rotation is needed. Verify any configured key with `npm run verify:service-key` (it never prints the key).
