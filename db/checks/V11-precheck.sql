-- V11 precheck — READ ONLY. Run in the Supabase SQL editor BEFORE V11.
-- It changes nothing. Every row should show ok = true; stop and ask if any is false.
-- See docs/db/V11-contract.md (run note).

with
fn as (
  select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args,
         pg_get_userbyid(p.proowner) as owner, p.prosecdef
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
),
checkout as (
  select * from fn where proname = 'create_checkout_order'
    and args = 'p_customer_name text, p_customer_phone text, p_customer_district text, p_customer_address text, p_customer_note text, p_payment_method text, p_items jsonb, p_idempotency_key uuid, p_request_key text'
),
checkout_internal as (
  select * from fn where proname = 'create_checkout_order_internal'
    and args = 'p_customer_name text, p_customer_phone text, p_customer_district text, p_customer_address text, p_customer_note text, p_payment_method text, p_items jsonb'
),
checks(check_name, ok, detail) as (
  select '01 who and where', true,
         'user=' || current_user || ' db=' || current_database() || ' schema=' || current_schema()
  union all
  select '02 schema is public', current_schema() = 'public', current_schema()
  union all
  select '03 no V11 columns on categories',
         not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'categories'
                       and column_name in ('parent_id', 'section')),
         'parent_id, section must not exist yet'
  union all
  select '04 no V11 columns on products',
         not exists (select 1 from information_schema.columns
                     where table_schema = 'public' and table_name = 'products'
                       and column_name in ('availability', 'estimated_price', 'first_stocked_at', 'age_min_months',
                                           'age_max_months', 'problem_tags', 'learning_goals', 'video_url')),
         'availability, first_stocked_at, tags, age, video_url must not exist yet'
  union all
  select '05 new tables absent',
         to_regclass('public.interest_requests') is null and to_regclass('public.whatsapp_subscribers') is null,
         'interest_requests, whatsapp_subscribers must not exist yet'
  union all
  select '06 no V11 functions',
         not exists (select 1 from fn where proname in (
           'enforce_category_hierarchy', 'guard_coming_soon_stock', 'track_product_stock_state', 'storefront_state',
           'is_valid_tag_list', 'normalize_bd_mobile', 'submit_product_interest', 'guard_whatsapp_resubscribe',
           'subscribe_whatsapp_updates', 'get_unavailable_product')),
         'none of the V11 function names may exist yet'
  union all
  select '07 no V11 triggers',
         not exists (select 1 from pg_trigger t join pg_class c on c.oid = t.tgrelid
                     join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
                     where not t.tgisinternal and t.tgname in (
                       'enforce_category_hierarchy', 'guard_coming_soon_stock', 'track_product_stock_state',
                       'guard_whatsapp_resubscribe')),
         'none of the V11 trigger names may exist yet'
  union all
  select '08 V9 checkout wrapper present', exists (select 1 from checkout),
         coalesce((select 'owner=' || owner || ' security_definer=' || prosecdef from checkout), 'MISSING')
  union all
  select '09 V9 checkout wrapper grants',
         coalesce((select has_function_privilege('service_role', oid, 'EXECUTE')
                     and not has_function_privilege('anon', oid, 'EXECUTE')
                     and not has_function_privilege('authenticated', oid, 'EXECUTE')
                   from checkout), false),
         'service_role yes; anon and authenticated no'
  union all
  select '10 V9 internal checkout present', exists (select 1 from checkout_internal),
         coalesce((select 'owner=' || owner || ' security_definer=' || prosecdef from checkout_internal), 'MISSING')
  union all
  select '11 V9 internal checkout closed',
         coalesce((select not has_function_privilege('service_role', oid, 'EXECUTE')
                     and not has_function_privilege('anon', oid, 'EXECUTE')
                     and not has_function_privilege('authenticated', oid, 'EXECUTE')
                   from checkout_internal), false),
         'no API role may execute it'
  union all
  select '12 same owner for both checkout functions',
         (select owner from checkout) = (select owner from checkout_internal),
         coalesce((select owner from checkout), '?') || ' / ' || coalesce((select owner from checkout_internal), '?')
  union all
  select '13 no long-running transactions',
         not exists (select 1 from pg_stat_activity
                     where pid <> pg_backend_pid() and xact_start is not null
                       and xact_start < now() - interval '1 minute' and state <> 'idle'),
         coalesce((select string_agg(pid || ':' || coalesce(state, '?') || ':' || (now() - xact_start)::text, ', ')
                   from pg_stat_activity
                   where pid <> pg_backend_pid() and xact_start is not null
                     and xact_start < now() - interval '1 minute' and state <> 'idle'), 'none')
  union all
  select '14 no active products (all legacy rows are dummy)',
         (select count(*) from products where is_active) = 0,
         'total=' || (select count(*) from products) || ' active=' || (select count(*) from products where is_active)
           || ' (production on 2026-11-02: total=10)'
  union all
  select '15 the five old categories',
         (select count(*) from categories
          where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories')) = 5,
         'old=' || (select count(*) from categories
                    where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories'))
           || ' total=' || (select count(*) from categories)
  union all
  select '16 seed slugs free',
         not exists (select 1 from categories where slug in
           ('kids-baby', 'kids-education', 'home-solutions', 'home-kitchen', 'home-cleaning', 'home-organizing')),
         'the six V11 category slugs must not exist yet'
)
select check_name, ok, detail from checks order by check_name;
