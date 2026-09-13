-- Pre-existing gap surfaced while live-testing 0007: profiles_update_self_or_owner
-- (0001_init.sql) only ever allowed a row's own user or the Owner to UPDATE it.
-- updateStaffRole/setStaffActive (lib/actions/settings.ts) have let Manager call
-- them since before this session's changes, gated at the app layer only — with
-- no matching RLS grant, Manager's update silently matched zero rows (no error,
-- no effect), so the feature has likely never actually worked for Manager.
--
-- This brings the policy in line with what the app already intends: Owner may
-- update anyone; Manager may update anyone except an Owner (mirrors the
-- explicit target-role guard already in updateStaffRole/setStaffActive); a
-- person may always update their own row. WITH CHECK re-applies the same rule
-- to the row's new values, so Manager can't use an update to hand someone the
-- owner role either.

drop policy if exists "profiles_update_self_or_owner" on profiles;

create policy "profiles_update_self_or_owner" on profiles for update
  using (id = auth.uid() or is_owner() or (is_role('manager') and role <> 'owner'))
  with check (id = auth.uid() or is_owner() or (is_role('manager') and role <> 'owner'));
