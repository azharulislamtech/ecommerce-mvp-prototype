# E2E Smoke Testing

The project uses Playwright for browser-level smoke tests. The default suite is intentionally non-destructive: it does not submit checkout orders or mutate Supabase data beyond browser localStorage.

## Scripts

```powershell
npm run test:e2e:install
npm run test:e2e
npm run test:e2e:ui
```

`test:e2e:install` installs the Chromium browser binary used by Playwright. Run it once per machine or CI image.

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