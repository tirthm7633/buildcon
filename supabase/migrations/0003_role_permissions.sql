-- Role model change: owner/floor_manager/sales_executive/accountant/viewer
-- becomes a 4-tier hierarchy — owner/head/manager/staff.
--
-- This file must be run — and committed — on its own, as its own script
-- submission, before 0004_role_permissions_tables.sql. Postgres refuses to
-- let a value just added to an enum (`head`, below) be *used* anywhere
-- (e.g. in a function body) inside the same transaction it was added in:
--   ERROR: 55P04: unsafe use of new value "head" of enum type user_role
--   HINT: New enum values must be committed before they can be used.
-- 0004 creates a function that does `is_role('head')`, so the ADD VALUE
-- here has to have already committed by the time that runs. Pasting both
-- files as one script puts them in the same transaction and hits this
-- error; running them as two separate "Run" clicks in the SQL Editor does
-- not, since each submission is its own transaction.

-- accountant/viewer no longer exist as roles — fold any existing rows into
-- staff (still named sales_executive at this point in the migration); their
-- prior capabilities become permission toggles instead.
--
-- Every step below is guarded by checking pg_enum directly rather than
-- catching an exception on failure — ALTER TYPE ... RENAME VALUE has no
-- IF EXISTS clause, and an earlier version of this file tried to catch the
-- "old label doesn't exist" case with `exception when undefined_object`,
-- which is the wrong SQLSTATE (Postgres actually raises 22023
-- invalid_parameter_value here, not 42704 undefined_object) — so it never
-- caught anything and broke re-runs after the first successful one.
-- Checking pg_enum up front sidesteps needing to know the exact error code.
do $$ begin
  if exists (
    select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'sales_executive'
  ) then
    update profiles set role = 'sales_executive' where role in ('accountant', 'viewer');
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'floor_manager'
  ) then
    alter type user_role rename value 'floor_manager' to 'manager';
  end if;
end $$;

do $$ begin
  if exists (
    select 1 from pg_catalog.pg_enum e join pg_catalog.pg_type t on t.oid = e.enumtypid
    where t.typname = 'user_role' and e.enumlabel = 'sales_executive'
  ) then
    alter type user_role rename value 'sales_executive' to 'staff';
  end if;
end $$;

-- ADD VALUE cannot run inside a DO block/function (a hard Postgres
-- restriction, unlike RENAME VALUE above) — IF NOT EXISTS alone keeps this
-- safe to re-run.
alter type user_role add value if not exists 'head';

alter table profiles alter column role set default 'staff';
