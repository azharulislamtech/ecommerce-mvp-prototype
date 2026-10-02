# Supabase Database Setup

This project keeps database changes in Flyway-compatible SQL migrations.

## Current Status

- Supabase project ref: `qguqohukemijphzwqxgs`
- Public API URL: `https://qguqohukemijphzwqxgs.supabase.co`
- Flyway migration status: remote schema version `10`, applied and verified on 2026-10-02 after encrypted backup and restore/migration testing.
- Applied migrations:
  - `V1__init_ecommerce_core_schema.sql`
  - `V2__supabase_rls_policies.sql`
  - `V3__seed_mvp_catalog.sql`
  - `V4__create_checkout_order_rpc.sql`
  - `V5__sslcommerz_payment_method.sql`
  - `V6__district_delivery_charge.sql`
  - `V7__verified_product_reviews.sql`
  - `V8__secure_order_tracking.sql`
  - `V9__checkout_and_order_integrity.sql`
  - `V10__reconcile_legacy_cod_payment_status.sql`
- Working database connection path for Flyway: Supabase Session Pooler
- Working pooler host found locally: `aws-1-ap-southeast-1.pooler.supabase.com`

## Secret Policy

Never write these values into Markdown, source code, issue text, screenshots, commits, or chat summaries:

- `SUPABASE_SERVICE_ROLE_KEY`
- Supabase database password
- Full `flyway.conf`
- `.env.local`
- Any private payment gateway secret
- SSLCommerz store ID/password

Use placeholders in docs:

```txt
NEXT_PUBLIC_SUPABASE_URL=https://qguqohukemijphzwqxgs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

The service role key was exposed during setup and was rotated on 2026-07-07 (migrated to a new Supabase secret key; legacy `service_role` JWT disabled).

## Required Local Environment

Copy `.env.example` to `.env.local` and fill in real values locally only.

```txt
NEXT_PUBLIC_SUPABASE_URL=https://qguqohukemijphzwqxgs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

`.env.local` is ignored by Git.

## Flyway Config

`flyway.conf` is ignored by Git because it contains the database password.

Use Session Pooler for this project because the direct database host resolves to IPv6 only in this environment.

```txt
flyway.url=jdbc:postgresql://aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require
flyway.user=postgres.qguqohukemijphzwqxgs
flyway.password=YOUR_SUPABASE_DATABASE_PASSWORD
flyway.defaultSchema=public
flyway.locations=filesystem:db/migration
flyway.validateMigrationNaming=true
flyway.cleanDisabled=true
```

## Commands

Check migration state:

```powershell
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" info
```

Run pending migrations:

```powershell
& "C:\Program Files\flyway\flyway.cmd" -configFiles=".\flyway.conf" migrate
```

## Seed Data

Baseline MVP catalog data is versioned in `db/migration/V3__seed_mvp_catalog.sql` and has been applied through Flyway. The older `db/seed/demo_catalog_seed.sql` is retained as a readable source/reference copy.

Future day-to-day product changes should be made through admin product management once Phase 4 is implemented, not by editing seed migrations.

## First Admin User

1. Create an admin account in Supabase Auth.
2. Copy the Auth user UUID.
3. Insert it into `admin_users`.

```sql
insert into admin_users (user_id, email, role)
values ('your-auth-user-uuid', 'admin@example.com', 'owner');
```

Public visitors can read only active categories, products, and product images. Order/payment writes go through trusted server-side code using the service role key and the `create_checkout_order` RPC. The RPC validates Bangladesh districts and calculates delivery charge server-side. SSLCommerz payment callbacks/IPN are implemented but online checkout stays disabled unless `ENABLE_ONLINE_PAYMENTS=true` is explicitly configured.
## Admin Auth Flow

Admin access requires two things:

1. A Supabase Auth user.
2. A matching row in `admin_users` with `is_active = true`.

After creating a Supabase Auth user, insert the UUID:

```sql
insert into admin_users (user_id, email, role)
values ('your-auth-user-uuid', 'admin@example.com', 'owner')
on conflict (user_id) do update
set email = excluded.email,
    role = excluded.role,
    is_active = true,
    updated_at = now();
```

Then sign in at `/admin/login`. The protected admin layout calls `is_admin()` through the authenticated Supabase session.

## Payment Gateway Setup

Phase 6 uses SSLCommerz hosted checkout. Keep real gateway credentials in `.env.local` or deployment secrets only.

Required for local/sandbox gateway testing after enabling online checkout with `ENABLE_ONLINE_PAYMENTS=true`:

```txt
NEXT_PUBLIC_SITE_URL=https://your-public-domain.example
SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_STORE_ID=YOUR_SSL_COMMERZ_STORE_ID
SSLCOMMERZ_STORE_PASSWORD=YOUR_SSL_COMMERZ_STORE_PASSWORD
SSLCOMMERZ_DEFAULT_CUSTOMER_EMAIL=payments@example.com
```

Callback/IPN routes:

```txt
/api/payments/sslcommerz/success
/api/payments/sslcommerz/fail
/api/payments/sslcommerz/cancel
/api/payments/sslcommerz/ipn
```

A public HTTPS URL is required for real SSLCommerz sandbox/live callbacks.
