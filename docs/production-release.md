# Production release and recovery

Database and application rollout completed on 2026-10-02. The application is live at https://kenasathi.com. This verifies the tested COD storefront release, not live gateway certification or a full Supabase cloud backup restore.

Latest logo-only deployment: `dpl_C2qv3XQa3UhMRHvvfpNU8BftpfRp`, source `df1175e`, URL https://ecommerce-mvp-prototype-muq7dv1ir-azadbasis-4964s-projects.vercel.app. PR #2 merged into main as `d044060`; GitHub CI passed. Production build, 9 isolated browser regressions, all 13 staged/live release checks and live icon/manifest checks passed. Shared SVG branding, favicon, Apple touch and manifest icons are configured. The hardening deployment below is now the immediate rollback target; no DB changes were made for this logo release.

Local lint/typecheck/build, 17 database tests, 3 unit tests and 9 isolated production-browser tests passed, with 0 audited vulnerabilities. Encrypted DB/Storage backup and restored-data PostgreSQL concurrency/migration checks passed; remote V8-V10 applied successfully. Real Supabase RLS/RPC transaction checks passed with complete rollback. Vercel cloud build and 13 staged/live release checks passed. Live Playwright: 6 passed, 3 intentionally skipped (authenticated admin without credentials and isolated-only order mutations).

Deployment: `dpl_6x7VyDCPSkxivzgZBno8FHcVCUNf`, application revision `26e29a1`, unique URL https://ecommerce-mvp-prototype-6pij5s22n-azadbasis-4964s-projects.vercel.app. Previous rollback target: https://ecommerce-mvp-prototype-nn7hdp8eh-azadbasis-4964s-projects.vercel.app. Production environment explicitly sets site URL to kenasathi.com, disables online payments and disables demo catalog. Credentials/backups were excluded from upload. `node scripts/verify-live-release.mjs https://kenasathi.com` repeats the non-mutating release checks.

Source PR #1 merged into main with explicit owner approval (`0424997`). [GitHub cloud CI](https://github.com/azharulislamtech/ecommerce-mvp-prototype/actions/runs/36997183643) completed successfully. The merged source includes the live verifier and release evidence added after deploying the application code.

## Local recovery utilities

`scripts/backup-production.ps1` reads ignored Flyway credentials without printing them, creates a full custom-format DB archive plus product-image backup, and encrypts it using Windows DPAPI CurrentUser. `scripts/verify-postgres-release.ps1` restores the public schema/data into a separate loopback/password-protected PostgreSQL 18 cluster, applies pending Flyway migrations and verifies independent-session retry and cancellation behavior. `scripts/read-production-health.ps1 -VerifyTransactions` runs real Supabase RLS/checkout/settlement checks with a complete rollback. `scripts/cleanup-backup-plaintext.ps1` compares the encrypted database hash before removing temporary plaintext copies/stopped scratch clusters.

These utilities require the installed PostgreSQL 18 and Flyway tools on Windows. The retained `.protected` archive requires this same Windows account; copy it only to an approved encrypted off-site destination and arrange independently recoverable keys/retention before relying on it for host-loss recovery. No off-site upload or complete Auth/Storage cloud restore has been claimed. To repeat the restore drill after plaintext cleanup, create a fresh backup first.

## Release order

1. Use Node.js 22. Run `npm ci`, `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run test:db`, `npm run test:e2e:production`, `npm run build`, and `npm audit --audit-level=high`.
2. For a future release, restore a recent backup into isolated staging and verify Flyway history before applying new pending migrations. This release tested the restored public schema/data on local PostgreSQL through V10. Never edit previously applied migrations/checksums.
3. Check old cancelled orders and payment discrepancies using the read-only SQL below. New stock handling deliberately does not adjust historical physical inventory automatically.
4. Verify authenticated admin login, product create/edit/image upload/deactivate, a real staging COD order, repeat submission, cancellation, reopening, and review moderation. The local browser fixture is not a substitute for Supabase Auth/Storage integration testing.
5. Database/image backup and V8-V10 migrations are completed for this release. Verify Flyway state before deploying. For future changes, back up and apply all new pending migrations first. Seven-argument checkout calls from the previous deployment remain accepted; full idempotency needs the new frontend.
6. Deploy this tested revision. Required secrets remain in the deployment secret store. Set `NEXT_PUBLIC_SITE_URL=https://kenasathi.com`. Never enable `ALLOW_DEMO_CATALOG` in production. Keep `ENABLE_ONLINE_PAYMENTS=false` until gateway certification below.
7. Confirm `/api/health` returns 200, public/product/category pages return 200, missing products return 404, admin redirects when signed out, private pages send `X-Robots-Tag`, and the sitemap has canonical production URLs. Test one controlled COD order through fulfilment with an agreed stock/accounting cleanup.
8. Record deployment ID, Git revision, applied Flyway versions, evidence, and rollback target in the engineering log. V8-V10 are remotely verified; do not claim application deployment without provider/live evidence.

## Inventory and accounting reconciliation

V9 marks pre-existing cancelled orders with `stock_released = NULL` because a person might already have restored their inventory manually. Cancelling a shipped/delivered order also marks inventory uncertain and does not restock goods that may still be with the courier/customer. These orders cannot be reopened until a supervised reconciliation determines the actual stock state. Repeated status saves do not change inventory. New cancellations before dispatch return stock once; reopening reserves it again or rolls back completely.

```sql
select order_number, created_at from orders
where order_status = 'cancelled' and stock_released is null;

select o.order_number, o.payment_status as order_payment_status, p.payment_status
from orders o join payments p on p.order_id = o.id
where o.payment_status is distinct from p.payment_status;
```

Use physical stock counts and settlement records as the source of truth. Do not run a blanket stock increment for old cancelled orders. The order-details panel has a receipt confirmation form: choose either received/sellable goods to restore stock once or already-restocked goods to confirm the current count without incrementing it. Historical/dispatched cancelled orders can be reopened after this explicit confirmation. Repeated confirmation is idempotent and audited. Damaged, missing or partial returns must stay closed and be handled through manual physical-stock reconciliation; do not confirm all items as sellable. Changing a payment to `refunded` records an already-completed manual refund; it does not transfer money.

## Monitoring and analytics

- `/api/health` checks database connectivity and the V9 column with a 3-second database timeout. It returns only `ok`/`unavailable`, no customer records or configuration details.
- Connect an external uptime monitor to that endpoint and alert after sustained failures. Configure deployment-provider 5xx/error alerts and log retention. These account-side monitors are not activated by committing this code.
- `src/instrumentation.ts` emits structured `request_error` events with route templates and error digests, excluding headers, query strings, customer fields, and gateway payloads. Checkout rejection logs contain error codes only. The framework/provider may have its own log policy; review retention and access there too.
- Optional Vercel Web Analytics is gated by `NEXT_PUBLIC_ENABLE_ANALYTICS=true` after enabling it in the project dashboard. Query strings/fragments and cart/checkout/tracking/payment/admin/API pages are excluded. No claim of working dashboard data is made until an actual event is observed.
- Database orders remain the source of truth for sales and COD collections. This integration measures public-page traffic, not a paid-sales conversion funnel.

## Backups and restore drill

Set recovery objectives appropriate to the business (for example, no more than a day's order loss and recovery within several hours); select and verify a backup/PITR plan that meets those objectives. Confirm actual retention in the Supabase dashboard. Keep encrypted off-site backups with limited access and a recorded owner.

Database backups do **not** include the actual files in Supabase Storage. Back up `product-images` separately, alongside the database metadata. Follow the official [database backup guide](https://supabase.com/docs/guides/platform/backups) and [backup/restore workflow](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Restore into a new isolated project first; disable outbound Telegram notifications and online payments there. Verify row counts, order/payment totals, admin login, image retrieval, and one staging checkout/cancellation. Record backup timestamp, recovery duration, missing data, and screenshots/logs. A database test suite or a downloaded file alone does not prove production recovery works.

## Rollback

Keep the previous known-good deployment available in Vercel. Roll back the application if smoke checks fail; do not drop V9 or delete orders to roll back. V9 accepts the old checkout signature and its inventory trigger also protects old admin status writes. The old app's payment synchronization/idempotency gaps return on rollback, so reconcile and fix forward promptly. Database recovery from backup can lose newer orders and requires a separate incident decision.

## Online payment gate

Keep online payments off until sandbox success/failure/cancellation/IPN, duplicate and out-of-order callbacks, amount/currency/transaction mismatches, and risky responses are verified against SSLCommerz itself. The new trusted RPC atomically commits verified payment/order status and prevents paid/refunded downgrade. It does not implement automatic refunds.

Failed or cancelled gateway sessions continue to hold inventory until an admin cancels the order. A late verified payment for a cancelled order must be reviewed before fulfilment or refund; do not automatically ship released inventory. Automatic timed reservation expiry needs a separate gateway reconciliation policy before online launch.

## SEO and merchandising release gate

- Replace placeholder product descriptions with owner-confirmed model/specification/warranty information and original images. Never invent certifications or warranty terms. The admin form highlights incomplete existing listings.
- Confirm support contacts, return address, delivery commitments, and Facebook URL. Existing policy terms must reflect actual business operations.
- Submit `/sitemap.xml` in Search Console, inspect representative URLs, and validate Product/Breadcrumb structured data in Google's Rich Results Test. Verify mobile Core Web Vitals using real traffic; local browser layout tests are not field performance measurements.

## Test boundaries

`test:db` uses in-memory PGlite PostgreSQL and real migrations with platform Auth/Storage schemas stubbed. PGlite lacks pgcrypto, so its token-byte function is test-only; these tests do not certify token entropy or multi-session PostgreSQL lock contention. Duplicate queued calls, rollback, stock limits, permissions and settlement invariants are tested. Both isolated browser runners drive real Next server actions through a loopback PostgREST/Auth fixture backed by that database, including simulated admin login and stock-return confirmation. The production runner builds and starts Next in production mode. No production customer records are used. Real Supabase Auth/Storage and live gateway tests remain separate staging gates.
