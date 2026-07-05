create table if not exists admin_users (
  user_id uuid primary key,
  email text not null unique,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint admin_users_role_valid check (role in ('owner', 'admin')),
  constraint admin_users_email_not_blank check (length(trim(email)) > 0)
);

drop trigger if exists set_admin_users_updated_at on admin_users;
create trigger set_admin_users_updated_at
before update on admin_users
for each row execute function set_updated_at();

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users
    where user_id = auth.uid()
      and is_active = true
  );
$$;

create or replace function is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from admin_users
    where user_id = auth.uid()
      and role = 'owner'
      and is_active = true
  );
$$;

grant usage on schema public to anon, authenticated;
grant select on categories, products, product_images to anon, authenticated;
grant all on categories, products, product_images, orders, order_items, payments, payment_events, admin_users to authenticated;

alter table categories enable row level security;
alter table products enable row level security;
alter table product_images enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table admin_users enable row level security;

drop policy if exists "Public can read active categories" on categories;
create policy "Public can read active categories"
on categories
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage categories" on categories;
create policy "Admins can manage categories"
on categories
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Public can read active products" on products;
create policy "Public can read active products"
on products
for select
to anon, authenticated
using (is_active = true);

drop policy if exists "Admins can manage products" on products;
create policy "Admins can manage products"
on products
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Public can read active product images" on product_images;
create policy "Public can read active product images"
on product_images
for select
to anon, authenticated
using (
  exists (
    select 1
    from products
    where products.id = product_images.product_id
      and products.is_active = true
  )
);

drop policy if exists "Admins can manage product images" on product_images;
create policy "Admins can manage product images"
on product_images
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Admins can manage orders" on orders;
create policy "Admins can manage orders"
on orders
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Admins can manage order items" on order_items;
create policy "Admins can manage order items"
on order_items
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Admins can manage payments" on payments;
create policy "Admins can manage payments"
on payments
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Admins can manage payment events" on payment_events;
create policy "Admins can manage payment events"
on payment_events
for all
to authenticated
using (is_admin())
with check (is_admin());

drop policy if exists "Admins can read admin users" on admin_users;
create policy "Admins can read admin users"
on admin_users
for select
to authenticated
using (is_admin());

drop policy if exists "Owners can manage admin users" on admin_users;
create policy "Owners can manage admin users"
on admin_users
for all
to authenticated
using (is_owner())
with check (is_owner());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read product image files" on storage.objects;
create policy "Public can read product image files"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "Admins can upload product image files" on storage.objects;
create policy "Admins can upload product image files"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'product-images' and is_admin());

drop policy if exists "Admins can update product image files" on storage.objects;
create policy "Admins can update product image files"
on storage.objects
for update
to authenticated
using (bucket_id = 'product-images' and is_admin())
with check (bucket_id = 'product-images' and is_admin());

drop policy if exists "Admins can delete product image files" on storage.objects;
create policy "Admins can delete product image files"
on storage.objects
for delete
to authenticated
using (bucket_id = 'product-images' and is_admin());
