-- Forward correction: remove all automatic privileges, including TRUNCATE,
-- REFERENCES, TRIGGER, MAINTAIN and sequence UPDATE left by DML-only revokes.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on functions from anon, authenticated, service_role, public;
-- Schema-scoped revokes cannot undo the built-in global PUBLIC function grant.
-- New functions owned by the migration role now require explicit grants.
alter default privileges for role postgres revoke execute on functions from public;
