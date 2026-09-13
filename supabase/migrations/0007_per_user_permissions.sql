-- Moves per-floor feature permissions from role-keyed (role_permissions) to
-- person-keyed (user_permissions), so two people sharing a role on the same
-- floor can have different access — Owner and Head can now differentiate
-- individuals, not just roles. Floor access (user_floor_access) needed no
-- schema change — it was already a plain per-person grant table — but its
-- write policy did: Head becomes a legitimate granter for the first time,
-- gated by the same "is Head of THIS floor" boundary used everywhere else,
-- which (because it's evaluated against the floor being touched) also
-- naturally stops a Head from reaching a floor outside their own.

-- ============================================================================
-- 1. user_permissions table
-- ============================================================================

create table if not exists user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  floor_id text not null references floors (id) on delete cascade,
  permission_key text not null,
  value jsonb not null default 'true',
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (user_id, floor_id, permission_key)
);

create index if not exists user_permissions_lookup_idx on user_permissions (user_id, floor_id, permission_key);

drop trigger if exists user_permissions_set_updated_at on user_permissions;
create trigger user_permissions_set_updated_at before update on user_permissions
  for each row execute function set_updated_at();

alter table user_permissions enable row level security;

-- ============================================================================
-- 2. Helper functions
-- ============================================================================

-- Owner manages anyone. Head manages a Staff or Manager on a floor the
-- Head themselves has access to — is_head_of_floor(p_floor_id) is already
-- "am I Head of exactly this floor", so this can't be satisfied for a
-- floor outside the Head's own reach. Used for both user_permissions
-- writes and user_floor_access writes (granting the floor itself).
create or replace function can_manage_user_permissions(p_floor_id text, p_target_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select is_owner() or (
    is_head_of_floor(p_floor_id)
    and exists (select 1 from profiles where id = p_target_user_id and role in ('manager', 'staff'))
  );
$$;

create or replace function get_user_permission(p_user_id uuid, p_floor_id text, p_key text, p_default jsonb)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select value from user_permissions
      where user_id = p_user_id and floor_id = p_floor_id and permission_key = p_key),
    p_default
  );
$$;

-- Reads the signed-in user's OWN row now, not their role's shared row.
create or replace function can_see_all_walkins(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select not is_role('staff')
    or get_user_permission(auth.uid(), p_floor_id, 'walk_ins.data_scope', '"all"'::jsonb) = '"all"'::jsonb;
$$;

-- ============================================================================
-- 3. RLS
-- ============================================================================

drop policy if exists "user_permissions_select" on user_permissions;
create policy "user_permissions_select" on user_permissions for select using (has_floor_access(floor_id));

drop policy if exists "user_permissions_write" on user_permissions;
create policy "user_permissions_write" on user_permissions for all
  using (can_manage_user_permissions(floor_id, user_id))
  with check (can_manage_user_permissions(floor_id, user_id));

-- Was owner-only; Head can now also grant/revoke floor access itself.
drop policy if exists "user_floor_access_write" on user_floor_access;
create policy "user_floor_access_write" on user_floor_access for all
  using (can_manage_user_permissions(floor_id, user_id))
  with check (can_manage_user_permissions(floor_id, user_id));

-- ============================================================================
-- 4. Migrate existing role-level overrides to every person currently
--    holding that role on that floor, so nobody's actual access changes
--    the moment this runs — a no-op today (role_permissions is empty going
--    into this), but correct regardless of what's actually in the table.
-- ============================================================================

insert into user_permissions (user_id, floor_id, permission_key, value)
select p.id, rp.floor_id, rp.permission_key, rp.value
from role_permissions rp
join profiles p on p.role = rp.role
join user_floor_access ufa on ufa.user_id = p.id and ufa.floor_id = rp.floor_id
on conflict (user_id, floor_id, permission_key) do nothing;

-- ============================================================================
-- 5. Clean cutover — nothing references role_permissions after this point.
-- ============================================================================

drop policy if exists "role_permissions_select" on role_permissions;
drop policy if exists "role_permissions_write" on role_permissions;
drop trigger if exists role_permissions_set_updated_at on role_permissions;
drop table if exists role_permissions;
drop function if exists can_manage_permissions(text, user_role);
drop function if exists get_permission(text, user_role, text, jsonb);
