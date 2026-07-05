create extension if not exists pgcrypto;

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_not_blank check (length(trim(slug)) > 0)
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references categories(id) on delete set null,
  name text not null,
  slug text not null unique,
  short_description text,
  description text,
  price numeric(12, 2) not null,
  discount_price numeric(12, 2),
  stock_quantity integer not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_slug_not_blank check (length(trim(slug)) > 0),
  constraint products_price_non_negative check (price >= 0),
  constraint products_discount_price_non_negative check (discount_price is null or discount_price >= 0),
  constraint products_discount_not_above_price check (discount_price is null or discount_price <= price),
  constraint products_stock_non_negative check (stock_quantity >= 0)
);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint product_images_url_not_blank check (length(trim(image_url)) > 0),
  constraint product_images_sort_order_non_negative check (sort_order >= 0)
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_phone text not null,
  customer_district text not null,
  customer_address text not null,
  customer_note text,
  subtotal numeric(12, 2) not null,
  delivery_charge numeric(12, 2) not null default 0,
  discount_amount numeric(12, 2) not null default 0,
  total_amount numeric(12, 2) not null,
  order_status text not null default 'pending',
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_number_not_blank check (length(trim(order_number)) > 0),
  constraint orders_phone_not_blank check (length(trim(customer_phone)) > 0),
  constraint orders_amounts_non_negative check (
    subtotal >= 0
    and delivery_charge >= 0
    and discount_amount >= 0
    and total_amount >= 0
  ),
  constraint orders_total_matches_parts check (total_amount = subtotal + delivery_charge - discount_amount),
  constraint orders_status_valid check (
    order_status in ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled')
  ),
  constraint orders_payment_status_valid check (
    payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')
  )
);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12, 2) not null,
  quantity integer not null,
  total_price numeric(12, 2) not null,
  created_at timestamptz not null default now(),
  constraint order_items_product_name_not_blank check (length(trim(product_name)) > 0),
  constraint order_items_unit_price_non_negative check (unit_price >= 0),
  constraint order_items_quantity_positive check (quantity > 0),
  constraint order_items_total_matches_quantity check (total_price = unit_price * quantity)
);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  gateway_name text not null,
  gateway_transaction_id text,
  amount numeric(12, 2) not null,
  currency text not null default 'BDT',
  payment_method text,
  payment_status text not null default 'pending',
  gateway_response jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_gateway_name_not_blank check (length(trim(gateway_name)) > 0),
  constraint payments_amount_non_negative check (amount >= 0),
  constraint payments_currency_not_blank check (length(trim(currency)) > 0),
  constraint payments_status_valid check (
    payment_status in ('pending', 'paid', 'failed', 'cancelled', 'refunded')
  )
);

create table if not exists payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references payments(id) on delete cascade,
  event_type text not null,
  event_payload jsonb,
  created_at timestamptz not null default now(),
  constraint payment_events_type_not_blank check (length(trim(event_type)) > 0)
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_categories_updated_at on categories;
create trigger set_categories_updated_at
before update on categories
for each row execute function set_updated_at();

drop trigger if exists set_products_updated_at on products;
create trigger set_products_updated_at
before update on products
for each row execute function set_updated_at();

drop trigger if exists set_orders_updated_at on orders;
create trigger set_orders_updated_at
before update on orders
for each row execute function set_updated_at();

drop trigger if exists set_payments_updated_at on payments;
create trigger set_payments_updated_at
before update on payments
for each row execute function set_updated_at();

create index if not exists idx_categories_active_slug on categories (is_active, slug);
create index if not exists idx_products_category_id on products (category_id);
create index if not exists idx_products_active_featured_created_at on products (is_active, is_featured, created_at desc);
create index if not exists idx_products_active_created_at on products (is_active, created_at desc);
create index if not exists idx_product_images_product_sort on product_images (product_id, sort_order);
create index if not exists idx_orders_customer_phone_created_at on orders (customer_phone, created_at desc);
create index if not exists idx_orders_order_status_created_at on orders (order_status, created_at desc);
create index if not exists idx_orders_payment_status_created_at on orders (payment_status, created_at desc);
create index if not exists idx_order_items_order_id on order_items (order_id);
create index if not exists idx_order_items_product_id on order_items (product_id);
create index if not exists idx_payments_order_id on payments (order_id);
create index if not exists idx_payments_status_created_at on payments (payment_status, created_at desc);
create index if not exists idx_payment_events_payment_created_at on payment_events (payment_id, created_at desc);
