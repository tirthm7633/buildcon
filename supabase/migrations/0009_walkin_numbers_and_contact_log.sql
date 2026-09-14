-- Adds a human-readable reference number to walk_ins (every other entity —
-- quotations, orders, purchases, receipts — already has one; walk_ins never
-- got one). Contact logging (who called/messaged/visited a walk-in, and
-- when) needs no schema change at all — it's just a new `activities.action`
-- value ('contact_logged') written by the app, same table as every other
-- timeline entry.

create sequence if not exists walk_in_number_seq start 1;

create or replace function generate_walkin_number()
returns text
language sql
as $$
  select 'WI-' || lpad(nextval('walk_in_number_seq')::text, 4, '0');
$$;

alter table walk_ins add column if not exists walk_in_number text unique;

create or replace function set_walkin_number()
returns trigger
language plpgsql
as $$
begin
  if new.walk_in_number is null then
    new.walk_in_number := generate_walkin_number();
  end if;
  return new;
end;
$$;

drop trigger if exists walk_ins_set_number on walk_ins;
create trigger walk_ins_set_number before insert on walk_ins
  for each row execute function set_walkin_number();

-- Backfill any walk-ins created before this migration, oldest first so
-- numbering reads as a sane creation order.
with ordered as (
  select id from walk_ins where walk_in_number is null order by created_at
)
update walk_ins w set walk_in_number = generate_walkin_number()
  from ordered o where w.id = o.id;

alter table walk_ins alter column walk_in_number set not null;
