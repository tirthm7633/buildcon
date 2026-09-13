-- Continues 0003_role_permissions.sql — run that one first and let it
-- commit (its own "Run" click) before this one. See the comment at the top
-- of 0003 for why: this file's is_head_of_floor() function uses the 'head'
-- enum value 0003 adds, which Postgres won't allow inside the same
-- transaction as the ADD VALUE itself.
--
-- Head is scoped per floor (every floor has its own Head), same as Manager.

-- ============================================================================
-- 1. New walk-in fields
-- ============================================================================

alter table walk_ins add column if not exists city text;
alter table walk_ins add column if not exists alternate_phone text;
alter table walk_ins add column if not exists pincode text;
alter table walk_ins add column if not exists referred_by text;

-- ============================================================================
-- 2. role_permissions — per-floor, per-role, per-feature toggles
-- ============================================================================

-- One row per overridden toggle. A missing row means "use the coded
-- default" (enabled for page keys, "all" for walk_ins.data_scope) — new
-- floors and new feature keys never need seeding.
create table if not exists role_permissions (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id) on delete cascade,
  role user_role not null,
  permission_key text not null,
  value jsonb not null default 'true',
  updated_by uuid references profiles (id) on delete set null,
  updated_at timestamptz not null default now(),
  unique (floor_id, role, permission_key)
);

create index if not exists role_permissions_lookup_idx on role_permissions (floor_id, role, permission_key);

drop trigger if exists role_permissions_set_updated_at on role_permissions;
create trigger role_permissions_set_updated_at before update on role_permissions
  for each row execute function set_updated_at();

alter table role_permissions enable row level security;

-- ============================================================================
-- 3. Helper functions
-- ============================================================================

create or replace function is_role(p_role user_role)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = p_role);
$$;

-- Head manages their own floor's staff permissions; Owner manages any floor.
create or replace function is_head_of_floor(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select is_role('head') and has_floor_access(p_floor_id);
$$;

create or replace function can_manage_permissions(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select is_owner() or is_head_of_floor(p_floor_id);
$$;

create or replace function get_permission(p_floor_id text, p_role user_role, p_key text, p_default jsonb)
returns jsonb
language sql
security definer set search_path = public
stable
as $$
  select coalesce(
    (select value from role_permissions
      where floor_id = p_floor_id and role = p_role and permission_key = p_key),
    p_default
  );
$$;

-- Managers/Head/Owner always see every walk-in; Staff see all unless the
-- floor's Head/Owner has switched walk_ins.data_scope to "own".
create or replace function can_see_all_walkins(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select not is_role('staff')
    or get_permission(p_floor_id, 'staff', 'walk_ins.data_scope', '"all"'::jsonb) = '"all"'::jsonb;
$$;

-- can_write_floor() previously also blocked the retired 'viewer' role;
-- read-only style restriction is now expressed through role_permissions.
create or replace function can_write_floor(p_floor_id text)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select has_floor_access(p_floor_id);
$$;

-- ============================================================================
-- 4. RLS for role_permissions
-- ============================================================================

drop policy if exists "role_permissions_select" on role_permissions;
create policy "role_permissions_select" on role_permissions for select using (has_floor_access(floor_id));

drop policy if exists "role_permissions_write" on role_permissions;
create policy "role_permissions_write" on role_permissions for all
  using (can_manage_permissions(floor_id))
  with check (can_manage_permissions(floor_id));

-- ============================================================================
-- 5. Walk-ins: row visibility now respects walk_ins.data_scope
-- ============================================================================

drop policy if exists "walk_ins_select" on walk_ins;
create policy "walk_ins_select" on walk_ins for select using (
  has_floor_access(floor_id)
  and (can_see_all_walkins(floor_id) or created_by = auth.uid() or assigned_to = auth.uid())
);

-- ============================================================================
-- 6. Fix role-name references left over from the old enum
-- ============================================================================

drop policy if exists "payments_insert" on payments;
create policy "payments_insert" on payments for insert with check (
  can_write_floor(floor_id)
  and not exists (select 1 from profiles where id = auth.uid() and role = 'staff')
);

drop policy if exists "payments_update" on payments;
create policy "payments_update" on payments for update using (is_owner());
