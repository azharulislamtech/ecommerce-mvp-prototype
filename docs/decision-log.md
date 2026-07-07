# Decision Log

Use this file for architectural, security, database, and product decisions. Keep entries short but explicit.

## 2026-07-07: Migrate To New Supabase API Keys During Rotation

Decision: When rotating the exposed service role key, migrate from the legacy JWT key model to the new Supabase API keys system — a revocable **secret key** for `SUPABASE_SERVICE_ROLE_KEY` and the **publishable key** for the client — then disable the legacy `service_role`/`anon` JWTs.

Reason: New secret keys are individually revocable without breaking the publishable key, which is a stronger long-term security posture than legacy all-or-nothing JWT keys. The exposed legacy key had to be revoked to actually close the exposure.

Consequence: `SUPABASE_SERVICE_ROLE_KEY` is now an `sb_secret_...` key (updated in `.env.local` and Vercel Production); the client uses an `sb_publishable_...` anon key; legacy JWT keys are disabled and the old exposed key is dead. Future rotations should reuse the new-secret-key path in `docs/secret-rotation.md`.

## 2026-07-07: Keep Production Checkout COD-Only By Default

Decision: Customer checkout uses Cash on Delivery by default. Online payment remains behind the server-side `ENABLE_ONLINE_PAYMENTS=true` flag, while delivery charge is calculated from a canonical Bangladesh district list: Dhaka is BDT 60 and all other districts are BDT 120.

Reason: SSLCommerz sandbox callback verification is intentionally deferred until customer demand. Keeping online payment disabled avoids unverified gateway release risk and avoids the failed/cancelled-online-payment stock-release question for the current production path.

Consequence: Checkout UI hides SSLCommerz unless the flag is enabled, server actions reject SSLCommerz while disabled, and the database RPC still validates district and calculates delivery charge server-side so totals cannot be changed from the browser.

## 2026-07-04: Use SSLCommerz Through A Provider-Neutral Payment Layer

Decision: Use SSLCommerz as the first payment provider through `src/lib/payments/payment-service.ts`, with provider-specific logic isolated in `src/lib/payments/sslcommerz.ts`.

Reason: Kena Sathi targets Bangladesh commerce first, SSLCommerz offers a hosted checkout flow, and a facade keeps the code ready for bKash/Nagad or a future Spring Boot backend adapter.

Consequence: Checkout submits `sslcommerz` as a payment method, server-side code creates the hosted session, and future providers should implement the same initiation/callback boundary instead of touching checkout UI directly.

## 2026-07-04: Validate Gateway Status Before Marking Payments Paid

Decision: SSLCommerz callbacks and IPN events never mark a payment `paid` directly; the server calls SSLCommerz validation/transaction lookup and verifies local `tran_id`, BDT amount, currency, and risk level first.

Reason: Browser redirects can be forged, and payment status is financial state. The app must trust only server-side provider verification, not client-returned status text.

Consequence: Every gateway event is logged in `payment_events`; risky/pending validations stay pending for admin review; an already-paid payment is not downgraded by later failed/cancelled callbacks.

## 2026-07-04: Keep Default E2E Smoke Tests Non-Destructive

Decision: Playwright E2E tests run non-destructive smoke coverage by default and do not submit checkout orders against the shared Supabase project.

Reason: Checkout order creation mutates orders, payments, and stock. Default local/CI smoke tests should be safe to run repeatedly without changing production-like data.

Consequence: Authenticated admin checks are optional through environment variables, and any future order-creation E2E test must be opt-in against a disposable test database or seeded test account.

## 2026-07-04: Verify Public Order Tracking With Phone

Decision: Public `/track-order` uses a server-only Supabase service-role lookup but returns order details only after the order number and normalized checkout phone number match.

Reason: Orders are protected by RLS from anonymous reads, but customers still need accountless tracking. The server can safely perform the lookup if it only reveals the matching customer's order state.

Consequence: Tracking pages must not expose order data from order number alone. Future tracking features should keep phone/OTP-style verification or move to signed customer links.

## 2026-07-04: Use PostgreSQL RPC For Atomic Checkout

Decision: Checkout order creation uses the versioned `create_checkout_order` PostgreSQL RPC, called only from the server with the Supabase service role key.

Reason: Cart totals, product price, stock, order rows, order items, pending payment rows, and stock decrement must be validated and changed in one trusted database transaction.

Consequence: The browser stores only product IDs and quantities. Public users still cannot write orders/payments through anon RLS, and payment gateway capture remains a separate Phase 6 concern.

## 2026-07-03: Use Admin Session RLS For Product CRUD

Decision: Admin product create, update, image upload, status change, and delete actions use the signed-in Supabase Auth session plus database RLS, not the service role key.

Reason: Product management is an admin workflow and should be authorized by the same `admin_users` policy path that protects the admin panel.

Consequence: Authorized CRUD testing requires a real Supabase Auth user with a matching active `admin_users` row. The service role key remains server-only and is not needed for product CRUD.

## 2026-07-03: Prefer Safe Product Deactivation Over Risky Hard Delete

Decision: Product delete hard-deletes only products without order history; products referenced by `order_items` are deactivated instead.

Reason: Historical orders must remain auditable even when a catalog item is no longer sold.

Consequence: Admin UI exposes delete, but the server action preserves order history by falling back to `is_active = false` when needed.

## 2026-07-02: Use Flyway For Database Schema

Decision: Use Flyway-compatible SQL migrations in `db/migration/` for Supabase PostgreSQL.

Reason: The future backend target is Spring Boot/Kotlin, and Flyway keeps schema changes portable and version-controlled.

Consequence: No manual table changes in Supabase Dashboard unless later captured in a migration.

## 2026-07-02: Split Core PostgreSQL And Supabase-Specific Migrations

Decision: Keep portable schema in `V1__init_ecommerce_core_schema.sql` and Supabase RLS/storage policies in `V2__supabase_rls_policies.sql`.

Reason: This reduces migration friction when moving to Spring Boot with self-hosted PostgreSQL later.

Consequence: Future non-Supabase backend work can reuse V1 more easily than V2.

## 2026-07-02: Use Session Pooler For Flyway

Decision: Use `aws-1-ap-southeast-1.pooler.supabase.com` with user `postgres.qguqohukemijphzwqxgs` for Flyway.

Reason: Direct DB host resolved to IPv6 and failed locally. Session Pooler connected successfully.

Consequence: `flyway.conf.example` documents pooler fallback; local `flyway.conf` is ignored by Git.

## 2026-07-02: Do Not Allow Public Order Or Payment Writes Through RLS

Decision: Public users cannot directly write orders/payments through anon Supabase client.

Reason: Amounts, order status, and payment status must be trusted server-side state.

Consequence: Checkout must use server-side logic, likely service role on the server only.

## 2026-07-02: Keep Documentation As A Required Change Artifact

Decision: Every meaningful code/config/database change must update `docs/engineering-log.md`; architecture/security decisions update this file.

Reason: Future AI tools need durable context to avoid breaking existing assumptions.

Consequence: A change is not considered complete if docs are stale.

## 2026-07-02: Version Baseline MVP Catalog As Flyway Migration

Decision: Add `V3__seed_mvp_catalog.sql` for baseline MVP catalog data.

Reason: Public pages now read from Supabase, and a clean project needs reproducible starter catalog data.

Consequence: Day-to-day product changes should move to admin product management once Phase 4 exists; do not keep editing old seed migrations after production data exists.

## 2026-07-02: Use Storefront Catalog Adapter

Decision: Add `src/lib/catalog.ts` to map Supabase rows into the existing UI `Product` and category shapes.

Reason: This keeps UI components stable while the backend data source changes from mock data to Supabase.

Consequence: Public pages can move to Supabase without a broad UI rewrite. The adapter owns temporary defaults such as visual type, rating, and specs until those fields become real database fields.

## 2026-07-02: Protect Admin Routes In Server Layout

Decision: Protect `/admin` panel routes in `src/app/admin/(panel)/layout.tsx` with `requireAdmin()` instead of relying only on client-side checks.

Reason: Server-side redirects prevent unauthorized admin HTML from being rendered and keep the route protection easy to audit.

Consequence: Admin pages are dynamic and require a valid Supabase Auth session plus an `admin_users` authorization row.

## 2026-07-02: Use Supabase SSR Cookies For Admin Sessions

Decision: Use `@supabase/ssr` for cookie-based admin auth in Next.js App Router.

Reason: Supabase Auth session refresh and server actions need framework-aware cookie handling.

Consequence: `src/middleware.ts` refreshes sessions, while server actions handle login/logout.

## 2026-07-02: Narrow Middleware Supabase SSR Import

Decision: Import `createServerClient` from the server-client module path in middleware instead of the package index.

Reason: Importing the package index pulled browser-client code into the Edge middleware bundle and caused a Next.js Edge Runtime warning during production build.

Consequence: The middleware bundle avoids that warning. Re-check this import path when upgrading `@supabase/ssr`.
