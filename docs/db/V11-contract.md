# V11 contract — redesign catalog schema

ফাইল: [`db/migration/V11__redesign_catalog_schema.sql`](../../db/migration/V11__redesign_catalog_schema.sql) · টেস্ট: [`tests/db/v11-catalog-states.test.mjs`](../../tests/db/v11-catalog-states.test.mjs) · পরিকল্পনা: [website-redesign-plan.md](../website-redesign-plan.md) R1.1–R1.6, R1.9

**অবস্থা:** খসড়া। প্রোডাকশনে চালানো হয়নি। আগে Codex review, তারপর মালিক নিজে Supabase SQL editor-এ চালাবেন (R1.7)।

এই migration শুধু নতুন জিনিস যোগ করে। গ্রাহক কিছু বদল দেখবেন না: নতুন ক্যাটাগরি বন্ধ অবস্থায় যোগ হয়, পুরনো সব পণ্য `available` আর `first_stocked_at = NULL` পায়, আর checkout-এর প্রকাশ্য signature, ফেরতের আকার আর grant একই থাকে। কিছু লুকানো, সরানো বা মোছা হয় না (সেটা V12, R1.8)।

The tables below are the reviewable contract. Conventions follow V1–V10: `uuid` keys with `gen_random_uuid()`, `timestamptz` with `now()`, `numeric(12,2)` money, named `check` constraints, `set_updated_at` triggers, RLS on every table, admin access through `is_admin()`, public RPCs `security definer set search_path = public` and executed by trusted server code as `service_role`.

## 1. `categories` (altered)

| Column | Type | Null | Default | Constraint | Notes |
|---|---|---|---|---|---|
| `parent_id` | uuid | yes | — | FK `categories(id)` **on delete restrict**; `categories_not_own_parent` | Two levels max, enforced by trigger `enforce_category_hierarchy` |
| `section` | text | yes | — | `categories_section_valid`: `kids` / `home`; `categories_child_has_section`: a child needs a section | Legacy 5 categories stay NULL |

Trigger `enforce_category_hierarchy` (before insert, update of `parent_id, section`): parent must exist and be a root; child section = parent section; a category with children cannot become a child; a root's section cannot change while children have another section.

Seeded rows (all `is_active = false`, `on conflict (slug) do nothing`):

| slug | name | section | parent |
|---|---|---|---|
| `kids-baby` | Kids & Baby | kids | — |
| `kids-education` | শিশুদের শিক্ষা | kids | `kids-baby` |
| `home-solutions` | সংসারের সমাধান | home | — |
| `home-kitchen` | রান্নাঘর | home | `home-solutions` |
| `home-cleaning` | পরিষ্কার | home | `home-solutions` |
| `home-organizing` | ঘর গোছানো | home | `home-solutions` |

Indexes: `idx_categories_parent_id`, partial `idx_categories_section`. Policies and grants unchanged (V2): the public sees only active categories.

## 2. `products` (altered)

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| `availability` | text | no | `'available'` | `products_availability_valid`: `available` / `coming_soon`; `products_coming_soon_has_no_stock`: `coming_soon ⇒ stock_quantity = 0` |
| `estimated_price` | numeric(12,2) | yes | — | `>= 0` |
| `first_stocked_at` | timestamptz | yes | — | set by trigger only (see below) |
| `age_min_months`, `age_max_months` | smallint | yes | — | `products_age_range_valid`: each 0–216, min ≤ max |
| `problem_tags` | text[] | no | `'{}'` | `products_problem_tags_valid` → `is_valid_tag_list` (≤ 10 tags, each `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 40 chars) |
| `learning_goals` | text[] | no | `'{}'` | `products_learning_goals_valid` (same rule) |
| `video_url` | text | yes | — | `products_video_url_valid`: https YouTube (`watch?v=`, `shorts/`, `youtu.be/`) or Facebook (`facebook.com/`, `fb.watch/`), safe characters only, ≤ 500 chars |

Hidden has one source: `is_active = false`. No stored state column.

Trigger `track_product_stock_state` (before insert or update, every row):
- `first_stocked_at` is set to `now()` only when it is NULL and stock goes from 0/NULL to > 0 (INSERT with stock > 0 counts). Once set it is never changed or cleared, including by direct updates.
- Legacy rows (existing before V11) keep NULL even if they have stock; nothing is inferred.
- If a `coming_soon` product with stock 0 gets stock back without an explicit availability change (the V9 cancellation restock), it becomes `available` instead of breaking the constraint. An explicit save of `coming_soon` with stock > 0 is still rejected.

Function `storefront_state(is_active, availability, stock_quantity, first_stocked_at) → text` (immutable; execute: anon, authenticated, service_role):

| is_active | availability | stock | first_stocked_at | result |
|---|---|---|---|---|
| false | any | any | any | `hidden` |
| true | `coming_soon` | 0 | any | `coming_soon` |
| true | `available` | > 0 | any | `in_stock` |
| true | `available` | 0 | set | `stock_ended` |
| true | `available` | 0 | NULL | `hidden` |

Indexes: GIN `idx_products_problem_tags`, GIN `idx_products_learning_goals`, partial `idx_products_age_range` (`where is_active`). Policies and grants unchanged (V2).

## 3. `interest_requests` (new)

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `product_id` | uuid | no | — | FK `products(id)` **on delete cascade** |
| `customer_name` | text | yes | — | 1–80 chars |
| `phone` | text | no | — | `^01[3-9][0-9]{8}$` (normalised) |
| `quantity` | smallint | yes | — | 1–99 |
| `status` | text | no | `'new'` | `new` / `contacted` / `purchased` / `not_interested` |
| `contacted_at` | timestamptz | yes | — | — |
| `created_at`, `updated_at` | timestamptz | no | `now()` | `set_updated_at` trigger |

Unique `(product_id, phone)`. Indexes: `(product_id, created_at desc)`, `(created_at)`, partial `(contacted_at)`.
RLS on; policy "Admins can manage interest requests" (`is_admin()`, all). Grants: none for `public`/`anon`; `authenticated` select, update, delete (admins only through the policy); **no insert grant** — rows are written only by the RPC.
Retention (R9.2, not in V11): delete at the earlier of `contacted_at + 30 days` and `created_at + 6 months`.

RPC `submit_product_interest(p_product_id uuid, p_phone text, p_customer_name text = null, p_quantity integer = null, p_request_key text = null) → void`, security definer, execute: `service_role` only.
- Phone normalised by `normalize_bd_mobile` (strip non-digits, drop leading `88`); invalid → error.
- Product must be active and `coming_soon`.
- Rate limits via V8 `record_public_rate_limit_hit`: 10 per phone per hour, 30 per request key (hashed IP, 64 hex) per hour.
- `insert … on conflict (product_id, phone) do nothing`: a repeat returns the same success, never reveals an earlier submission, and never changes the stored row. Status and dates are set by the server only.

## 4. `whatsapp_subscribers` (new)

| Column | Type | Null | Default | Constraint |
|---|---|---|---|---|
| `id` | uuid | no | `gen_random_uuid()` | PK |
| `phone` | text | no | — | unique; `^01[3-9][0-9]{8}$` |
| `consent_at` | timestamptz | no | `now()` | — |
| `consent_version` | text | no | — | `^[A-Za-z0-9._-]{1,40}$` |
| `last_response_at` | timestamptz | yes | — | set by an admin when the person replies to a broadcast |
| `opted_out_at` | timestamptz | yes | — | NULL = subscribed |
| `created_at`, `updated_at` | timestamptz | no | `now()` | `set_updated_at` trigger |

Partial index on `consent_at where opted_out_at is null`.
Trigger `guard_whatsapp_resubscribe`: clearing `opted_out_at` requires a `consent_at` later than the opt-out, so an admin edit or import cannot silently re-subscribe a number.
RLS and grants as `interest_requests`.

RPC `subscribe_whatsapp_updates(p_phone text, p_consent_version text, p_request_key text = null) → void`, security definer, execute: `service_role` only. Submitting the form is the explicit consent: it upserts with a new `consent_at` and `consent_version` and clears `opted_out_at`. Rate limits: 5 per phone per hour, 30 per request key per hour.

## 5. `get_unavailable_product(p_slug text)` (new, R1.9)

Returns `(name text, slug text, state text)`, at most one row; stable, security definer; execute: anon, authenticated, service_role.
Exact slug match only (no pattern, no listing), slug 1–200 chars. Returns a row only for an **inactive** product that was real: `first_stocked_at is not null` or `availability = 'coming_soon'`. Never-stocked inactive rows (the nine legacy dummies) return nothing, so their URLs stay 404. No price, stock or images.

## 6. Checkout (`create_checkout_order_internal`, replaced)

Body is V8's unchanged, plus one check after the existing `select … for update` lock and active check: `availability <> 'available' or stock_quantity < 1` → `'A product in your cart is no longer available.'` (same message as an inactive product, so nothing leaks). The V9 wrapper `create_checkout_order` is not touched, so a replayed request returns its original order. Signatures, return shape and grants are unchanged; the internal function stays revoked from every API role (re-stated at the end of V11).

## 7. Grants summary

| Object | public | anon | authenticated | service_role |
|---|---|---|---|---|
| `interest_requests`, `whatsapp_subscribers` | — | — | select/update/delete (admin policy) | bypasses RLS |
| `storefront_state`, `is_valid_tag_list`, `get_unavailable_product` | — | execute | execute | execute |
| `normalize_bd_mobile`, `submit_product_interest`, `subscribe_whatsapp_updates` | — | — | — | execute |
| trigger functions | — | — | — | (trigger use only) |
| `create_checkout_order_internal` | — | — | — | — |

Supabase gives new tables and functions default privileges for `anon`/`authenticated`; V11 revokes them explicitly.

## 8. Tests (PGlite, `npm run test:db`)

`tests/db/v11-catalog-states.test.mjs` covers: seeded categories inactive and two-level; hierarchy rejections; legacy seed rows `available` with NULL `first_stocked_at`; `coming_soon` + stock rejected; `first_stocked_at` set once and never overwritten or cleared; legacy stock not inferred; all five `storefront_state` cases; cancellation restock of a `coming_soon` product; checkout rejects `coming_soon` and stock-ended; replay still returns the original order; internal checkout closed to all API roles; tags, age and video validation; interest de-duplication, trusted fields, product eligibility, input checks and rate limits; RLS/grants for anon, non-admin and admin; WhatsApp opt-out and re-consent; lookup returns only inactive real products by exact slug. The existing V1–V10 suite (`order-integrity.test.mjs`) still passes with V11 applied.

PGlite limits (same as before): no pgcrypto entropy, no Supabase default privileges, no concurrent sessions. Production behaviour of the `anon`/`authenticated` default grants must be checked once in Supabase after R1.7.

## 9. Not in V11

- Hiding legacy categories and products, activating new categories (V12, R1.8).
- Retention jobs (R9.2), structured content and uploads (R12.4).
- App code and `src/lib/supabase/database.types.ts` (regenerate when the UI tasks start).
