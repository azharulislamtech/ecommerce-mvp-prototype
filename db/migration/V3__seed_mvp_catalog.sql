-- Baseline MVP catalog data.
-- This is versioned so a clean Supabase project can reproduce the current storefront catalog.
-- Future day-to-day product changes should go through admin product management, not ad-hoc SQL.
insert into categories (name, slug, description, image_url, is_active)
values
  ('Electronics', 'electronics', 'Smart everyday gadgets', null, true),
  ('Fashion', 'fashion', 'Minimal wear and bags', null, true),
  ('Home & Living', 'home-living', 'Useful pieces for home', null, true),
  ('Beauty', 'beauty', 'Daily care essentials', null, true),
  ('Accessories', 'accessories', 'Simple upgrades', null, true)
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  image_url = excluded.image_url,
  is_active = excluded.is_active,
  updated_at = now();

insert into products (
  category_id,
  name,
  slug,
  short_description,
  description,
  price,
  discount_price,
  stock_quantity,
  is_active,
  is_featured
)
values
  (
    (select id from categories where slug = 'electronics'),
    'Aurora Wireless Earbuds',
    'aurora-wireless-earbuds',
    'Clear calls, compact case, and all-day comfort.',
    'A lightweight audio essential for everyday calls, music, and travel. The compact charging case fits small bags and pockets.',
    4290,
    3490,
    18,
    true,
    true
  ),
  (
    (select id from categories where slug = 'fashion'),
    'Luna Everyday Handbag',
    'luna-everyday-handbag',
    'Structured profile with practical inner pockets.',
    'A clean everyday handbag with a structured silhouette, smooth finish, and enough space for daily essentials.',
    2990,
    2450,
    11,
    true,
    true
  ),
  (
    (select id from categories where slug = 'home-living'),
    'Calm Ceramic Diffuser',
    'calm-ceramic-diffuser',
    'Soft mist diffuser for bedrooms and work desks.',
    'A quiet ceramic diffuser with a clean shape and gentle ambient light for relaxing home corners.',
    1890,
    null,
    8,
    true,
    true
  ),
  (
    (select id from categories where slug = 'beauty'),
    'Pure Glow Serum',
    'pure-glow-serum',
    'Lightweight daily serum with a smooth finish.',
    'A quick-absorbing serum designed for a simple daily routine. The formula leaves a soft, non-sticky finish.',
    1590,
    1290,
    24,
    true,
    true
  ),
  (
    (select id from categories where slug = 'accessories'),
    'Orbit Smart Watch',
    'orbit-smart-watch',
    'Fitness, calls, and notifications in one clean watch.',
    'A modern smartwatch for tracking daily activity, checking calls, and keeping notifications visible.',
    4890,
    3990,
    6,
    true,
    false
  ),
  (
    (select id from categories where slug = 'home-living'),
    'Softline Cotton Throw',
    'softline-cotton-throw',
    'Breathable textured throw for sofas and beds.',
    'A soft cotton throw that adds warmth and texture without making the room feel busy.',
    1690,
    null,
    15,
    true,
    false
  )
on conflict (slug) do update
set
  category_id = excluded.category_id,
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  price = excluded.price,
  discount_price = excluded.discount_price,
  stock_quantity = excluded.stock_quantity,
  is_active = excluded.is_active,
  is_featured = excluded.is_featured,
  updated_at = now();

insert into product_images (product_id, image_url, alt_text, sort_order)
select products.id, '/hero-products.png', products.name, 0
from products
where products.slug in (
  'aurora-wireless-earbuds',
  'luna-everyday-handbag',
  'calm-ceramic-diffuser',
  'pure-glow-serum',
  'orbit-smart-watch',
  'softline-cotton-throw'
)
and not exists (
  select 1
  from product_images
  where product_images.product_id = products.id
    and product_images.sort_order = 0
);
