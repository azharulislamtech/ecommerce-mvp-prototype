# Compact Handoff

Use this file to continue the project in a new AI/chat session without rereading the whole history.

## User Preference

- Always explain to the user in Bangla.
- Keep implementation production-grade and phase-by-phase.
- Update Markdown context files after meaningful changes so future AI tools can resume safely.

## Project

- Name: Kena Sathi e-commerce site.
- Path: `D:\WebApplication\Ecommerce application`
- Stack: Next.js App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL, Supabase Storage, Supabase Auth, Flyway.
- Future backend target: Spring Boot + Kotlin.

## Current Status

- Database foundation is complete through Flyway schema version `6`.
- Public catalog reads active categories/products from Supabase.
- Uploaded Supabase Storage product images render on storefront product cards and product detail pages.
- Admin auth is implemented with Supabase Auth, SSR cookies, route protection, and `admin_users` authorization.
- Admin product CRUD is implemented and user manually confirmed: add, edit, save draft, deactivate/restore, upload/remove image, delete/safe deactivate, and public active/inactive behavior.
- Cart is localStorage-backed with quantity update/remove/clear and header count.
- Checkout creates real pending Cash on Delivery Supabase orders through the `create_checkout_order` PostgreSQL RPC; client price/totals/delivery charge are not trusted.
- Cash on Delivery redirects to local order success; delivery charge is Dhaka BDT 60 and all other Bangladesh districts BDT 120.
- SSLCommerz hosted checkout is implemented but disabled by default; checkout hides/rejects it unless `ENABLE_ONLINE_PAYMENTS=true`.
- Admin orders list/details use Supabase data and admin can update order/payment status.
- Public track-order uses order number plus phone verification and user manually confirmed admin status updates reflect on storefront.
- Admin dashboard uses Supabase-backed counts, paid revenue, recent orders, and low-stock products.
- Playwright E2E smoke foundation exists and default suite is non-destructive.

## Important Files

- Full handoff: `AI_HANDOFF.md`
- Roadmap: `docs/production-roadmap.md`
- Engineering log: `docs/engineering-log.md`
- Decision log: `docs/decision-log.md`
- Supabase setup: `docs/supabase-setup.md`
- E2E guide: `docs/e2e-testing.md`
- Payment guide: `docs/payment-integration.md`
- Migrations: `db/migration/`
- Server actions: `src/app/actions.ts`
- Supabase helpers: `src/lib/supabase/`
- Payment service/adapters: `src/lib/payments/`
- Storefront catalog adapter: `src/lib/catalog.ts`
- Cart components: `src/components/cart/`
- Admin product screens: `src/app/admin/(panel)/products/`
- Admin order screens: `src/app/admin/(panel)/orders/`
- Track order page: `src/app/(store)/track-order/page.tsx`
- SSLCommerz callback/IPN routes: `src/app/api/payments/sslcommerz/`
- E2E tests: `tests/e2e/`, `playwright.config.ts`

## Local Secrets And Safety

- Never print or commit `.env.local` or `flyway.conf`.
- Supabase service role key was exposed earlier; rotated on 2026-07-07 (new secret key; legacy `service_role` JWT disabled).
- Do not put admin email/password, SSLCommerz credentials, or service keys in Markdown.
- Product/order writes should use authenticated admin Supabase session and RLS.
- Online payment status must only be changed by trusted server-side gateway validation, admin action, or future webhook logic.

## Useful Commands

```powershell
npm run dev
npm run typecheck
npm run lint
npm run test:e2e
```

If Playwright browsers are missing:

```powershell
npm run test:e2e:install
```

Flyway:

```powershell
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" info
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" migrate
```

## Latest Verified State

- `flyway -configFiles=".\flyway.conf" migrate`: applied schema version `6` successfully.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run test:e2e`: passed for default non-destructive smoke tests; latest local run was 3 passed and 1 skipped because admin E2E env vars were not set in that process.
- User manually confirmed admin product CRUD and order status tracking workflows work in browser.

## Known Risks

- SSLCommerz code is implemented, but online checkout is disabled by default and still needs SSLCommerz sandbox credentials, a public HTTPS callback URL, and `ENABLE_ONLINE_PAYMENTS=true` before use.
- Supabase service role key was rotated on 2026-07-07 (new secret key live; legacy `service_role` JWT disabled); no longer a production blocker.
- Latest full dependency audit reported 0 high-level vulnerabilities; do not run force fixes without testing.
- Failed/cancelled online payment stock restoration remains a decision before enabling online checkout; current active COD checkout decrements stock when the order is created.
- Destructive E2E tests for real checkout/product/payment writes should only run against a disposable test database.
- Avoid running `next build` while a dev server is actively using `.next`; restart/clear generated cache if CSS/chunks render broken.

## Next Recommended Phase

Phase 6 follow-up, then Phase 7 production readiness.

Best-practice sequence:

1. Keep COD as the active checkout path. (Service role key rotation is done as of 2026-07-07.)
2. Finish Phase 7 production readiness: monitoring, backup/restore, and deployment checklist.
3. Add SSLCommerz sandbox credentials only in `.env.local` or deployment secrets when customer demand justifies online payment.
4. Use a public HTTPS app URL or tunnel for SSLCommerz callbacks.
5. Run one sandbox payment and verify `orders`, `payments`, and `payment_events`.
6. Decide whether failed/cancelled online payments should release reserved stock automatically before setting `ENABLE_ONLINE_PAYMENTS=true`.
