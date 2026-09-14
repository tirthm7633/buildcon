-- A tile design commonly comes in more than one size, each at its own
-- rate (e.g. the same "Classic White Marble" design in 600x600mm and
-- 800x800mm). catalogue_items.size/selling_price could only ever hold one
-- of those, forcing every size into a separate, unrelated catalog entry.
-- catalogue_item_sizes makes size a set of priced sub-rows under one
-- design instead — existing single-size products just get one row.

create table if not exists catalogue_item_sizes (
  id uuid primary key default gen_random_uuid(),
  catalogue_item_id uuid not null references catalogue_items (id) on delete cascade,
  size text not null,
  sku text,
  rate numeric(14, 2) not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists catalogue_item_sizes_item_idx on catalogue_item_sizes (catalogue_item_id);

insert into catalogue_item_sizes (catalogue_item_id, size, rate, position)
select id, coalesce(size, 'Standard'), selling_price, 0
from catalogue_items
where not exists (
  select 1 from catalogue_item_sizes s where s.catalogue_item_id = catalogue_items.id
);

alter table catalogue_items drop column if exists size;
alter table catalogue_items drop column if exists selling_price;

-- quotation_items.size becomes an editable per-line snapshot — like
-- description/rate already are — not a live join to the catalog item, so
-- changing the design's sizes later never rewrites a document already sent.
alter table quotation_items add column if not exists size text;

update quotation_items qi
set size = s.size
from catalogue_item_sizes s
where qi.catalogue_item_id = s.catalogue_item_id and s.position = 0 and qi.size is null;

alter table catalogue_item_sizes enable row level security;

drop policy if exists "catalogue_item_sizes_select" on catalogue_item_sizes;
create policy "catalogue_item_sizes_select" on catalogue_item_sizes for select using (
  exists (select 1 from catalogue_items ci where ci.id = catalogue_item_id and has_floor_access(ci.floor_id))
);
drop policy if exists "catalogue_item_sizes_write" on catalogue_item_sizes;
create policy "catalogue_item_sizes_write" on catalogue_item_sizes for all using (
  exists (select 1 from catalogue_items ci where ci.id = catalogue_item_id and can_write_floor(ci.floor_id))
) with check (
  exists (select 1 from catalogue_items ci where ci.id = catalogue_item_id and can_write_floor(ci.floor_id))
);
