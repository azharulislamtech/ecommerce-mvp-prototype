# Compact Handoff

Use this file to resume safely. Explain all user-facing results in Bangla. Read `AGENTS.md`, `AI_HANDOFF.md`, the roadmap and decision log before changes; update engineering/context documentation after meaningful work.

## Current State (2026-10-02)

- Project: Kena Sathi, `D:\WebApplication\Ecommerce application`.
- Local stack: Next.js 16.3.8, React 19.3, TypeScript, Tailwind, Supabase PostgreSQL/Auth/Storage, Flyway. Read installed Next guides before framework code edits.
- Branding: `src/app/icon.svg` is the master KS artwork, reused by the shared `BrandLogo`; favicon/Apple/manifest PNG assets and home Organization logo metadata are configured. PNG/ICO derivatives must be regenerated together when the SVG changes.
- Current production: logo setup source `df1175e` at kenasathi.com as `dpl_C2qv3XQa3UhMRHvvfpNU8BftpfRp`; PR #2 merged into main as `d044060`, GitHub CI passed. All 13 staged/live release checks and live icon/manifest checks passed; 9 isolated production-browser tests passed. Previous hardening deployment `dpl_6x7VyDCPSkxivzgZBno8FHcVCUNf` remains an immediate rollback target. Earlier hardening live browser checks: 6 passed, 3 intentionally skipped (no real customer writes/admin credentials).
- PR https://github.com/azharulislamtech/ecommerce-mvp-prototype/pull/1 merged with explicit owner approval as `0424997`. GitHub CI run `36997183643` passed all checks. Workspace is on main and Vercel authentication is complete.
- Authorized remote Flyway rollout: V1-V10 successful, schema version 10. Encrypted DB/Storage backup and restored-data migration/concurrency checks passed. Application is deployed; monitor and use the recorded rollback target if needed.
- Existing catalog/admin CRUD, COD checkout, server-calculated Dhaka BDT 60/other districts BDT 120 delivery, cart persistence, secure order tracking, verified reviews/moderation and Telegram notifications remain implemented.
- Local V9 adds idempotent checkout, accepted-order quotas, duplicate-item normalization, transactional stock release/re-reservation, explicit courier-return inventory confirmation and atomic admin/gateway settlement. Historical cancelled stock is unknown; never bulk-restock. Refund status records an already-completed manual refund.
- Local SEO adds category canonical URLs, real Product/Breadcrumb JSON-LD, sitemap timestamps and utility/admin noindex. Demo specs were removed; owner-confirmed listing facts still need work.
- Health/error instrumentation, optional privacy-filtered analytics, CI and disposable DB/browser regression suites are added. Account-side alerts/analytics/backup restore are not activated by source changes.
- Online SSLCommerz checkout stays disabled. Real sandbox/IPN certification and reservation-expiry policy remain required before enabling it.

## Verified Locally

- Lint, typecheck and production build passed.
- Database tests: 17 passed (actual migrations V1-V10 in PGlite); real Supabase admin RLS CRUD/checkout/stock/settlement transaction checks also passed and were rolled back.
- Unit tests: 3 passed.
- Browser tests: 9 passed in development and 9 passed against a production build, including COD server action/tracking, simulated admin login/cancellation/return confirmation, SEO/mobile/cart/admin guards.
- Registry-backed npm audit: 0 vulnerabilities.
- Browser fixtures simulate Auth/PostgREST. Separately verified real Supabase role/RLS transaction behavior and Storage file downloads; restored the production public schema to PostgreSQL 18 and tested 3 independent concurrent sessions. Real login/Storage upload, gateway settlement and full cloud platform recovery remain unverified.

## Release And Safety

- Follow `docs/production-release.md` for remaining real Auth/Storage integration, Vercel deployment, live checks and account-side monitoring/backup gates. V8-V10 are already applied.
- Confirm actual product models/specs/warranties, images, return address, support/policy commitments and Facebook URL with owner; never invent them.
- Do not print/commit `.env.local`, `flyway.conf`, service keys, admin passwords or gateway credentials. The earlier exposed service key was rotated on 2026-07-07; see `docs/secret-rotation.md`.
- Default shared-server E2Es are non-destructive. Mutating tests run through the disposable isolated runner only.
- Do not share `.next` between a running dev server and build; isolated tests use `.next-isolated`.

## Commands And Files

```powershell
npm run dev
npm run lint
npm run typecheck
npm run test:unit
npm run test:db
npm run test:e2e:install
npm run test:e2e:production
npm run build
npm audit --audit-level=high
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" info
```

- Detailed context: `AI_HANDOFF.md`.
- Release/recovery: `docs/production-release.md`.
- Testing boundaries: `docs/e2e-testing.md`.
- Engineering/decisions/roadmap: `docs/engineering-log.md`, `docs/decision-log.md`, `docs/production-roadmap.md`.
- Database/setup: `db/migration/`, `docs/supabase-setup.md`.
- App actions: `src/app/actions.ts`; async SSR auth: `src/lib/supabase/auth.ts`; proxy: `src/proxy.ts`.
- Catalog/SEO: `src/lib/catalog.ts`, `src/lib/seo.ts`.
- Gateway: `src/lib/payments/`, `docs/payment-integration.md`.
- Tests: `tests/db/`, `tests/unit/`, `tests/e2e/`, `tests/support/`, `scripts/test-isolated-e2e.mjs`.
