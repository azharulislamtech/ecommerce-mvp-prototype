-- V11: Redesign schema, additive only (R1.1-R1.6, R1.9 in docs/website-redesign-plan.md).
--
-- Customer-visible behaviour does not change when this runs:
--   * new categories are seeded inactive (activated later by the V12 cutover, R1.8);
--   * every existing product gets availability = 'available' and first_stocked_at = NULL;
--   * the checkout keeps its public signature, return shape and grants.
-- Nothing is hidden, moved or deleted here. Contract: docs/db/V11-contract.md.

-- 1. Category hierarchy (R1.1) ---------------------------------------------------
-- At most two levels: a section root (parent_id NULL, section set) and its children.
-- The five legacy demo categories keep section NULL and parent_id NULL.

alter table categories
  add column if not exists parent_id uuid references categories(id) on delete restrict,
  add column if not exists section text;

alter table categories drop constraint if exists categories_section_valid;
alter table categories add constraint categories_section_valid
  check (section is null or section in ('kids', 'home'));

alter table categories drop constraint if exists categories_not_own_parent;
alter table categories add constraint categories_not_own_parent
  check (parent_id is null or parent_id <> id);

alter table categories drop constraint if exists categories_child_has_section;
alter table categories add constraint categories_child_has_section
  check (parent_id is null or section is not null);

create index if not exists idx_categories_parent_id on categories (parent_id);
create index if not exists idx_categories_section on categories (section) where section is not null;

create or replace function enforce_category_hierarchy()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_parent categories%rowtype;
begin
  -- Serialise hierarchy checks so two concurrent saves cannot together build a
  -- third level or a mixed-section tree. A transaction-scoped advisory lock is
  -- used instead of LOCK TABLE: upgrading the row-exclusive lock the write
  -- already holds could deadlock two writers. Under READ COMMITTED the SELECTs
  -- below then see rows the other transaction committed before releasing it.
  perform pg_advisory_xact_lock(hashtext('kena_sathi.categories.hierarchy'));
  if new.parent_id is not null then
    select * into v_parent from categories where id = new.parent_id;
    if not found then
      raise exception 'Parent category does not exist.' using errcode = '23503';
    end if;
    if v_parent.parent_id is not null then
      raise exception 'Categories can be at most two levels deep.' using errcode = '23514';
    end if;
    if v_parent.section is distinct from new.section then
      raise exception 'A subcategory must belong to the same section as its parent.' using errcode = '23514';
    end if;
    if tg_op = 'UPDATE' and exists (select 1 from categories where parent_id = new.id) then
      raise exception 'A category with subcategories cannot itself become a subcategory.' using errcode = '23514';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.section is distinct from old.section
     and exists (select 1 from categories where parent_id = new.id and section is distinct from new.section) then
    raise exception 'Change the section of subcategories first.' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_category_hierarchy on categories;
create trigger enforce_category_hierarchy
before insert or update of parent_id, section on categories
for each row execute function enforce_category_hierarchy();

-- 2. Launch categories, seeded inactive (R1.2) ------------------------------------
-- Learning goals (letters, numbers, fine motor, drawing) are tags, not categories.

insert into categories (name, slug, description, is_active, section, parent_id)
values
  ('Kids & Baby', 'kids-baby', 'শিশুদের শিক্ষামূলক খেলনা ও উপকরণ', false, 'kids', null),
  ('সংসারের সমাধান', 'home-solutions', 'রান্নাঘর, পরিষ্কার আর ঘর গোছানোর সমাধান', false, 'home', null)
on conflict (slug) do nothing;

insert into categories (name, slug, description, is_active, section, parent_id)
select v.name, v.slug, v.description, false, v.section, parent.id
from (values
  ('শিশুদের শিক্ষা', 'kids-education', '৩–৬ বছরের শিক্ষামূলক খেলনা', 'kids', 'kids-baby'),
  ('রান্নাঘর', 'home-kitchen', 'রান্নাঘর গোছানো আর কাজ সহজ করার পণ্য', 'home', 'home-solutions'),
  ('পরিষ্কার', 'home-cleaning', 'ঘর পরিষ্কারের সময় বাঁচানোর পণ্য', 'home', 'home-solutions'),
  ('ঘর গোছানো', 'home-organizing', 'আলমারি আর ঘর গোছানোর পণ্য', 'home', 'home-solutions')
) as v(name, slug, description, section, parent_slug)
join categories parent on parent.slug = v.parent_slug
on conflict (slug) do nothing;

-- 3. Product availability and first stock date (R1.3) ----------------------------
-- is_active = false is the only "hidden" signal. availability has two values:
--   'available'   normal product (default; every existing row)
--   'coming_soon' announced but not in hand; stock must be 0, never orderable.
-- The storefront state is derived by storefront_state() below, never stored.

alter table products
  add column if not exists availability text not null default 'available',
  add column if not exists estimated_price numeric(12, 2),
  add column if not exists first_stocked_at timestamptz;

alter table products drop constraint if exists products_availability_valid;
alter table products add constraint products_availability_valid
  check (availability in ('available', 'coming_soon'));

alter table products drop constraint if exists products_coming_soon_has_no_stock;
alter table products add constraint products_coming_soon_has_no_stock
  check (availability <> 'coming_soon' or stock_quantity = 0);

alter table products drop constraint if exists products_estimated_price_non_negative;
alter table products add constraint products_estimated_price_non_negative
  check (estimated_price is null or estimated_price >= 0);

-- An explicit availability save (the column is in the UPDATE's SET list) may not
-- combine coming_soon with stock. This trigger's name sorts before
-- track_product_stock_state, so it sees the caller's values before any auto-flip.
-- The admin form therefore sends availability only when it changes, or the owner
-- sets stock to 0 when choosing coming_soon (R10.1).
create or replace function guard_coming_soon_stock()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.availability = 'coming_soon' and new.stock_quantity > 0 then
    raise exception 'A coming-soon product cannot have stock. Set stock to 0 or choose available.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_coming_soon_stock on products;
create trigger guard_coming_soon_stock
before update of availability on products
for each row execute function guard_coming_soon_stock();

-- first_stocked_at is owned by this trigger: any value a caller supplies is
-- ignored. It is set once, when a product first goes from no stock to stock,
-- and never overwritten, cleared or inferred for legacy rows (they keep NULL).
-- A legacy correction, if ever needed, must be a separate admin-only function.
-- A stock-only update that restocks a coming_soon product (the V9 cancellation
-- restock) turns it back into 'available' instead of violating the no-stock rule.
create or replace function track_product_stock_state()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.first_stocked_at := null;
  else
    new.first_stocked_at := old.first_stocked_at;
    if new.availability = 'coming_soon' and old.availability = 'coming_soon'
       and new.stock_quantity > 0 and coalesce(old.stock_quantity, 0) = 0 then
      new.availability := 'available';
    end if;
  end if;
  if new.first_stocked_at is null and new.stock_quantity > 0
     and (tg_op = 'INSERT' or coalesce(old.stock_quantity, 0) = 0) then
    new.first_stocked_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists track_product_stock_state on products;
create trigger track_product_stock_state
before insert or update on products
for each row execute function track_product_stock_state();

-- Single definition of the customer-facing state (R2.3, R2.4 read this).
create or replace function storefront_state(
  p_is_active boolean,
  p_availability text,
  p_stock_quantity integer,
  p_first_stocked_at timestamptz
)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when p_is_active is not true then 'hidden'
    when p_availability = 'coming_soon' then 'coming_soon'
    when coalesce(p_stock_quantity, 0) > 0 then 'in_stock'
    when p_first_stocked_at is not null then 'stock_ended'
    else 'hidden'
  end;
$$;

-- 4. Filters, tags and video link (R1.4) ------------------------------------------

create or replace function is_valid_tag_list(p_tags text[])
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(cardinality(p_tags), 0) <= 10
    and not exists (
      select 1 from unnest(coalesce(p_tags, '{}'::text[])) as tag
      where tag is null or tag !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(tag) > 40
    );
$$;

alter table products
  add column if not exists age_min_months smallint,
  add column if not exists age_max_months smallint,
  add column if not exists problem_tags text[] not null default '{}',
  add column if not exists learning_goals text[] not null default '{}',
  add column if not exists video_url text;

alter table products drop constraint if exists products_age_range_valid;
alter table products add constraint products_age_range_valid check (
  (age_min_months is null or age_min_months between 0 and 216)
  and (age_max_months is null or age_max_months between 0 and 216)
  and (age_min_months is null or age_max_months is null or age_min_months <= age_max_months)
);

alter table products drop constraint if exists products_problem_tags_valid;
alter table products add constraint products_problem_tags_valid check (is_valid_tag_list(problem_tags));

alter table products drop constraint if exists products_learning_goals_valid;
alter table products add constraint products_learning_goals_valid check (is_valid_tag_list(learning_goals));

-- Only a link to YouTube or Facebook; no uploads at launch (R12.4).
alter table products drop constraint if exists products_video_url_valid;
alter table products add constraint products_video_url_valid check (
  video_url is null or (
    char_length(video_url) <= 500
    and video_url ~ '^https://((www\.|m\.)?youtube\.com/(watch\?v=|shorts/)|youtu\.be/|(www\.|m\.|web\.)?facebook\.com/|fb\.watch/)[A-Za-z0-9_./?=&%-]+$'
  )
);

create index if not exists idx_products_problem_tags on products using gin (problem_tags);
create index if not exists idx_products_learning_goals on products using gin (learning_goals);
create index if not exists idx_products_age_range on products (age_min_months, age_max_months)
  where is_active;

-- Shared Bangladesh mobile normalisation (same rule as the V9 checkout wrapper).
create or replace function normalize_bd_mobile(p_phone text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if length(v_phone) = 13 and left(v_phone, 2) = '88' then
    v_phone := substr(v_phone, 3);
  end if;
  if v_phone !~ '^01[3-9][0-9]{8}$' then
    return null;
  end if;
  return v_phone;
end;
$$;

-- 5. Interest requests for coming-soon products (R1.5) ----------------------------
-- Written only through submit_product_interest(); readable only by admins.
-- Deletion (R9.2): earlier of contacted_at + 30 days and created_at + 6 months.

create table if not exists interest_requests (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  customer_name text,
  phone text not null,
  quantity smallint,
  status text not null default 'new',
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint interest_requests_phone_valid check (phone ~ '^01[3-9][0-9]{8}$'),
  constraint interest_requests_name_length check (customer_name is null or char_length(customer_name) between 1 and 80),
  constraint interest_requests_quantity_range check (quantity is null or quantity between 1 and 99),
  constraint interest_requests_status_valid check (status in ('new', 'contacted', 'purchased', 'not_interested')),
  constraint interest_requests_one_per_product_phone unique (product_id, phone)
);

create index if not exists idx_interest_requests_product_created on interest_requests (product_id, created_at desc);
create index if not exists idx_interest_requests_created_at on interest_requests (created_at);
create index if not exists idx_interest_requests_contacted_at on interest_requests (contacted_at)
  where contacted_at is not null;

drop trigger if exists set_interest_requests_updated_at on interest_requests;
create trigger set_interest_requests_updated_at
before update on interest_requests
for each row execute function set_updated_at();

alter table interest_requests enable row level security;
revoke all on interest_requests from public, anon, authenticated;
grant select, update, delete on interest_requests to authenticated;

drop policy if exists "Admins can manage interest requests" on interest_requests;
create policy "Admins can manage interest requests"
on interest_requests
for all
to authenticated
using (is_admin())
with check (is_admin());

-- Same success response for new and repeated submissions, so the endpoint does
-- not reveal whether a number already registered interest.
create or replace function submit_product_interest(
  p_product_id uuid,
  p_phone text,
  p_customer_name text default null,
  p_quantity integer default null,
  p_request_key text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_phone text := normalize_bd_mobile(p_phone);
  v_name text := nullif(trim(coalesce(p_customer_name, '')), '');
begin
  if v_phone is null then
    raise exception 'A valid Bangladesh mobile number is required.' using errcode = '22023';
  end if;
  if v_name is not null and char_length(v_name) > 80 then
    raise exception 'Name is too long.' using errcode = '22023';
  end if;
  if p_quantity is not null and p_quantity not between 1 and 99 then
    raise exception 'Invalid quantity.' using errcode = '22023';
  end if;
  if not exists (
    select 1 from products
    where id = p_product_id and is_active and availability = 'coming_soon'
  ) then
    raise exception 'This product is not taking interest requests.' using errcode = '22023';
  end if;
  if record_public_rate_limit_hit('interest-phone:' || v_phone, 3600) > 10 then
    raise exception 'Too many requests. Please try again later.' using errcode = 'P0001';
  end if;
  if p_request_key is not null then
    if p_request_key !~ '^[0-9a-f]{64}$' then
      raise exception 'Invalid request key.' using errcode = '22023';
    end if;
    if record_public_rate_limit_hit('interest-ip:' || p_request_key, 3600) > 30 then
      raise exception 'Too many requests. Please try again later.' using errcode = 'P0001';
    end if;
  end if;
  insert into interest_requests (product_id, customer_name, phone, quantity)
  values (p_product_id, v_name, v_phone, p_quantity::smallint)
  on conflict (product_id, phone) do nothing;
end;
$$;

-- 6. WhatsApp update subscribers (R1.6) -------------------------------------------
-- An opted-out number stays as a record and is never reactivated by the web form:
-- anyone can type someone else's number there. A form submit for an opted-out
-- number only marks it "pending re-consent" (reconsent_requested_at). The owner
-- reactivates it in admin, with a new consent_at and consent_version, only after
-- the person messages the shop on WhatsApp (the Q7 manual broadcast flow).
-- last_response_at is set by an admin when the person replies to a broadcast.

create table if not exists whatsapp_subscribers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique,
  consent_at timestamptz not null default now(),
  consent_version text not null,
  last_response_at timestamptz,
  opted_out_at timestamptz,
  reconsent_requested_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_subscribers_phone_valid check (phone ~ '^01[3-9][0-9]{8}$'),
  constraint whatsapp_subscribers_consent_version_valid check (consent_version ~ '^[A-Za-z0-9._-]{1,40}$'),
  constraint whatsapp_subscribers_reconsent_only_when_opted_out
    check (reconsent_requested_at is null or opted_out_at is not null)
);

create index if not exists idx_whatsapp_subscribers_pending_reconsent on whatsapp_subscribers (reconsent_requested_at)
  where reconsent_requested_at is not null;

create index if not exists idx_whatsapp_subscribers_active on whatsapp_subscribers (consent_at)
  where opted_out_at is null;

drop trigger if exists set_whatsapp_subscribers_updated_at on whatsapp_subscribers;
create trigger set_whatsapp_subscribers_updated_at
before update on whatsapp_subscribers
for each row execute function set_updated_at();

create or replace function guard_whatsapp_resubscribe()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.opted_out_at is not null and new.opted_out_at is null then
    if not is_admin() then
      raise exception 'Only an admin can reactivate an opted-out number.' using errcode = '42501';
    end if;
    -- A new consent time is required; the consent text version may stay the same
    -- (format and NOT NULL are enforced by the table constraints).
    if new.consent_at <= old.opted_out_at then
      raise exception 'An opted-out number needs new explicit consent to subscribe again.' using errcode = '23514';
    end if;
    new.reconsent_requested_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_whatsapp_resubscribe on whatsapp_subscribers;
create trigger guard_whatsapp_resubscribe
before update on whatsapp_subscribers
for each row execute function guard_whatsapp_resubscribe();

alter table whatsapp_subscribers enable row level security;
revoke all on whatsapp_subscribers from public, anon, authenticated;
grant select, update, delete on whatsapp_subscribers to authenticated;

drop policy if exists "Admins can manage WhatsApp subscribers" on whatsapp_subscribers;
create policy "Admins can manage WhatsApp subscribers"
on whatsapp_subscribers
for all
to authenticated
using (is_admin())
with check (is_admin());

-- New number: the form submit is the explicit consent (time and version stored).
-- Active number: no-op, the original consent is kept (replays change nothing).
-- Opted-out number: stays opted out; only reconsent_requested_at is set.
-- The response is the same in every case.
create or replace function subscribe_whatsapp_updates(
  p_phone text,
  p_consent_version text,
  p_request_key text default null
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_phone text := normalize_bd_mobile(p_phone);
begin
  if v_phone is null then
    raise exception 'A valid Bangladesh mobile number is required.' using errcode = '22023';
  end if;
  if coalesce(p_consent_version, '') !~ '^[A-Za-z0-9._-]{1,40}$' then
    raise exception 'Invalid consent version.' using errcode = '22023';
  end if;
  if record_public_rate_limit_hit('whatsapp-phone:' || v_phone, 3600) > 5 then
    raise exception 'Too many requests. Please try again later.' using errcode = 'P0001';
  end if;
  if p_request_key is not null then
    if p_request_key !~ '^[0-9a-f]{64}$' then
      raise exception 'Invalid request key.' using errcode = '22023';
    end if;
    if record_public_rate_limit_hit('whatsapp-ip:' || p_request_key, 3600) > 30 then
      raise exception 'Too many requests. Please try again later.' using errcode = 'P0001';
    end if;
  end if;
  insert into whatsapp_subscribers (phone, consent_at, consent_version)
  values (v_phone, clock_timestamp(), p_consent_version)
  on conflict (phone) do update
    set reconsent_requested_at = clock_timestamp()
    where whatsapp_subscribers.opted_out_at is not null;
end;
$$;

-- 7. Limited lookup for the "এখন পাওয়া যাচ্ছে না" page (R1.9) ----------------------
-- By exact slug only (no listing). Only inactive products that were real: stocked
-- at least once or announced as coming soon. Never-stocked dummy rows return nothing.

create or replace function get_unavailable_product(p_slug text)
returns table (name text, slug text, state text)
language sql
stable
security definer
set search_path = public
as $$
  select p.name, p.slug, 'hidden'::text
  from products p
  where p.slug = p_slug
    and char_length(coalesce(p_slug, '')) between 1 and 200
    and p.is_active is not true
    and (p.first_stocked_at is not null or p.availability = 'coming_soon')
  limit 1;
$$;

-- 8. Checkout: reject anything that is not in stock (R1.3) ------------------------
-- The state check sits inside the internal function, after the row lock. The V9
-- wrapper (create_checkout_order) is untouched, so a replayed request still returns
-- its original order. Body below is V8's, with only the availability check added.

create or replace function create_checkout_order_internal(
  p_customer_name text,
  p_customer_phone text,
  p_customer_district text,
  p_customer_address text,
  p_customer_note text,
  p_payment_method text,
  p_items jsonb
)
returns table (
  order_id uuid,
  order_number text,
  tracking_token text,
  subtotal numeric,
  delivery_charge numeric,
  discount_amount numeric,
  total_amount numeric,
  payment_status text,
  order_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_order_number text;
  v_tracking_token text;
  v_subtotal numeric(12, 2) := 0;
  v_delivery_charge numeric(12, 2) := 0;
  v_customer_district text;
  v_discount_amount numeric(12, 2) := 0;
  v_total_amount numeric(12, 2);
  v_payment_method text := lower(trim(coalesce(p_payment_method, 'cash-on-delivery')));
  v_gateway_name text;
  v_item record;
  v_product record;
  v_unit_price numeric(12, 2);
  v_line_total numeric(12, 2);
  v_item_count integer;
begin
  if v_payment_method = 'payment-gateway' then
    v_payment_method := 'sslcommerz';
  end if;

  if v_payment_method not in ('cash-on-delivery', 'sslcommerz') then
    raise exception 'Unsupported payment method.' using errcode = '22023';
  end if;

  if length(trim(coalesce(p_customer_name, ''))) < 2 then
    raise exception 'Customer name is required.' using errcode = '22023';
  end if;

  if trim(coalesce(p_customer_phone, '')) !~ '^(?:\+?88)?01[3-9][0-9]{8}$' then
    raise exception 'A valid Bangladesh mobile number is required.' using errcode = '22023';
  end if;

  select allowed_district.name into v_customer_district
  from unnest(array[
    'Bagerhat',
    'Bandarban',
    'Barguna',
    'Barishal',
    'Bhola',
    'Bogura',
    'Brahmanbaria',
    'Chandpur',
    'Chapainawabganj',
    'Chattogram',
    'Chuadanga',
    'Cox''s Bazar',
    'Cumilla',
    'Dhaka',
    'Dinajpur',
    'Faridpur',
    'Feni',
    'Gaibandha',
    'Gazipur',
    'Gopalganj',
    'Habiganj',
    'Jamalpur',
    'Jashore',
    'Jhalokati',
    'Jhenaidah',
    'Joypurhat',
    'Khagrachhari',
    'Khulna',
    'Kishoreganj',
    'Kurigram',
    'Kushtia',
    'Lakshmipur',
    'Lalmonirhat',
    'Madaripur',
    'Magura',
    'Manikganj',
    'Meherpur',
    'Moulvibazar',
    'Munshiganj',
    'Mymensingh',
    'Naogaon',
    'Narail',
    'Narayanganj',
    'Narsingdi',
    'Natore',
    'Netrokona',
    'Nilphamari',
    'Noakhali',
    'Pabna',
    'Panchagarh',
    'Patuakhali',
    'Pirojpur',
    'Rajbari',
    'Rajshahi',
    'Rangamati',
    'Rangpur',
    'Satkhira',
    'Shariatpur',
    'Sherpur',
    'Sirajganj',
    'Sunamganj',
    'Sylhet',
    'Tangail',
    'Thakurgaon'
  ]) as allowed_district(name)
  where lower(allowed_district.name) = lower(trim(coalesce(p_customer_district, '')))
  limit 1;

  if v_customer_district is null then
    raise exception 'Choose a valid Bangladesh district.' using errcode = '22023';
  end if;

  v_delivery_charge := case
    when v_customer_district = 'Dhaka' then 60
    else 120
  end;

  if length(trim(coalesce(p_customer_address, ''))) < 8 then
    raise exception 'Customer address is required.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_items) is distinct from 'array' then
    raise exception 'Cart items must be an array.' using errcode = '22023';
  end if;

  select count(*) into v_item_count from jsonb_array_elements(p_items);

  if v_item_count < 1 then
    raise exception 'Cart is empty.' using errcode = '22023';
  end if;

  if v_item_count > 30 then
    raise exception 'Cart has too many line items.' using errcode = '22023';
  end if;

  for v_item in
    select product_id, quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  loop
    if v_item.product_id is null then
      raise exception 'Cart item product id is required.' using errcode = '22023';
    end if;

    if v_item.quantity is null or v_item.quantity < 1 or v_item.quantity > 99 then
      raise exception 'Invalid quantity for a cart item.' using errcode = '22023';
    end if;

    select id, name, price, discount_price, stock_quantity, is_active, availability
    into v_product
    from products
    where id = v_item.product_id
    for update;

    if not found or v_product.is_active is not true then
      raise exception 'A product in your cart is no longer available.' using errcode = '22023';
    end if;

    -- V11: only in-stock products can be ordered (not coming_soon, not stock ended).
    if v_product.availability is distinct from 'available' or v_product.stock_quantity < 1 then
      raise exception 'A product in your cart is no longer available.' using errcode = '22023';
    end if;

    if v_product.stock_quantity < v_item.quantity then
      raise exception 'Insufficient stock for %.', v_product.name using errcode = '22023';
    end if;

    v_unit_price := coalesce(v_product.discount_price, v_product.price);
    v_line_total := round(v_unit_price * v_item.quantity, 2);
    v_subtotal := round(v_subtotal + v_line_total, 2);
  end loop;

  v_total_amount := round(v_subtotal + v_delivery_charge - v_discount_amount, 2);
  v_order_number := generate_order_number();
  v_tracking_token := generate_tracking_token();
  v_gateway_name := case
    when v_payment_method = 'cash-on-delivery' then 'cash_on_delivery'
    when v_payment_method = 'sslcommerz' then 'sslcommerz'
    else 'unknown'
  end;

  insert into orders (
    id,
    order_number,
    tracking_token,
    customer_name,
    customer_phone,
    customer_district,
    customer_address,
    customer_note,
    subtotal,
    delivery_charge,
    discount_amount,
    total_amount,
    order_status,
    payment_status
  ) values (
    v_order_id,
    v_order_number,
    v_tracking_token,
    trim(p_customer_name),
    trim(p_customer_phone),
    v_customer_district,
    trim(p_customer_address),
    nullif(trim(coalesce(p_customer_note, '')), ''),
    v_subtotal,
    v_delivery_charge,
    v_discount_amount,
    v_total_amount,
    'pending',
    'pending'
  );

  for v_item in
    select product_id, quantity
    from jsonb_to_recordset(p_items) as item(product_id uuid, quantity integer)
  loop
    select id, name, price, discount_price, stock_quantity
    into v_product
    from products
    where id = v_item.product_id
    for update;

    v_unit_price := coalesce(v_product.discount_price, v_product.price);
    v_line_total := round(v_unit_price * v_item.quantity, 2);

    insert into order_items (
      order_id,
      product_id,
      product_name,
      unit_price,
      quantity,
      total_price
    ) values (
      v_order_id,
      v_product.id,
      v_product.name,
      v_unit_price,
      v_item.quantity,
      v_line_total
    );

    update products
    set stock_quantity = stock_quantity - v_item.quantity
    where id = v_product.id;
  end loop;

  insert into payments (
    order_id,
    gateway_name,
    gateway_transaction_id,
    amount,
    currency,
    payment_method,
    payment_status
  ) values (
    v_order_id,
    v_gateway_name,
    case when v_payment_method = 'sslcommerz' then v_order_number else null end,
    v_total_amount,
    'BDT',
    v_payment_method,
    'pending'
  );

  return query
  select
    v_order_id,
    v_order_number,
    v_tracking_token,
    v_subtotal,
    v_delivery_charge,
    v_discount_amount,
    v_total_amount,
    'pending'::text,
    'pending'::text;
end;
$$;

-- 9. Grants ------------------------------------------------------------------------
-- Same pattern as V7-V9: public RPCs are called by trusted server code with the
-- service role; read-only helpers are open to the storefront roles.

revoke all on function create_checkout_order_internal(text, text, text, text, text, text, jsonb)
  from public, anon, authenticated, service_role;

revoke all on function enforce_category_hierarchy() from public, anon, authenticated;
revoke all on function track_product_stock_state() from public, anon, authenticated;
revoke all on function guard_whatsapp_resubscribe() from public, anon, authenticated;
revoke all on function guard_coming_soon_stock() from public, anon, authenticated;

revoke all on function storefront_state(boolean, text, integer, timestamptz) from public;
grant execute on function storefront_state(boolean, text, integer, timestamptz) to anon, authenticated, service_role;

revoke all on function is_valid_tag_list(text[]) from public;
grant execute on function is_valid_tag_list(text[]) to anon, authenticated, service_role;

revoke all on function normalize_bd_mobile(text) from public, anon, authenticated;
grant execute on function normalize_bd_mobile(text) to service_role;

revoke all on function submit_product_interest(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function submit_product_interest(uuid, text, text, integer, text) to service_role;

revoke all on function subscribe_whatsapp_updates(text, text, text) from public, anon, authenticated;
grant execute on function subscribe_whatsapp_updates(text, text, text) to service_role;

revoke all on function get_unavailable_product(text) from public;
grant execute on function get_unavailable_product(text) to anon, authenticated, service_role;
