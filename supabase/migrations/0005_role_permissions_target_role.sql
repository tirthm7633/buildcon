-- Generalizes 0003's staff-only page gating into a fully generic, per-floor,
-- per-role, per-feature toggle system covering every sidebar page for
-- Staff, Manager, and (later, if needed) Head — driven entirely by
-- permission_key values the app writes; no schema change needed to add a
-- newly gated feature, just a new key.
--
-- The one thing that does need to change here: role_permissions_write
-- previously only checked the floor, not which role's row was being
-- written. Now that the app can write rows for 'manager' (and, for Owner,
-- 'head') as well as 'staff', a Head editing permissions could previously
-- have written a role = 'head' row for themselves via a raw API call —
-- can_manage_permissions() had no way to see the target role. This adds a
-- two-argument overload that does, and repoints the policy at it: Owner may
-- target any role, Head may only target Manager or Staff (never Head).

drop policy if exists "role_permissions_write" on role_permissions;

create or replace function can_manage_permissions(p_floor_id text, p_target_role user_role)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select is_owner() or (is_head_of_floor(p_floor_id) and p_target_role in ('manager', 'staff'));
$$;

create policy "role_permissions_write" on role_permissions for all
  using (can_manage_permissions(floor_id, role))
  with check (can_manage_permissions(floor_id, role));

-- Superseded by the two-argument overload above — nothing references it now.
drop function if exists can_manage_permissions(text);
