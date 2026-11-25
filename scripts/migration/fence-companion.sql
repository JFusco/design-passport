-- Run with psql -v ON_ERROR_STOP=1 as the source migration owner only after
-- stopping legacy CLI/web/worker processes. Retain the readable source.
BEGIN;
SET LOCAL lock_timeout = '35s';
SELECT pg_advisory_xact_lock(1146110801); -- waits for a bounded generation POST
SELECT pg_advisory_xact_lock(1146110800); -- legacy writer transaction lock
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA design_passport FROM design_passport_app;
DO $fence$
DECLARE t record;
BEGIN
  FOR t IN SELECT c.relname, string_agg(quote_ident(a.attname), ',' order by a.attnum) AS cols
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
      WHERE n.nspname='design_passport' AND c.relkind='r' GROUP BY c.relname
  LOOP
    EXECUTE format('REVOKE INSERT (%s), UPDATE (%s) ON design_passport.%I FROM design_passport_app',t.cols,t.cols,t.relname);
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE pg_has_role(r.oid,'design_passport_app','MEMBER') AND NOT r.rolsuper
        AND n.nspname='design_passport' AND c.relkind='r' AND
        (has_any_column_privilege(r.oid,c.oid,'INSERT,UPDATE') OR has_table_privilege(r.oid,c.oid,'DELETE,TRUNCATE'))) THEN
    RAISE EXCEPTION 'A legacy writer still has independent write grants. Inspect role membership and retry.';
  END IF;
END
$fence$;
COMMIT;
