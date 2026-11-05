# E2E Smoke Testing

The project uses Playwright for browser-level smoke tests. The default suite is intentionally non-destructive: it does not submit checkout orders or mutate Supabase data beyond browser localStorage.

## Scripts

```powershell
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:ui
```

`test:e2e:install` installs the Chromium browser binary used by Playwright. Run it once per machine or CI image.

## Isolated regression tests

Run `npm run test:unit`, `npm run test:db`, and `npm run test:e2e:production` for release verification. `npm run test:e2e:isolated` runs the same browser suite against the development server.

The isolated runner creates a disposable PGlite database, applies every migration (V1 onward), starts a loopback PostgREST/Auth fixture and overrides Supabase/notification/payment configuration for the child app. It uses `.next-isolated` to avoid sharing the development cache. The isolated-only browser tests submit COD orders and authenticate a fake admin to exercise dashboard, dispatch/cancellation and confirmed-return inventory actions. They also check canonical/structured-data output, private-page headers, sitemap, mobile layout and existing cart/tracking/admin guards. They are skipped in the default shared-server suite.

Ports: each isolated run picks free ports for the app and the fixture (printed as `Isolated e2e: app on …, fixture on …`), so two runs at the same time cannot share a server. To pin them, set `E2E_PORT` and/or `E2E_FIXTURE_PORT`; if a pinned port is busy, the run stops with exit code 1 (`already in use` / `could not listen`) instead of testing another run's server.

Auth is simulated and Storage uploads are not emulated. Staging tests against real Supabase remain necessary. PGlite tests do not certify pgcrypto randomness or multi-session database contention. The separate PostgreSQL restore drill exercises real pgcrypto and three independent checkout sessions. Never set `E2E_ISOLATED=1` for a shared/production server; use the runner to configure its disposable services.

## Server Selection

By default, Playwright reuses an existing server on port `3000` or starts one with:

```powershell
npm run dev -- -p 3000
```

To test a different running server:

```powershell
$env:E2E_BASE_URL="http://127.0.0.1:3000"
npm run test:e2e
```

To change the auto-start port:

```powershell
$env:E2E_PORT="3001"
npm run test:e2e
```

## Included Coverage

Default suite:

- Storefront product listing renders.
- Available product can be added to local cart.
- Cart review and checkout page can be reached without placing an order.
- Public tracking form shows safe empty/not-found states and does not leak old mock data.
- Logged-out admin dashboard/orders routes redirect to login.

Optional authenticated admin smoke:

```powershell
$env:E2E_ADMIN_EMAIL="admin@example.com"
$env:E2E_ADMIN_PASSWORD="your-password"
npm run test:e2e
```

This logs in through Supabase Auth and verifies the admin dashboard and orders list. Do not commit credentials or put them in tracked files.

## Safety Rules

- Keep default E2E tests non-destructive against shared Supabase projects.
- Any future checkout-order creation test must be opt-in and should run against a disposable test database or seeded test account.
- Do not store Playwright storage state with real admin sessions in Git. `.playwright-auth/`, `test-results/`, and `playwright-report/` are ignored.
- SSLCommerz sandbox payment tests must be opt-in, use sandbox credentials only, and run against a disposable or clearly marked test order dataset.

## R11.2 phone, states and accessibility: where each check lives

Each rule from the redesign plan (R11.2) and the test that proves it. All of them run in `npm run test:e2e:production`.

| Rule | Checked by |
|---|---|
| (ক) Every store page fits a 390px phone with no sideways scroll | `accessibility.spec.ts` runs every main page at 390×844. Overflow checks are also in `header-footer`, `homepage`, `kids-page`, `storefront-categories`, `storefront-states`, `return-policy`, `privacy-policy`, `checkout-bangla`, `gift-checkbox`, `interest-and-retention` and `whatsapp` |
| (ক) Product or buy button on the phone's first screen | `product-page.spec.ts` (price and "এখনই অর্ডার করুন (COD)" inside 844px), `homepage.spec.ts` (section card inside the first screen) |
| (খ) Empty states in Bangla | store empty: `storefront-cutover`; search with no match: `search`; filter with no match: `storefront-categories`, `kids-page`; empty cart: `checkout-bangla`; empty Kids page and homepage: `kids-page`, `homepage` |
| (খ) Loading states in Bangla | submit buttons show "পাঠানো হচ্ছে..." while pending (checkout, review, interest, WhatsApp); exercised in `checkout-bangla`, `product-description`, `interest-and-retention`, `whatsapp` |
| (খ) Error and no-network states in Bangla | `checkout-bangla` (dropped connection, product gone mid-checkout), `product-description` (wrong order number on a review), `interest-and-retention` (bad phone), with typed values kept after each error |
| (গ) `<html lang="bn">`; the admin is `lang="en"` | `accessibility.spec.ts` |
| (গ) Bangla font | Hind Siliguri through `next/font` in `src/app/layout.tsx`, self-hosted at build time |
| (গ) Text contrast at least 4.5:1, a label on every form field, alt text on every image, accessible names | axe (WCAG 2.1 AA) on `/`, `/products`, `/kids`, `/cart`, `/checkout`, `/track-order`, the three policies and a product page, in `accessibility.spec.ts` |
| (গ) Tap targets at least 44px | `accessibility.spec.ts` measures buttons, fields and stand-alone links (links inside a sentence are exempt, as WCAG 2.5.8 allows) |
| (গ) Everything works with the keyboard alone | `accessibility.spec.ts`: "মূল লেখায় যান" skip link, Tab to a product's buy button with a visible focus ring, Enter adds it to the cart |
| (গ) Bangla `alt_text` on product images | The admin enters it per image (product guideline, common §৬). axe fails any image that has no alt text |
