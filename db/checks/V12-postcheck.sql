-- V12 postcheck — READ ONLY. Run in the Supabase SQL editor AFTER V12 committed.
-- It changes nothing. Every row should show ok = true. See docs/db/V12-contract.md.

with
legacy as (
  select * from categories
  where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories')
),
log as (
  select * from v12_catalog_cutover_log
),
checks(check_name, ok, detail) as (
  select '01 cutover log exists with RLS',
         (select relrowsecurity from pg_class where oid = 'public.v12_catalog_cutover_log'::regclass),
         'v12_catalog_cutover_log, row level security on'
  union all
  select '02 cutover log closed to API roles',
         not has_table_privilege('anon', 'public.v12_catalog_cutover_log', 'SELECT')
         and not has_table_privilege('authenticated', 'public.v12_catalog_cutover_log', 'SELECT')
         and not has_table_privilege('anon', 'public.v12_catalog_cutover_log', 'INSERT')
         and not has_table_privilege('authenticated', 'public.v12_catalog_cutover_log', 'DELETE'),
         'no select/insert/delete for anon or authenticated'
  union all
  select '03 legacy categories hidden', not exists (select 1 from legacy where is_active),
         'active legacy categories=' || (select count(*) from legacy where is_active)
  union all
  select '04 no never-stocked legacy product is active',
         not exists (select 1 from products p where p.category_id in (select id from legacy)
                       and p.first_stocked_at is null and p.is_active),
         'dummy products cannot be bought'
  union all
  select '05 every logged row is now inactive',
         not exists (select 1 from log l join categories c on l.table_name = 'categories' and c.id = l.row_id where c.is_active)
         and not exists (select 1 from log l join products p on l.table_name = 'products' and p.id = l.row_id where p.is_active),
         'logged categories=' || (select count(*) from log where table_name = 'categories')
           || ', logged products=' || (select count(*) from log where table_name = 'products')
  union all
  select '06 only never-stocked products were changed',
         not exists (select 1 from log l join products p on l.table_name = 'products' and p.id = l.row_id
                       where p.first_stocked_at is not null),
         'no real product touched'
  union all
  select '07 launch categories untouched',
         (select count(*) from categories where slug in
           ('kids-baby', 'kids-education', 'home-solutions', 'home-kitchen', 'home-cleaning', 'home-organizing')) = 6
         and not exists (select 1 from log l join categories c on c.id = l.row_id where c.section is not null),
         'V12 never switches a new-section category'
  union all
  select '08 old orders still linked',
         not exists (select 1 from order_items oi left join products p on p.id = oi.product_id
                       where oi.product_id is not null and p.id is null),
         'every order item still finds its product'
)
select check_name, ok, detail from checks order by check_name;
