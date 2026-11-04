-- V12 rollback — restores exactly the rows V12 switched off, then removes its log table.
-- Run only if V12 must be undone, inside begin/commit, then run db/checks/V12-precheck.sql
-- (it should pass again). See docs/db/V12-contract.md.
--
-- It uses v12_catalog_cutover_log, so a product or category that was already inactive before
-- V12 (for example the dummy products the owner switched off in the admin) stays inactive.
-- If the log table is missing, V12 never ran (or was already rolled back) and this changes
-- nothing.

do $$
begin
  if to_regclass('public.v12_catalog_cutover_log') is null then
    raise notice 'V12 rollback: no v12_catalog_cutover_log table, nothing to restore';
    return;
  end if;

  update categories c
  set is_active = l.previous_is_active
  from v12_catalog_cutover_log l
  where l.table_name = 'categories' and l.row_id = c.id;

  update products p
  set is_active = l.previous_is_active
  from v12_catalog_cutover_log l
  where l.table_name = 'products' and l.row_id = p.id;

  drop table v12_catalog_cutover_log;
end;
$$;
