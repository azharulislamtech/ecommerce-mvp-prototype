# Production Hardening Roadmap

This roadmap keeps the project production-grade step by step. Do not skip gates unless the decision is recorded in `docs/decision-log.md`.

## Phase 0: Documentation And Secret Hygiene

Goal: make the project safe for future AI/engineer handoff.

Tasks:

- Maintain `AI_HANDOFF.md` as the top-level context file.
- Keep `docs/engineering-log.md` updated after every meaningful change.
- Keep `docs/decision-log.md` updated for architecture/security decisions.
- Remove secrets from docs and source files.
- Rotate any exposed Supabase service role key before production use.

Exit gate:

- No secrets in Markdown or source files.
- `.env.local` and `flyway.conf` are ignored by Git.
- Future AI can understand current status from docs alone.

Status: in progress. Secret key rotation is still required before production.

## Phase 1: Database Foundation

Goal: keep database schema stable, versioned, and future Spring Boot friendly.

Completed:

- Core schema migration created.
- Supabase RLS/policy migration created.
- Flyway applied migrations through Session Pooler.
- Baseline MVP catalog seed is versioned as `V3__seed_mvp_catalog.sql`.
- Schema version is `5`.

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
- Added trusted checkout server action that does not trust client price or totals.
- Added `V4__create_checkout_order_rpc.sql` to create orders, order_items, pending payments, and decrement stock in one database transaction.
- Replaced placeholder payment success data with real order summary by order number.
- Replaced admin order list/details mock data with Supabase-backed reads and basic status update action.
- Added customer-facing track-order lookup that verifies order number plus phone and shows live admin-updated status.
- Replaced admin dashboard mock stats with Supabase-backed order/product counts, paid revenue, recent orders, and low-stock products.
- Added Playwright E2E smoke testing foundation for non-destructive cart/checkout, tracking, admin guard, and optional authenticated admin checks.

Remaining:

- Add opt-in destructive checkout order creation coverage only against a disposable test database.

Exit gate:

- Checkout creates real pending orders.
- Customer cannot tamper with amount/order status from client.
- Admin can see real orders and update order/payment status.
- Customer track-order reflects the latest order status after order number plus phone verification.

Status: implemented for real order creation, customer order tracking, Supabase-backed admin dashboard overview, non-destructive E2E smoke coverage, and SSLCommerz payment handoff through Phase 6. Real gateway sandbox transaction verification is still pending credentials/public callback URL.

## Phase 6: Payment Integration

Goal: make the gateway flow secure and auditable.

Completed:

- Picked SSLCommerz as the first Bangladesh-focused hosted checkout provider.
- Added a provider-neutral payment service boundary in `src/lib/payments/payment-service.ts`.
- Added SSLCommerz session initiation in `src/lib/payments/sslcommerz.ts`.
- Added customer success/fail/cancel callback routes and IPN route under `src/app/api/payments/sslcommerz/`.
- Added server-side validation/transaction lookup before payment status changes.
- Logged gateway initiation, callbacks, validation responses, pending/risky states, and status changes in `payment_events`.
- Updated checkout UI to offer Cash on Delivery and SSLCommerz Online Payment.
- Added failed/cancelled payment UX with gateway reason/status display.
- Added `V5__sslcommerz_payment_method.sql`; Flyway applied schema version `5`.
- Added `docs/payment-integration.md` as the runbook for future gateway work.

Remaining:

- Add real SSLCommerz sandbox credentials to local/deployment secrets.
- Test one end-to-end SSLCommerz sandbox payment with a public HTTPS callback URL.
- Confirm sandbox payment events update `orders`, `payments`, and `payment_events` as expected.
- Decide whether failed/cancelled online payments should auto-release reserved stock.
- Add opt-in gateway integration tests with sandbox credentials only.

Exit gate:

- Only trusted server validation updates payment status.
- Failed/cancelled payments are handled clearly.
- One sandbox payment is verified end-to-end with callback/IPN evidence.

Status: implemented in code and migrated to schema version `5`; awaiting real SSLCommerz sandbox credential and callback verification before production use.

## Phase 7: Production Readiness

Goal: make deployment, monitoring, and operations safe.

Tasks:

- Upgrade vulnerable dependencies with tested migration path.
- Add error logging and operational checklists.
- Expand E2E coverage for payment gateway callback/webhook once Phase 6 is implemented.
- Add backup/restore notes for Supabase.
- Add deployment checklist for Vercel.

Exit gate:

- Build, lint, typecheck, and smoke tests pass.
- Security risks are documented and accepted or fixed.



