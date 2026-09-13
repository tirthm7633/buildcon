-- handle_new_user() (0001_init.sql) still falls back to the retired
-- 'sales_executive' enum label for the profiles row it creates on every new
-- auth.users signup. 0003 renamed that label to 'staff', but never touched
-- this function — so the trigger has been silently broken since then,
-- surfacing as a generic "Database error creating new user" from the Auth
-- API on every signup/admin-createUser call (Postgres resolves a COALESCE
-- branch's type at parse time, so the invalid literal breaks the whole
-- statement even on the branch that would supply an explicit role and
-- never actually reach the fallback).

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'staff')
  );
  return new;
end;
$$;
