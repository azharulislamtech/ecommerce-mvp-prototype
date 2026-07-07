# AI Handoff

Read this file before making changes. It is the fast-start context for future AI tools and engineers.

## Product Goal

Build a clean, mobile-first single-brand e-commerce MVP where customers can browse products, add items to cart, checkout without account creation, pay through a COD-first flow with gateway-ready code, and where admins can manage products and orders.

## Current App Status

- Framework: Next.js App Router, TypeScript, Tailwind CSS.
- Current UI: storefront and admin prototype pages exist.
- Current data behavior: public catalog pages read active categories/products and uploaded product images from Supabase through `src/lib/catalog.ts`; cart state persists in localStorage; checkout creates real pending Cash on Delivery Supabase orders through the `create_checkout_order` RPC; delivery charge is calculated server-side from the selected Bangladesh district; SSLCommerz online payment code exists but checkout hides/rejects it unless `ENABLE_ONLINE_PAYMENTS=true`; SSLCommerz callbacks/IPN validate server-side before updating payment status; customer track-order reads real Supabase order status after order number plus phone verification; admin product and order management read/write through authenticated RLS; admin dashboard overview reads Supabase-backed counts, paid revenue, recent orders, and low-stock products; Playwright E2E smoke tests cover non-destructive storefront/cart/checkout, tracking, and admin guard flows.
- Supabase foundation: migrations applied successfully to Supabase through Flyway.
- Flyway schema version: `6`.
- Supabase server data layer exists in `src/lib/supabase/`; storefront home/listing/details pages now use it through an adapter.
- Admin auth is implemented with Supabase Auth, SSR cookies, login/logout actions, and server-side `/admin` route protection. The first admin user is set up and authorized login is verified through the authenticated E2E smoke test. Admin product CRUD is implemented and the user manually confirmed create/edit/save draft/deactivate/restore/upload/remove image/delete plus public active/inactive behavior.
- Checkout creates real pending orders, order items, pending payment rows, and decrements stock through a versioned PostgreSQL RPC. Customer order tracking is live and reflects admin order status updates. Phase 6 SSLCommerz hosted checkout is implemented with server-side validation and `payment_events` audit logging, but online checkout is disabled by default pending customer demand, sandbox credentials, and a public callback URL.

## Important Local Files

- Compact handoff: `COMPACT_HANDOFF.md`
- MVP spec: `ecommerce_mvp_wireframe_spec.md`
- Roadmap: `docs/production-roadmap.md`
- Engineering log: `docs/engineering-log.md`
- Decision log: `docs/decision-log.md`
- Supabase setup: `docs/supabase-setup.md`
- E2E testing guide: `docs/e2e-testing.md`
- Payment integration guide: `docs/payment-integration.md`
- Database migrations: `db/migration/`
- Optional seed source/reference: `db/seed/demo_catalog_seed.sql`
- Supabase client/data helpers: `src/lib/supabase/`
- Payment service/adapters: `src/lib/payments/`
- Storefront catalog adapter: `src/lib/catalog.ts`
- Product image rendering component: `src/components/modules/product-visual.tsx`
- Cart provider/client screens: `src/components/cart/`
- Order read helpers: `src/lib/supabase/orders.ts`
- Admin dashboard helper: `src/lib/supabase/admin-dashboard.ts`
- Customer order tracking page: `src/app/(store)/track-order/page.tsx`
- SSLCommerz callback/IPN routes: `src/app/api/payments/sslcommerz/`
- E2E smoke tests: `tests/e2e/` and `playwright.config.ts`

## Environment And Secrets

Do not print, commit, or summarize secrets.

Ignored local secret files:

- `.env.local`
- `flyway.conf`

Resolved: the service role key was exposed during setup and was **rotated on 2026-07-07**. The project migrated to the new Supabase API keys system (new revocable secret key), the legacy `service_role` JWT was disabled in the dashboard, and the new key was updated in `.env.local` and Vercel Production. Verified live with `npm run verify:service-key` and HTTP 200 responses from `https://kenasathi.com`. See `docs/secret-rotation.md` for the runbook if future rotation is needed.

## Database Status

Applied migrations:

- `V1__init_ecommerce_core_schema.sql`: products, categories, images, orders, order items, payments, payment events, indexes, updated_at triggers.
- `V2__supabase_rls_policies.sql`: admin users, `is_admin()`, `is_owner()`, public read policies, admin policies, product image storage bucket/policies.
- `V3__seed_mvp_catalog.sql`: baseline MVP catalog data for reproducible storefront setup.
- `V4__create_checkout_order_rpc.sql`: atomic checkout RPC for orders, order items, payments, and stock decrement.
- `V5__sslcommerz_payment_method.sql`: updates checkout RPC payment method handling for SSLCommerz and stores local transaction ids.
- `V6__district_delivery_charge.sql`: validates the 64 Bangladesh districts and calculates delivery charge in the checkout RPC: Dhaka BDT 60, all other districts BDT 120.

Connection note:

- Direct host `db.qguqohukemijphzwqxgs.supabase.co` resolves to IPv6 and failed locally.
- Working Flyway endpoint: Session Pooler host `aws-1-ap-southeast-1.pooler.supabase.com`.

## Mandatory Workflow For Future Changes

1. Read `COMPACT_HANDOFF.md` for a fast new-session start.
2. Read this file, the roadmap, and the decision log before changing code.
3. Check `git status --short` before editing.
4. Keep changes small and phase-aligned.
5. Do not rewrite unrelated files or revert user changes.
6. Update `docs/engineering-log.md` for every meaningful change.
7. Update `docs/decision-log.md` when an architectural or security decision changes.
8. Run the smallest useful verification command before final response.
9. In final response, mention what changed, what was verified, and what remains risky.


## Payment Integration Files

- Provider facade and method normalization: `src/lib/payments/payment-service.ts`
- SSLCommerz session creation, validation, transaction query, and status update logic: `src/lib/payments/sslcommerz.ts`
- SSLCommerz route payload helpers: `src/lib/payments/sslcommerz-routes.ts`
- Callback/IPN routes: `src/app/api/payments/sslcommerz/success/route.ts`, `fail/route.ts`, `cancel/route.ts`, `ipn/route.ts`
- Checkout UI payment method selector: `src/components/cart/checkout-client.tsx`
- Payment result UX: `src/app/(store)/payment/success/page.tsx`, `src/app/(store)/payment/failed/page.tsx`

Payment status rules: mark `paid` only after SSLCommerz validation returns `VALID` or `VALIDATED`, `tran_id` matches the local order number, amount matches `orders.total_amount`, currency is `BDT`, and `risk_level` is not `1`. Risky or pending responses remain `pending` and are logged. Already-paid payments are not downgraded by later failed/cancelled callbacks.

## Admin Product CRUD Files

- Admin product data reads: `src/lib/supabase/admin-catalog.ts`
- Product create/update/status/delete/image actions: `src/app/actions.ts`
- Product list page: `src/app/admin/(panel)/products/page.tsx`
- Product form: `src/app/admin/(panel)/products/product-form.tsx`
- Product row action confirmations: `src/app/admin/(panel)/products/product-row-actions.tsx`
- Product new/edit routes: `src/app/admin/(panel)/products/new/page.tsx`, `src/app/admin/(panel)/products/[id]/edit/page.tsx`

CRUD behavior: writes use the signed-in admin Supabase Auth session and database RLS, not the service role key. Product delete removes products only when there is no order history; products with `order_items` are deactivated instead. Uploaded product images are stored in Supabase Storage and rendered on public storefront cards/details through Next Image.

## Admin Auth Files

- Server auth client and admin guard: `src/lib/supabase/auth.ts`
- Session refresh middleware helper: `src/lib/supabase/middleware.ts`
- Next middleware entry: `src/middleware.ts`
- Login page: `src/app/admin/login/page.tsx`
- Protected admin layout: `src/app/admin/(panel)/layout.tsx`
- Login/logout actions: `src/app/actions.ts`

## Recommended Next Step

Next safe phase: keep COD as the active checkout path, finish Phase 7 production readiness, and enable SSLCommerz later only after sandbox credentials, a public HTTPS callback URL, and one verified end-to-end payment. Service role key rotation is done (2026-07-07), so it is no longer a production blocker.
