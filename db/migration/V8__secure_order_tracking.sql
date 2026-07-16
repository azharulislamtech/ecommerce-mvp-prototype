-- Hardens public order lookup.
--
-- V4/V6 built order numbers from a sequence (SP-<date>-001001, -001002, ...) and
-- /payment/success resolved an order from that number alone, so walking the
-- sequence exposed every order's total and status. Public lookups now resolve a
-- random per-order tracking_token instead, order numbers are no longer
-- sequential, and failed lookups are rate limited.

-- 1. Random, non-sequential order numbers -------------------------------------

create or replace function generate_order_number()
returns text
language plpgsql
volatile
security definer
-- extensions is on the path because gen_random_bytes comes from pgcrypto, which
-- Supabase installs there. gen_random_uuid elsewhere in this schema resolves
-- without it only because that one lives in core Postgres.
set search_path = public, extensions
as $$
declare
  -- Crockford base32: I, L, O and U are dropped so a customer reading an order
  -- id back over the phone cannot confuse them with 1 and 0.
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea;
  v_suffix text;
  v_candidate text;
begin
  for _attempt in 1..10 loop
    v_bytes := gen_random_bytes(6);
    v_suffix := '';

    for i in 0..5 loop
      -- 256 is a multiple of 32, so this modulo leaves every symbol equally likely.
      v_suffix := v_suffix || substr(v_alphabet, 1 + (get_byte(v_bytes, i) % 32), 1);
    end loop;

    v_candidate := 'SP-' || to_char(now(), 'YYYYMMDD') || '-' || v_suffix;

    if not exists (select 1 from orders where order_number = v_candidate) then
      return v_candidate;
    end if;
  end loop;

  raise exception 'Could not allocate a unique order number.' using errcode = '53400';
end;
$$;

-- order_number_seq is left in place: orders placed before this migration keep
-- the numbers it handed out, and nothing else reads it.

-- 2. Per-order tracking token for public lookups -------------------------------

create or replace function generate_tracking_token()
returns text
language sql
volatile
set search_path = public, extensions
as $$
  select encode(gen_random_bytes(16), 'hex');
$$;

alter table orders add column if not exists tracking_token text;

-- gen_random_bytes is volatile, so this backfills one distinct token per row.
update orders
set tracking_token = generate_tracking_token()
where tracking_token is null;

alter table orders alter column tracking_token set default generate_tracking_token();
alter table orders alter column tracking_token set not null;

alter table orders drop constraint if exists orders_tracking_token_length;
alter table orders add constraint orders_tracking_token_length
  check (char_length(tracking_token) >= 32);

create unique index if not exists idx_orders_tracking_token on orders (tracking_token);

-- 3. Rate limiting for public order lookups ------------------------------------

create table if not exists public_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint public_rate_limits_count_non_negative check (request_count >= 0)
);

create index if not exists idx_public_rate_limits_updated_at on public_rate_limits (updated_at);

alter table public_rate_limits enable row level security;
-- No policy is defined on purpose: only service_role, which bypasses RLS, reaches
-- this table, and it is never exposed to anon or authenticated.

create or replace function is_within_public_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select request_count < p_limit
      from public_rate_limits
      where bucket_key = p_key
        and window_started_at > now() - make_interval(secs => p_window_seconds)
    ),
    true
  );
$$;

create or replace function record_public_rate_limit_hit(
  p_key text,
  p_window_seconds integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  insert into public_rate_limits (bucket_key, window_started_at, request_count, updated_at)
  values (p_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
  set
    window_started_at = case
      when public_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else public_rate_limits.window_started_at
    end,
    request_count = case
      when public_rate_limits.window_started_at <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else public_rate_limits.request_count + 1
    end,
    updated_at = v_now
  returning request_count into v_count;

  -- Opportunistic sweep so abandoned buckets do not accumulate forever.
  if random() < 0.01 then
    delete from public_rate_limits where updated_at < v_now - interval '1 day';
  end if;

  return v_count;
end;
$$;

-- 4. create_checkout_order now issues a tracking token -------------------------
-- Dropped rather than replaced because the returned row type gains a column.

drop function if exists create_checkout_order(text, text, text, text, text, text, jsonb);

create function create_checkout_order(
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

    select id, name, price, discount_price, stock_quantity, is_active
    into v_product
    from products
    where id = v_item.product_id
    for update;

    if not found or v_product.is_active is not true then
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

revoke all on function create_checkout_order(text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function generate_order_number() from public, anon, authenticated;
revoke all on function is_within_public_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function record_public_rate_limit_hit(text, integer) from public, anon, authenticated;

-- generate_tracking_token keeps its default grants: it backs the orders.tracking_token
-- column default, which is evaluated as whichever role runs the insert.

grant execute on function create_checkout_order(text, text, text, text, text, text, jsonb) to service_role;
grant execute on function is_within_public_rate_limit(text, integer, integer) to service_role;
grant execute on function record_public_rate_limit_hit(text, integer) to service_role;
