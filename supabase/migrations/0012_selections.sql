-- Selections are quotations rows in status = 'draft' — no new table. A
-- Selection can be started before the person is a formal Customer (same
-- independence walk_ins already has from customers), so customer_id
-- becomes optional and the document carries its own editable snapshot of
-- name/phone/address, prefilled from a picked Customer but not locked to
-- it. "Reference" is new. sales_executive already referenced profiles —
-- renamed to attended_by, the same concept already used for walk-ins,
-- not a new column.

alter table quotations alter column customer_id drop not null;

alter table quotations add column if not exists customer_name text not null default '';
alter table quotations add column if not exists customer_phone text not null default '';
alter table quotations add column if not exists customer_address text;
alter table quotations add column if not exists reference text;

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'quotations' and column_name = 'sales_executive'
  ) then
    alter table quotations rename column sales_executive to attended_by;
  end if;
end $$;
