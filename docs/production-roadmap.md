# Production Hardening Roadmap

This roadmap keeps the project production-grade step by step. Do not skip gates unless the decision is recorded in `docs/decision-log.md`.

## Phase 0: Documentation And Secret Hygiene

Goal: make the project safe for future AI/engineer handoff.

Tasks:

- Maintain `AI_HANDOFF.md` as the top-level context file.
- Keep `docs/engineering-log.md` updated after every meaningful change.
- Keep `docs/decision-log.md` updated for architecture/security decisions.
- Remove secrets from docs and source files.
- Rotate any exposed Supabase service role key before production use. Done: rotated on 2026-07-07 (migrated to a new Supabase secret key; legacy `service_role` JWT disabled).

Exit gate:

- No secrets in Markdown or source files.
- `.env.local` and `flyway.conf` are ignored by Git.
- Future AI can understand current status from docs alone.

Status: in progress. Secret key rotation completed on 2026-07-07 (old exposed key confirmed dead via legacy-key disable); remaining Phase 0 doc hygiene continues.

## Phase 1: Database Foundation

Goal: keep database schema stable, versioned, and future Spring Boot friendly.

Completed:

- Core schema migration created.
- Supabase RLS/policy migration created.
- Flyway applied migrations through Session Pooler.
- Baseline MVP catalog seed is versioned as `V3__seed_mvp_catalog.sql`.
- Remote schema version is `10` (authorized rollout 2026-10-02). V8-V10 applied after encrypted backup and PostgreSQL restore verification; local tests apply V1-V10.

Deferred:

- Generate Supabase TypeScript types from the live database when the CLI workflow is ready.
- Add a reusable DB verification script if manual probes become repetitive.

Exit gate:

- Migrations are reproducible from a clean Supabase project.
- Seed strategy is documented.
- No table is created manually without a migration.

Status: completed for current MVP foundation.

## Phase 2: Public Catalog From Supabase

Goal: replace mock catalog reads with Supabase-backed server reads.

Completed:

- Added `src/lib/catalog.ts` as an adapter from Supabase rows to existing UI product/category shapes.
- Migrated home page featured categories/products to Supabase.
- Migrated product listing to Supabase-backed filters/sort/search.
- Migrated product details and related products to Supabase-backed reads.
- Added empty states for categories/products.
- Kept mock fallback only for local development when Supabase public env vars are missing.

Exit gate:

- Products shown on public pages come from Supabase when env vars are configured.
- Typecheck and lint pass.
- App still works if no products exist.

Status: completed for public catalog read path. Uploaded Supabase product images now render on storefront cards and product detail pages, with visual placeholders only as fallback.

## Phase 3: Admin Authentication And Route Protection

Goal: make `/admin` private.

Completed:

- Implemented Supabase Auth login action.
- Implemented logout action.
- Added SSR cookie session client and middleware refresh.
- Protected admin layout with server-side `requireAdmin()` guard.
- Read admin authorization through the `is_admin()` database RPC.
- Added clear login messages for unauthorized/required auth states.

Completed follow-up:

- Created the first Supabase Auth admin user and matched it to an active `admin_users` row.
- Verified authorized login through the authenticated Playwright E2E smoke test (sign-in lands on `/admin` and renders admin-only surfaces).

Exit gate:

- Non-admin users cannot access dashboard pages.
- Admin session survives refresh.
- Service role key is never exposed to client components.

Status: implemented and verified. Authorized admin login and admin read surfaces confirmed through automated E2E on 2026-07-04.

## Phase 4: Admin Product Management

Goal: make product CRUD real.

Completed:

- Added Supabase-backed admin product reads, including inactive products.
- Added product create and edit server actions with server-side validation.
- Added image upload to Supabase Storage and `product_images` row creation.
- Added image row/file removal from the edit page.
- Added active/inactive status management.
- Added safe delete behavior: products with order history are deactivated instead of hard deleted.
- Added admin list search/status filters and success/error messages.
- Wired uploaded product images into storefront cards, product detail hero, and product detail thumbnail gallery.

Remaining:

- Add pagination if product count grows beyond MVP scale.
- Add admin category CRUD if catalog operations need category changes from the panel.

Exit gate:

- Admin can create, edit, disable, and upload product images.
- Public pages show only active products.
- Authorized runtime CRUD smoke test passes with a real admin account.

Status: implemented and manually verified by the user for create, edit, save draft, image upload/removal, deactivate/restore, delete/safe deactivate, and public active/inactive behavior.

## Phase 5: Cart And Checkout

Goal: create real orders safely.

Completed:

- Implemented localStorage-backed cart state with quantity update/remove/clear behavior.
- Wired product cards and product details into real add-to-cart and buy-now behavior.
- Added trusted checkout server action that does not trust client price, totals, delivery charge, or district spelling.
- Added `V4__create_checkout_order_rpc.sql` to create orders, order_items, pending payments, and decrement stock in one database transaction.
- Replaced placeholder payment success data with real order summary by order number.
- Replaced admin order list/details mock data with Supabase-backed reads and basic status update action.
- Added customer-facing track-order lookup that verifies order number plus phone and shows live admin-updated status.
- Replaced admin dashboard mock stats with Supabase-backed order/product counts, paid revenue, recent orders, and low-stock products.
- Added Playwright E2E smoke testing foundation for non-destructive cart/checkout, tracking, admin guard, and optional authenticated admin checks.

Remaining:

- Run real Supabase staging integration checks before release; isolated disposable checkout/stock/admin regression coverage is implemented.

Exit gate:

- Checkout creates real pending orders.
- Dhaka delivery is BDT 60 and all other Bangladesh districts are BDT 120, calculated in the trusted checkout RPC.
- Customer cannot tamper with amount/order status from client.
- Admin can see real orders and update order/payment status.
- Customer track-order reflects the latest order status after order number plus phone verification.

Status: implemented for real COD order creation, customer order tracking, Supabase-backed admin dashboard overview, non-destructive E2E smoke coverage, and district-based delivery charge calculation. SSLCommerz payment handoff remains implemented but disabled by default until gateway verification/customer demand.

## Phase 6: Payment Integration

Goal: make the gateway flow secure and auditable.

Completed:

- Picked SSLCommerz as the first Bangladesh-focused hosted checkout provider.
- Added a provider-neutral payment service boundary in `src/lib/payments/payment-service.ts`.
- Added SSLCommerz session initiation in `src/lib/payments/sslcommerz.ts`.
- Added customer success/fail/cancel callback routes and IPN route under `src/app/api/payments/sslcommerz/`.
- Added server-side validation/transaction lookup before payment status changes.
- Logged gateway initiation, callbacks, validation responses, pending/risky states, and status changes in `payment_events`.
- Updated checkout UI to expose Cash on Delivery by default; SSLCommerz is feature-gated behind `ENABLE_ONLINE_PAYMENTS=true`.
- Added failed/cancelled payment UX with gateway reason/status display.
- Added `V5__sslcommerz_payment_method.sql` and `V6__district_delivery_charge.sql`; Flyway applied schema version `6`.
- Added `docs/payment-integration.md` as the runbook for future gateway work.

Remaining:

- Add real SSLCommerz sandbox credentials to local/deployment secrets before enabling online checkout.
- Test one end-to-end SSLCommerz sandbox payment with a public HTTPS callback URL.
- Confirm sandbox payment events update `orders`, `payments`, and `payment_events` as expected.
- Before enabling online checkout, decide whether failed/cancelled online payments should auto-release reserved stock.
- Add opt-in gateway integration tests with sandbox credentials only.

Exit gate:

- Only trusted server validation updates payment status.
- Failed/cancelled payments are handled clearly.
- One sandbox payment is verified end-to-end with callback/IPN evidence.

Status: SSLCommerz is implemented in code but intentionally disabled by default. COD checkout is the active production path; online checkout still requires sandbox credentials, public callback verification, and `ENABLE_ONLINE_PAYMENTS=true` before use.

## Phase 7: Production Readiness

Goal: make deployment, monitoring, and operations safe.

Tasks:

- Completed locally: Next 16/React 19 migration, compatible dependency updates, idempotent checkout/stock/payment integrity, category SEO/structured data, health/error instrumentation, optional privacy-filtered analytics, isolated database/unit/browser tests and CI.
- Completed documentation: staging/deployment sequence, inventory reconciliation, Supabase database and Storage backup/restore, monitoring and rollback in `production-release.md`.
- Remaining operational gates: real Supabase staging CRUD/Auth/Storage checks, backup restore drill, V8-V10 applied; finish app deployment, configure monitoring, verify live smoke checks and owner-confirmed catalog/policy content.
- Online gateway callback/IPN certification remains a separate Phase 6 gate; online checkout stays disabled.

Status: implementation, V8-V10 migration and Vercel production deployment completed with encrypted backup, restored-data PostgreSQL tests, cloud build and live release/browser checks. Account-side off-site recovery/alerts, real admin login/Storage upload and owner-confirmed merchandising facts remain operational gates. Online gateway certification is still deferred.

Exit gate:

- Build, lint, typecheck, and smoke tests pass.
- Security risks are documented and accepted or fixed.
