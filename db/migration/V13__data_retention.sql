-- V13 — automatic data deletion (R9.2), following the privacy policy (R2.7) and the data map
-- in docs/website-redesign-plan.md (R9.2). Adds one function and one log table; changes no
-- existing table's shape. Contract and run order: docs/db/V13-contract.md.
--
-- run_data_retention(p_trigger, p_now) applies every rule once and records the counts:
--   interest_contacted   interest request contacted more than 30 days ago        -> delete row
--   interest_expired     interest request created more than 6 months ago         -> delete row
--   whatsapp_inactive    subscribed, not opted out, no response for 12 months    -> delete row
--                        (an opted-out row is the opt-out record and is kept)
--   checkout_requests    checkout replay copy older than 30 days                 -> delete row
--   orders_anonymized    order older than 2 years: name/address "[মুছে ফেলা]", note cleared,
--                        phone reduced to its last 3 digits; amounts and statuses untouched
--   orders_deleted       order older than 6 years: deleted with its items, payments,
--                        payment events, reviews and checkout copy (existing cascades)
-- It is safe to run any number of times; a second run on the same day changes nothing.
-- Only the service role may run it (the admin button and the scheduled job call it from
-- trusted server code after their own checks).

create table if not exists data_retention_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  run_trigger text not null check (run_trigger in ('admin', 'schedule')),
  results jsonb not null
);

create index if not exists idx_data_retention_runs_ran_at on data_retention_runs (ran_at desc);

alter table data_retention_runs enable row level security;
revoke all on table data_retention_runs from public, anon, authenticated;
grant select on table data_retention_runs to authenticated;

drop policy if exists "Admins can read data retention runs" on data_retention_runs;
create policy "Admins can read data retention runs"
on data_retention_runs
for select
to authenticated
using (is_admin());

create or replace function run_data_retention(p_trigger text, p_now timestamptz default now())
returns table (rule text, affected integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_interest_contacted integer;
  v_interest_expired integer;
  v_whatsapp integer;
  v_checkout integer;
  v_orders_deleted integer;
  v_orders_anonymized integer;
begin
  if p_trigger is null or p_trigger not in ('admin', 'schedule') then
    raise exception 'Invalid retention trigger.' using errcode = '22023';
  end if;
  if p_now is null or p_now > now() + interval '1 day' then
    raise exception 'Invalid retention time.' using errcode = '22023';
  end if;

  delete from interest_requests
  where contacted_at is not null and contacted_at < p_now - interval '30 days';
  get diagnostics v_interest_contacted = row_count;

  delete from interest_requests
  where created_at < p_now - interval '6 months';
  get diagnostics v_interest_expired = row_count;

  delete from whatsapp_subscribers
  where opted_out_at is null
    and coalesce(last_response_at, consent_at) < p_now - interval '12 months';
  get diagnostics v_whatsapp = row_count;

  delete from checkout_requests
  where created_at < p_now - interval '30 days';
  get diagnostics v_checkout = row_count;

  -- Six years first, so an order is not anonymized and then deleted in the same run.
  delete from orders
  where created_at < p_now - interval '6 years';
  get diagnostics v_orders_deleted = row_count;

  update orders
  set customer_name = '[মুছে ফেলা]',
      customer_address = '[মুছে ফেলা]',
      customer_note = null,
      customer_phone = '********' || right(regexp_replace(customer_phone, '\D', '', 'g'), 3)
  where created_at < p_now - interval '2 years'
    and customer_name is distinct from '[মুছে ফেলা]';
  get diagnostics v_orders_anonymized = row_count;

  insert into data_retention_runs (ran_at, run_trigger, results)
  values (now(), p_trigger, jsonb_build_object(
    'interest_contacted', v_interest_contacted,
    'interest_expired', v_interest_expired,
    'whatsapp_inactive', v_whatsapp,
    'checkout_requests', v_checkout,
    'orders_deleted', v_orders_deleted,
    'orders_anonymized', v_orders_anonymized,
    'as_of', p_now
  ));

  return query values
    ('interest_contacted', v_interest_contacted),
    ('interest_expired', v_interest_expired),
    ('whatsapp_inactive', v_whatsapp),
    ('checkout_requests', v_checkout),
    ('orders_deleted', v_orders_deleted),
    ('orders_anonymized', v_orders_anonymized);
end;
$$;

revoke all on function run_data_retention(text, timestamptz) from public, anon, authenticated;
grant execute on function run_data_retention(text, timestamptz) to service_role;
