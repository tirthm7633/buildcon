-- "Sales executive" (assigned_to) held any staff member, manually chosen
-- on the Add Walk-in form. It's retired in favor of two ideas: who
-- actually logged the walk-in (already tracked automatically by
-- created_by — surfaced in the UI as "Made by", never editable) and who a
-- Head or Manager attended to it ("Attended by"), tracked here. This
-- renames the column rather than adding a new one — it's the same "who's
-- responsible" slot, just redefined to hold a Head/Manager instead of a
-- Staff member.

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'walk_ins' and column_name = 'assigned_to'
  ) then
    alter table walk_ins rename column assigned_to to attended_by;
  end if;
end $$;

-- walk_ins_select's second OR-branch let a Staff member with
-- walk_ins.data_scope "own" see a walk-in they weren't assigned_to as the
-- salesperson. Now that this column can only ever hold a Head/Manager id,
-- that branch can never be true for a Staff session — Head/Manager
-- already pass via can_see_all_walkins regardless of this column.
-- Dropping it rather than leaving a clause that no longer does anything.
drop policy if exists "walk_ins_select" on walk_ins;
create policy "walk_ins_select" on walk_ins for select using (
  has_floor_access(floor_id)
  and (can_see_all_walkins(floor_id) or created_by = auth.uid())
);
