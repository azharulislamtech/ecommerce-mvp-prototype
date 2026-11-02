-- V11 postcheck — READ ONLY. Run in the Supabase SQL editor AFTER V11 committed.
-- It changes nothing. Every row should show ok = true. See docs/db/V11-contract.md.

with
fn as (
  select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
),
f(name, oid) as (
  select proname, oid from fn where proname in (
    'storefront_state', 'is_valid_tag_list', 'get_unavailable_product',
    'normalize_bd_mobile', 'submit_product_interest', 'subscribe_whatsapp_updates',
    'create_checkout_order', 'create_checkout_order_internal')
),
checks(check_name, ok, detail) as (
  select '01 category columns',
         (select count(*) from information_schema.columns where table_schema = 'public'
            and table_name = 'categories' and column_name in ('parent_id', 'section')) = 2, 'parent_id, section'
  union all
  select '02 product columns',
         (select count(*) from information_schema.columns where table_schema = 'public'
            and table_name = 'products' and column_name in ('availability', 'estimated_price', 'first_stocked_at',
              'age_min_months', 'age_max_months', 'problem_tags', 'learning_goals', 'video_url')) = 8, '8 columns'
  union all
  select '03 new tables',
         to_regclass('public.interest_requests') is not null and to_regclass('public.whatsapp_subscribers') is not null,
         'interest_requests, whatsapp_subscribers'
  union all
  select '04 RLS on new tables',
         (select bool_and(relrowsecurity) from pg_class
          where oid in (to_regclass('public.interest_requests'), to_regclass('public.whatsapp_subscribers'))), 'enabled'
  union all
  select '05 triggers',
         (select count(*) from pg_trigger where not tgisinternal and tgname in (
            'enforce_category_hierarchy', 'guard_coming_soon_stock', 'track_product_stock_state',
            'guard_whatsapp_resubscribe')) = 4, '4 triggers'
  union all
  select '06 functions', (select count(*) from f) = 8, (select count(*) from f) || ' of 8'
  union all
  select '07 six new categories, all inactive, two levels',
         (select count(*) from categories where slug in ('kids-baby', 'kids-education', 'home-solutions',
            'home-kitchen', 'home-cleaning', 'home-organizing') and not is_active and section is not null) = 6
         and (select count(*) from categories where parent_id is not null) = 4,
         'inactive=' || (select count(*) from categories where slug in ('kids-baby', 'kids-education', 'home-solutions',
            'home-kitchen', 'home-cleaning', 'home-organizing') and not is_active)
  union all
  select '08 old categories untouched',
         (select count(*) from categories where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories')
            and section is null and parent_id is null) = 5, 'section and parent NULL'
  union all
  select '09 products unchanged for customers',
         (select count(*) from products where availability <> 'available' or first_stocked_at is not null) = 0
         and (select count(*) from products where is_active) = 0,
         'all available, no first_stocked_at, still 0 active'
  union all
  select '10 table grants: anon none',
         not has_table_privilege('anon', 'public.interest_requests', 'SELECT')
         and not has_table_privilege('anon', 'public.whatsapp_subscribers', 'SELECT')
         and not has_table_privilege('anon', 'public.interest_requests', 'INSERT')
         and not has_table_privilege('anon', 'public.whatsapp_subscribers', 'INSERT'), 'anon cannot read or write'
  union all
  select '11 table grants: authenticated via admin policy, no insert',
         has_table_privilege('authenticated', 'public.interest_requests', 'SELECT')
         and has_table_privilege('authenticated', 'public.whatsapp_subscribers', 'UPDATE')
         and not has_table_privilege('authenticated', 'public.interest_requests', 'INSERT')
         and not has_table_privilege('authenticated', 'public.whatsapp_subscribers', 'INSERT'),
         'select/update/delete only; rows filtered by is_admin()'
  union all
  select '12 service-only RPCs',
         (select bool_and(has_function_privilege('service_role', oid, 'EXECUTE')
                          and not has_function_privilege('anon', oid, 'EXECUTE')
                          and not has_function_privilege('authenticated', oid, 'EXECUTE'))
          from f where name in ('normalize_bd_mobile', 'submit_product_interest', 'subscribe_whatsapp_updates',
                                'create_checkout_order')), 'service_role only'
  union all
  select '13 open read helpers',
         (select bool_and(has_function_privilege('anon', oid, 'EXECUTE')
                          and has_function_privilege('authenticated', oid, 'EXECUTE'))
          from f where name in ('storefront_state', 'is_valid_tag_list', 'get_unavailable_product')), 'anon and authenticated'
  union all
  select '14 internal checkout closed',
         (select bool_and(not has_function_privilege('service_role', oid, 'EXECUTE')
                          and not has_function_privilege('anon', oid, 'EXECUTE')
                          and not has_function_privilege('authenticated', oid, 'EXECUTE'))
          from f where name = 'create_checkout_order_internal'), 'no API role'
  union all
  select '15 dummy products stay unavailable',
         not exists (select 1 from products p, lateral get_unavailable_product(p.slug) x), 'lookup returns nothing for the 9'
)
select check_name, ok, detail from checks order by check_name;
