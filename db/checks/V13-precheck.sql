-- V13 precheck — READ ONLY. Run in the Supabase SQL editor BEFORE V13.
-- It changes nothing. Every row should show ok = true; stop and ask if any is false.
-- Row 06 shows what the first retention run would change today (ok is always true).
-- See docs/db/V13-contract.md.

with checks(check_name, ok, detail) as (
  select '01 who and where', true,
         'user=' || current_user || ' db=' || current_database() || ' schema=' || current_schema()
  union all
  select '02 schema is public', current_schema() = 'public', current_schema()
  union all
  select '03 V11 tables exist',
         to_regclass('public.interest_requests') is not null and to_regclass('public.whatsapp_subscribers') is not null,
         'interest_requests, whatsapp_subscribers'
  union all
  select '04 V9 checkout copy exists', to_regclass('public.checkout_requests') is not null, 'checkout_requests'
  union all
  select '05 V13 not applied yet',
         to_regclass('public.data_retention_runs') is null
         and not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                         where n.nspname = 'public' and p.proname = 'run_data_retention'),
         'data_retention_runs and run_data_retention must not exist yet'
  union all
  select '06 info: first run would change', true,
         'interest_contacted=' || (select count(*) from interest_requests where contacted_at < now() - interval '30 days')
           || ' interest_expired=' || (select count(*) from interest_requests where created_at < now() - interval '6 months')
           || ' whatsapp_inactive=' || (select count(*) from whatsapp_subscribers where opted_out_at is null
                                          and coalesce(last_response_at, consent_at) < now() - interval '12 months')
           || ' checkout_requests=' || (select count(*) from checkout_requests where created_at < now() - interval '30 days')
           || ' orders_anonymized=' || (select count(*) from orders where created_at < now() - interval '2 years')
           || ' orders_deleted=' || (select count(*) from orders where created_at < now() - interval '6 years')
)
select check_name, ok, detail from checks order by check_name;
