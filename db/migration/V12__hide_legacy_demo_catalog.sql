-- V12 — hide the legacy demo catalog (R1.8). DATA ONLY: no schema change to existing tables.
-- Contract and run order: docs/db/V12-contract.md. Run inside begin/commit with
-- `set local lock_timeout = '5s'`, after db/checks/V12-precheck.sql, then V12-postcheck.sql.
--
-- What it does:
--   1. The five legacy demo categories (electronics, fashion, home-living, beauty, accessories),
--      only where they are still legacy (no section, no parent), are hidden (is_active = false).
--      Nothing is deleted: old orders keep their product and category links.
--   2. Products in those categories that were NEVER stocked (first_stocked_at IS NULL) and are
--      'available' are hidden. A real product that was ever in stock is never touched.
--   3. Every row it switches off is recorded in v12_catalog_cutover_log, so the rollback
--      (db/rollback/V12-rollback.sql) restores exactly what V12 changed and nothing else.
-- It does not move any product into the new sections and does not activate the new
-- categories; those stay owner decisions in the admin.
-- Idempotent: a second run finds nothing left to change and logs nothing new.

create table if not exists v12_catalog_cutover_log (
  table_name text not null check (table_name in ('categories', 'products')),
  row_id uuid not null,
  previous_is_active boolean not null,
  changed_at timestamptz not null default now(),
  primary key (table_name, row_id)
);

-- Internal bookkeeping only: no API role may read or write it.
alter table v12_catalog_cutover_log enable row level security;
revoke all on table v12_catalog_cutover_log from public, anon, authenticated;

with legacy as (
  select id
  from categories
  where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories')
    and section is null
    and parent_id is null
    and is_active
)
insert into v12_catalog_cutover_log (table_name, row_id, previous_is_active)
select 'categories', id, true from legacy
on conflict (table_name, row_id) do nothing;

with legacy_categories as (
  select id
  from categories
  where slug in ('electronics', 'fashion', 'home-living', 'beauty', 'accessories')
    and section is null
    and parent_id is null
),
dummy as (
  select p.id
  from products p
  where p.category_id in (select id from legacy_categories)
    and p.first_stocked_at is null
    and p.availability = 'available'
    and p.is_active
)
insert into v12_catalog_cutover_log (table_name, row_id, previous_is_active)
select 'products', id, true from dummy
on conflict (table_name, row_id) do nothing;

update categories c
set is_active = false
from v12_catalog_cutover_log l
where l.table_name = 'categories' and l.row_id = c.id and c.is_active;

update products p
set is_active = false
from v12_catalog_cutover_log l
where l.table_name = 'products' and l.row_id = p.id and p.is_active;
