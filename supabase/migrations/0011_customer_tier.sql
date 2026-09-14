-- Adds a VIP/Trade/Retail tier to customers. Only Owner or the Head of the
-- customer's own floor may set it — Manager and Staff can edit every other
-- field on a customer (already governed by can_write_floor) but never this
-- one. RLS can't express "this column only" on an UPDATE policy, so this
-- is enforced with a trigger instead: it fires on both insert (blocking a
-- non-default tier from an unauthorized caller) and update (blocking any
-- change to an existing tier), checked against is_head_of_floor for the
-- row's own floor_id.

do $$ begin
  create type customer_tier as enum ('vip', 'trade', 'retail');
exception when duplicate_object then null; end $$;

alter table customers add column if not exists tier customer_tier not null default 'retail';

create or replace function guard_customer_tier_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT' and new.tier <> 'retail')
     or (tg_op = 'UPDATE' and new.tier is distinct from old.tier) then
    if not (is_owner() or is_head_of_floor(new.floor_id)) then
      raise exception 'Only the owner or a Head of this floor can set a customer''s tier.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists customers_guard_tier on customers;
create trigger customers_guard_tier before insert or update on customers
  for each row execute function guard_customer_tier_change();
