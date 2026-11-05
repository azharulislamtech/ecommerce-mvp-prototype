-- V13 rollback — removes the retention function and its run log. Rows that V13 already
-- deleted or anonymized cannot come back from here; restore them from the backup taken
-- before V13 if ever needed (docs/db/V13-contract.md). Safe to run twice.

drop function if exists run_data_retention(text, timestamptz);
drop table if exists data_retention_runs;
