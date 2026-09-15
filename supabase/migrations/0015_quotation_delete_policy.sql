-- Every other _delete policy in this schema (walk_ins, customers, ...) is
-- owner-only. Quotations is a deliberate exception: Owner/Head/Manager can
-- all clear out a quotation that's no longer needed, Staff cannot — matching
-- payments_insert's existing "can write this floor, but not Staff" shape
-- rather than the stricter owner-only default.
drop policy if exists "quotations_delete" on quotations;
create policy "quotations_delete" on quotations for delete using (
  can_write_floor(floor_id) and not exists (
    select 1 from profiles where id = auth.uid() and role = 'staff'
  )
);
