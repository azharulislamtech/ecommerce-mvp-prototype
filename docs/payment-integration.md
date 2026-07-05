# Payment Integration

This project uses a provider-neutral payment layer with an SSLCommerz adapter for Bangladesh-focused hosted checkout.

## Current Status

- Provider selected: SSLCommerz.
- Flyway migration `V5__sslcommerz_payment_method.sql` has been applied; schema version is `5`.
- Checkout supports `cash-on-delivery` and `sslcommerz` payment methods.
- Cash on Delivery keeps the existing pending-order success flow.
- SSLCommerz creates a hosted checkout session server-side and redirects the customer to `GatewayPageURL`.
- SSLCommerz success/fail/cancel browser callbacks and IPN callbacks are implemented.
- Payment status is updated only after server-side validation matches the local order number, amount, and BDT currency.
- Every received gateway callback, validation response, and status update is recorded in `payment_events`.

## Important Files

- Payment service facade: `src/lib/payments/payment-service.ts`
- SSLCommerz adapter: `src/lib/payments/sslcommerz.ts`
- SSLCommerz route helpers: `src/lib/payments/sslcommerz-routes.ts`
- Checkout action: `src/app/actions.ts`
- Checkout UI: `src/components/cart/checkout-client.tsx`
- Customer callback routes:
  - `src/app/api/payments/sslcommerz/success/route.ts`
  - `src/app/api/payments/sslcommerz/fail/route.ts`
  - `src/app/api/payments/sslcommerz/cancel/route.ts`
  - `src/app/api/payments/sslcommerz/ipn/route.ts`
- UX pages:
  - `src/app/(store)/payment/success/page.tsx`
  - `src/app/(store)/payment/failed/page.tsx`
- Database migration: `db/migration/V5__sslcommerz_payment_method.sql`

## Environment Variables

Do not commit real values. Keep them in `.env.local` or deployment secrets only.

```txt
NEXT_PUBLIC_SITE_URL=https://your-public-domain.example
SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_STORE_ID=YOUR_SSL_COMMERZ_STORE_ID
SSLCOMMERZ_STORE_PASSWORD=YOUR_SSL_COMMERZ_STORE_PASSWORD
SSLCOMMERZ_DEFAULT_CUSTOMER_EMAIL=payments@example.com
```

Notes:

- `NEXT_PUBLIC_SITE_URL` must be a public HTTPS URL for real gateway callbacks in sandbox/live testing.
- `SSLCOMMERZ_MODE=sandbox` uses `https://sandbox.sslcommerz.com`.
- `SSLCOMMERZ_MODE=live` uses `https://securepay.sslcommerz.com`.
- The current checkout does not collect customer email, so `SSLCOMMERZ_DEFAULT_CUSTOMER_EMAIL` is sent to meet SSLCommerz required fields.

## Validation Rules

A payment is marked `paid` only when SSLCommerz validation returns `VALID` or `VALIDATED` and all checks pass:

- `tran_id` equals the local `orders.order_number`.
- Validated amount equals `orders.total_amount`.
- Validated currency is `BDT`.
- `risk_level` is not `1`.

If SSLCommerz returns a risky or pending transaction, the local payment remains `pending` and the event is logged for admin review.

The code ignores gateway attempts to downgrade an already-paid payment to failed/cancelled.

## Callback Routes

Configure these with SSLCommerz when using a deployed app URL:

```txt
Success: https://your-public-domain.example/api/payments/sslcommerz/success
Fail:    https://your-public-domain.example/api/payments/sslcommerz/fail
Cancel:  https://your-public-domain.example/api/payments/sslcommerz/cancel
IPN:     https://your-public-domain.example/api/payments/sslcommerz/ipn
```

## Verification Done

- Official SSLCommerz docs were checked for hosted session creation, validation API, transaction query API, and IPN/callback behavior.
- `flyway -configFiles=".\flyway.conf" migrate` applied version `5` successfully.
- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run test:e2e` passed for the non-destructive smoke suite after rerunning outside the sandbox because the sandbox could not unlink `test-results/.last-run.json`.

## Still Required

- Add real SSLCommerz sandbox credentials locally/deployment-side.
- Use a public HTTPS URL or tunnel for sandbox callback testing.
- Run one real SSLCommerz sandbox payment and confirm `orders.payment_status`, `payments.payment_status`, and `payment_events` update correctly.
- Keep service role key rotation as a production blocker.
- Decide whether failed/cancelled online payments should automatically release reserved stock; currently checkout decrements stock at order creation and does not auto-restore it.