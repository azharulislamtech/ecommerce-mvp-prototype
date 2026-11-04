-- V12 precheck — READ ONLY. Run in the Supabase SQL editor BEFORE V12.
-- It changes nothing. Every row should show ok = true; stop and ask if any is false.
-- Rows 09 and 10 are information for the decision log (ok is always true).
-- See docs/db/V12-contract.md.

with
legacy as (
  select * from categories
  where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories')
),
legacy_products as (
  select p.* from products p where p.category_id in (select id from legacy)
),
checks(check_name, ok, detail) as (
  select '01 who and where', true,
         'user=' || current_user || ' db=' || current_database() || ' schema=' || current_schema()
  union all
  select '02 schema is public', current_schema() = 'public', current_schema()
  union all
  select '03 V11 is applied',
         exists (select 1 from information_schema.columns where table_schema = 'public'
                   and table_name = 'categories' and column_name = 'section')
         and exists (select 1 from information_schema.columns where table_schema = 'public'
                   and table_name = 'products' and column_name = 'first_stocked_at'),
         'categories.section and products.first_stocked_at must exist'
  union all
  select '04 V12 not applied yet', to_regclass('public.v12_catalog_cutover_log') is null,
         'v12_catalog_cutover_log must not exist yet'
  union all
  select '05 five legacy categories exist', (select count(*) from legacy) = 5,
         'found=' || (select count(*) from legacy)
  union all
  select '06 legacy categories are still legacy',
         not exists (select 1 from legacy where section is not null or parent_id is not null),
         'no section, no parent'
  union all
  select '07 every legacy product is a never-stocked dummy',
         not exists (select 1 from legacy_products where first_stocked_at is not null),
         'products with first_stocked_at in old categories=' ||
           (select count(*) from legacy_products where first_stocked_at is not null) ||
           ' (must be 0; a real product there needs a decision first)'
  union all
  select '08 six launch categories exist',
         (select count(*) from categories where slug in
           ('kids-baby', 'kids-education', 'home-solutions', 'home-kitchen', 'home-cleaning', 'home-organizing')) = 6,
         'V11 seed categories'
  union all
  select '09 info: what V12 will switch off', true,
         'active legacy categories=' || (select count(*) from legacy where is_active)
           || ', active never-stocked legacy products='
           || (select count(*) from legacy_products where is_active and first_stocked_at is null and availability = 'available')
           || ', all legacy products=' || (select count(*) from legacy_products)
  union all
  select '10 info: old orders that reference legacy products', true,
         'order_items=' || (select count(*) from order_items where product_id in (select id from legacy_products))
           || ' (kept; V12 deletes nothing)'
)
select check_name, ok, detail from checks order by check_name;
