# Engineering Log

Append meaningful changes here. Keep newest entries at the top.

## 2026-07-05: Kena Sathi Site Branding And Copy

Changed:

- Added a reusable Kena Sathi `KS` logo mark and wordmark for storefront, footer, admin shell, and admin login.
- Updated homepage, metadata, footer, support, payment, and gateway-facing copy from ShopPilot/prototype language to Kena Sathi customer-facing language.
- Updated README, compact handoff, and the SSLCommerz decision note to use Kena Sathi naming.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- Full networked `npm run build` and Vercel deploy were not completed because the required external-network approval hit the current usage limit.

Notes:

- Existing `SP-` order numbers and mock historical order IDs were left unchanged because they are part of the current order/tracking data shape.

## 2026-07-05: Product Detail Image Gallery Navigation

Changed:

- Replaced the static product detail image strip with a client-side product gallery.
- Added thumbnail click support and previous/next image controls for products with multiple uploaded images.
- Kept single-image and no-image products on the existing primary visual/placeholder path.

Verification:

- `npm run typecheck` passed.
- `npm run build` passed.
- Local Playwright smoke check on `/products/pure-glow-serum` confirmed 2 thumbnails, next/previous controls, main image changes on next click, and thumbnail click restores the first image.

Notes:

- Gallery thumbnails now only represent images from the current product, not related product visuals.

## 2026-07-04: Service Role Key Rotation Tooling And Runbook

Changed:

- Added `docs/secret-rotation.md`, a best-practice runbook for rotating the exposed Supabase service role key (and future secrets), including where the key lives, dashboard rotation, updating every stored copy, and confirming the old key is dead.
- Added `scripts/check-service-key.mjs`, a dependency-free probe that verifies whether the currently configured `SUPABASE_SERVICE_ROLE_KEY` is a live service_role key. It never prints the key.
- Added the `verify:service-key` npm script (`node --env-file=.env.local scripts/check-service-key.mjs`).
- Pointed README and AI_HANDOFF at the rotation runbook.

Verification:

- Confirmed no service role key is present in tracked files or Git history; `.env.local` and `flyway.conf` are git-ignored.
- `npm run verify:service-key` returned `OK` against the currently configured key, proving the probe works.
- Audited `src/lib/supabase/server.ts`: the service role key is read only from env and guarded by `import "server-only"`, so it cannot reach the client bundle.

Notes:

- The actual key regeneration is a Supabase Dashboard action and is still pending. Follow `docs/secret-rotation.md` steps 2-6 to complete it, then flip the outstanding "rotation still required" warnings to "rotated, old key confirmed dead".
- Rotation is not complete until step 5 confirms the OLD key returns HTTP 401.

## 2026-07-04: Phase 6 SSLCommerz Payment Integration

Changed:

- Added a provider-neutral payment service facade and an SSLCommerz hosted-checkout adapter.
- Added server-side SSLCommerz session initiation after checkout order creation.
- Added SSLCommerz success, fail, cancel, and IPN route handlers.
- Added server-side SSLCommerz validation before updating `orders.payment_status` or `payments.payment_status`.
- Logged gateway initiation, callbacks, validation responses, and status changes in `payment_events`.
- Added Flyway migration `V5__sslcommerz_payment_method.sql` and applied it; schema is now version `5`.
- Updated checkout UI, payment success/failure UX, `.env.example`, handoff docs, roadmap, decision log, Supabase setup, README, and added `docs/payment-integration.md`.

Verification:

- Reviewed official SSLCommerz docs for hosted checkout session creation, validation API, transaction query API, and IPN/callback behavior.
- `flyway -configFiles=".\flyway.conf" migrate` applied version `5` successfully.
- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- Sandboxed `npm run test:e2e` hit Windows `EPERM` unlinking `test-results/.last-run.json`; rerunning outside the sandbox passed the non-destructive suite with 3 passed and 1 skipped because admin E2E credentials were not set in that process.

Notes:

- Real SSLCommerz sandbox transaction verification still requires sandbox credentials and a public HTTPS callback URL.
- Payment status is marked `paid` only when SSLCommerz validation matches local order number, amount, and BDT currency and is not risky.
- Failed/cancelled online payments do not currently auto-restore stock; stock is still decremented when the checkout order is created.
- Service role key rotation is still required before production.

## 2026-07-04: Compact New-Session Handoff

Changed:

- Added `COMPACT_HANDOFF.md` as the shortest safe resume file for future AI/chat sessions.
- Linked the compact handoff from `README.md` and `AI_HANDOFF.md`.
- Updated roadmap and handoff status to reflect the user's manual confirmation of admin product CRUD, public active/inactive behavior, and storefront order-status tracking.

Verification:

- `git diff --check` passed with CRLF warnings only.

Notes:

- The full context still lives in `AI_HANDOFF.md`, roadmap, engineering log, decision log, Supabase setup, and E2E guide.

## 2026-07-04: First Admin User Verified Through Authenticated E2E

Changed:

- First Supabase Auth admin user was created and matched to an active `admin_users` row, closing the long-standing "pending first admin user setup" gap.
- Fixed a stale assertion in `tests/e2e/admin-authenticated.spec.ts`: the admin orders heading is `Order Management`, not `Manage Orders`.

Verification:

- `npm run test:e2e` passed 4/4 with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` set.
- The authenticated admin smoke test now signs in through real Supabase Auth, lands on `/admin`, and confirms `Store Overview`, `Recent Orders`, `Low Stock Products`, and the `/admin/orders` `Order Management` surface render for an authorized admin.

Notes:

- This verifies Phase 3 admin auth and the read surfaces of the Supabase-backed dashboard/order list for a real admin session.
- Automated destructive write coverage is still intentionally absent, but the user manually confirmed authorized product CRUD writes and admin order status updates in the browser.
- Service role key rotation is still required before production.

## 2026-07-04: Playwright E2E Smoke Foundation

Changed:

- Installed `@playwright/test` as a dev dependency and added Playwright Chromium setup scripts.
- Added `playwright.config.ts` with a reusable local dev-server configuration and Chromium project.
- Added non-destructive E2E smoke tests for storefront product/cart/checkout reachability, public tracking safe states, and logged-out admin route protection.
- Added optional authenticated admin smoke coverage guarded by `E2E_ADMIN_EMAIL` and `E2E_ADMIN_PASSWORD`.
- Added stable test hooks for product cards, cart buttons, cart count, cart lines, and cart checkout link.
- Added `docs/e2e-testing.md` and updated handoff, roadmap, decision log, README, and `.gitignore` context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npx playwright test --list` found 4 tests across 3 files.
- `npm run test:e2e` passed with 3 tests passing and the authenticated admin smoke test skipped because admin E2E credentials were not set.

Notes:

- The default E2E suite does not submit checkout orders or mutate Supabase data beyond browser localStorage.
- Playwright Chromium browser binaries were installed locally under the user Playwright cache.
- `npm install` reported 5 dependency audit findings; they were not auto-fixed because force fixes can introduce breaking changes.

## 2026-07-04: Supabase-Backed Admin Dashboard

Changed:

- Added `src/lib/supabase/admin-dashboard.ts` as the admin dashboard data helper.
- Replaced mock admin dashboard stats with Supabase-backed order/product counts, paid revenue, recent orders, and low-stock products.
- Linked recent orders and low-stock products to their admin detail/edit screens.
- Added empty states for dashboards with no orders or no low-stock products.
- Removed the unused mock `dashboardStats` constant from `src/lib/data.ts`.
- Updated handoff, roadmap, and README context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- Runtime smoke check: logged-out `/admin` redirects to `/admin/login?reason=auth-required`.

Notes:

- In-app browser was not signed in during verification, so authorized dashboard visual smoke testing still requires an admin session.
- Payment gateway capture/webhook remains Phase 6.

## 2026-07-04: Real Customer Order Tracking

Changed:

- Replaced hardcoded `/track-order` mock data with a real Supabase-backed order lookup.
- Added server-side tracking helper that verifies order number plus checkout phone before returning order status, payment status, totals, timestamps, and items.
- Added a live customer timeline that reflects admin-updated order statuses including delivered and cancelled states.
- Revalidated `/track-order` and `/payment/success` after admin order status updates.
- Updated handoff, roadmap, and decision docs.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- Runtime smoke check: `/track-order?order=SP-20260704-001001&phone=01717121839` returns 200.
- Runtime smoke check confirmed the tracking page contains `Live Status`, contains `Delivered`, and no longer contains the old mock `SP-1028` order.

Notes:

- Public tracking uses the server-only service role client after matching order number and normalized Bangladesh phone number.
- Payment gateway capture/webhook is still future work.

## 2026-07-04: Dev Server Cache Rebuild For Broken Storefront UI

Changed:

- Diagnosed broken storefront rendering where product pages showed plain HTML and oversized images.
- Found stale/corrupt Next.js generated cache: CSS and client chunks under `/_next/static/` returned 500, and dev logs showed `Cannot find module './819.js'`.
- Stopped the stale local dev server, removed generated `.next` cache after path verification, and restarted `next dev` on port 3000.

Verification:

- `/products` returned 200 after restart.
- `/_next/static/css/app/layout.css` returned 200 and included `.product-visual` and `.container-page` styles.
- In-app browser render check confirmed styled product cards, fixed product visual sizing, header rendering, and 7 product cards.

Notes:

- No source code or database change was required; this was a local generated-cache/dev-server issue.
- If this symptom returns, restart dev server and rebuild `.next` before changing UI code.

## 2026-07-04: Phase 5 Real Cart And Checkout Order Creation

Changed:

- Added Flyway migration `V4__create_checkout_order_rpc.sql` and applied it to Supabase; schema is now version 4.
- Added atomic PostgreSQL checkout RPC for order creation, order_items, pending payments, and stock decrement.
- Replaced fake cart behavior with localStorage-backed cart provider, header count, quantity update, remove, add-to-cart, and buy-now behavior.
- Replaced checkout prototype with a client cart summary plus trusted server action that submits only product IDs and quantities.
- Replaced fake payment success data with real order summary lookup and cart clearing after success.
- Replaced admin order list/details mock data with Supabase-backed reads and basic admin status update action.
- Updated handoff, roadmap, Supabase setup, and decision docs.

Verification:

- `flyway migrate` applied schema version `4` successfully.
- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npm run build` passed.
- Runtime smoke check: `/cart` returns 200.
- Runtime smoke check: `/checkout` returns 200 and contains `Complete Your Order`.
- Runtime smoke check: `/payment/success` returns 200 and contains the success state.
- Runtime smoke check: logged-out `/admin/orders` redirects to `/admin/login?reason=auth-required`.

Notes:

- Payment gateway capture/webhook is not implemented yet; checkout creates pending orders and pending payments.
- Customer track-order is now implemented through order-number plus phone verification.

## 2026-07-04: Storefront Uploaded Product Image Rendering

Changed:

- Extended storefront `Product` data shape with primary image and gallery image metadata.
- Mapped Supabase `product_images` rows into the storefront catalog adapter.
- Updated `ProductVisual` to render uploaded images through `next/image` with placeholder visuals as fallback.
- Wired product cards, product detail hero, and product detail thumbnails to use uploaded images.
- Allowed Supabase Storage image URLs in `next.config.mjs` image remote patterns.
- Updated AI handoff, roadmap, and README context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings.
- `npm run build` passed.
- Runtime smoke check: `/products/tulip-ceiling-fan-36` returns 200 and includes optimized image markup.
- Runtime smoke check: `/products` returns 200 and includes optimized image markup.
- Runtime smoke check: first optimized image endpoint returned 200 with `image/jpeg`.

Notes:

- Supabase Storage bucket must stay public or the image URLs need to move to signed URL handling.

## 2026-07-03: Phase 4 Admin Product CRUD Implementation

Changed:

- Added Supabase-backed admin catalog read helpers for all products/categories.
- Replaced mock admin product list with real Supabase data, search, status filter, and success/error messages.
- Replaced prototype product form with create/edit server actions, server-side validation, draft/active status handling, and featured flag support.
- Added Supabase Storage product image upload and `product_images` row creation.
- Added product image removal from the edit page.
- Added deactivate/restore actions and safe delete behavior; products with order history are deactivated instead of hard deleted.
- Updated Supabase database type shape to include `Relationships` keys expected by Supabase client typings.
- Increased Next server action body limit to 8 MB while keeping per-image validation at 5 MB.
- Updated AI handoff, roadmap, decision log, and README context.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed outside the sandbox after the sandboxed build hung without progress.
- Runtime smoke check: `/products/aurora-wireless-earbuds` returns 200.
- Runtime smoke check: logged-out `/admin/products` redirects to `/admin/login?reason=auth-required`.
- Runtime smoke check: logged-out `/admin/products/new` redirects to `/admin/login?reason=auth-required`.

Notes:

- Authorized admin CRUD browser testing is still pending creation of the first real Supabase Auth admin user and matching active `admin_users` row.
- Service role key rotation is still required before production.

## 2026-07-02: Phase 3 Admin Auth Protection

Changed:

- Installed `@supabase/ssr` for Next.js/Supabase cookie-based auth.
- Added server auth client and `requireAdmin()` guard.
- Added middleware session refresh.
- Replaced prototype admin login redirect with real Supabase Auth login.
- Added admin logout action.
- Protected `/admin` panel routes server-side through the admin layout.
- Updated admin shell to show signed-in admin email and sign-out button.
- Updated handoff, roadmap, decision log, and Supabase setup docs.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed after narrowing the middleware Supabase SSR import.
- Runtime smoke check: `/admin/login` returns 200.
- Runtime smoke check: logged-out `/admin` redirects to `/admin/login?reason=auth-required`.
- Runtime smoke check: public `/products` still returns 200.

Notes:

- Successful authorized admin login still needs a real Supabase Auth user inserted into `admin_users`.
- Service role key rotation is still required before production.

## 2026-07-02: Phase 1 Seed And Phase 2 Public Catalog Supabase Read

Changed:

- Added `db/migration/V3__seed_mvp_catalog.sql` and applied it with Flyway.
- Added `src/lib/catalog.ts` as the storefront catalog adapter.
- Migrated home page categories/featured products to Supabase-backed reads.
- Migrated product listing to Supabase-backed reads with search, category, price, and sort filters.
- Migrated product details and related products to Supabase-backed reads.
- Added empty states for public catalog sections.
- Updated handoff, roadmap, Supabase setup, and decision docs.

Verification:

- `flyway migrate` applied schema version `3` successfully.
- Supabase anon public read probe returned 5 active categories and 6 active products.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed and generated Supabase-backed product detail paths.
- Secret scan found only placeholder password lines, no real Supabase keys in docs/source files.
- `git diff --check` passed.
- Local dev server smoke checks passed for `/`, `/products`, and `/products/aurora-wireless-earbuds`.

Notes:

- Public catalog now uses Supabase when env vars are configured.
- Cart, checkout, admin dashboard/orders/products still contain mock/prototype behavior.

## 2026-07-02: Documentation Backbone And Secret Scrub

Changed:

- Added `AI_HANDOFF.md` as the root handoff/context file for future AI tools.
- Added `docs/production-roadmap.md` with phased production hardening plan.
- Added `docs/decision-log.md` for architecture/security decisions.
- Rewrote `docs/supabase-setup.md` to remove secrets and record safe setup details.
- Documented mandatory workflow: future changes must update this log and relevant decision/context docs.

Verification:

- Secret scan found only placeholder password lines, no real Supabase keys in docs/source files.
- `git diff --check` passed.
- Local dev server smoke checks passed for `/`, `/products`, and `/products/aurora-wireless-earbuds`.
- `npm run typecheck` passed.
- `npm run lint` passed.

Notes:

- Supabase service role key was exposed during earlier setup and should be rotated before production.

## 2026-07-02: Supabase Flyway Migration Applied

Changed:

- Ran Flyway against Supabase using Session Pooler.
- Applied `V1__init_ecommerce_core_schema.sql`.
- Applied `V2__supabase_rls_policies.sql`.
- Updated local `flyway.conf` to use working Session Pooler host.

Verification:

- `flyway info` returned schema version `2` with both migrations in `Success` state.

Notes:

- Direct host `db.qguqohukemijphzwqxgs.supabase.co` failed due IPv6/DNS route.
- Working host: `aws-1-ap-southeast-1.pooler.supabase.com`.

## 2026-07-01: Supabase Foundation Files Added

Changed:

- Added Flyway-compatible database migrations.
- Added optional demo catalog seed SQL.
- Added Supabase TypeScript database types and server-only client helpers.
- Added `@supabase/supabase-js` dependency.
- Added `.env.example` and `flyway.conf.example`.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.

Notes:

- App UI still uses mock catalog/order data in most pages.
