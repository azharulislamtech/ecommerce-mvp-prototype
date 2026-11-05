-- V13 postcheck — READ ONLY. Run in the Supabase SQL editor AFTER V13 committed.
-- It changes nothing (it does not call the function). Every row should show ok = true.
-- See docs/db/V13-contract.md.

with fn as (
  select p.oid, p.prosecdef, p.proconfig
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'run_data_retention'
    and pg_get_function_identity_arguments(p.oid) = 'p_trigger text, p_now timestamp with time zone'
),
checks(check_name, ok, detail) as (
  select '01 function exists', exists (select 1 from fn), 'run_data_retention(text, timestamptz)'
  union all
  select '02 security definer with fixed search_path',
         coalesce((select prosecdef and proconfig @> array['search_path=public'] from fn), false),
         'security definer, search_path=public'
  union all
  select '03 only service_role may run it',
         coalesce((select has_function_privilege('service_role', oid, 'EXECUTE')
                     and not has_function_privilege('anon', oid, 'EXECUTE')
                     and not has_function_privilege('authenticated', oid, 'EXECUTE') from fn), false),
         'anon and authenticated cannot execute'
  union all
  select '04 run log exists with RLS',
         coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.data_retention_runs')), false),
         'data_retention_runs, row level security on'
  union all
  select '05 run log closed to the public',
         to_regclass('public.data_retention_runs') is not null
         and not has_table_privilege('anon', 'public.data_retention_runs', 'SELECT')
         and not has_table_privilege('authenticated', 'public.data_retention_runs', 'INSERT')
         and not has_table_privilege('authenticated', 'public.data_retention_runs', 'DELETE'),
         'anon cannot read; nobody but the function writes'
  union all
  select '06 admin read policy present',
         exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'data_retention_runs'
                   and policyname = 'Admins can read data retention runs'),
         'admins see the run history'
)
select check_name, ok, detail from checks order by check_name;
