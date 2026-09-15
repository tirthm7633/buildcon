-- Reworks tile order fulfillment around how tiles actually move: a product
-- is released from the brand as a whole (one lot, matching what was
-- ordered), then physically leaves in one or more partial dispatches —
-- each its own vehicle/chalan — until the ordered box count is covered.
-- The single-stage-per-item model from the previous migration couldn't
-- represent "25 of 150 boxes gone, the rest still sitting here", so this
-- replaces it outright rather than extending it.

drop policy if exists "tile_order_items_write" on tile_order_items;
drop policy if exists "tile_order_items_select" on tile_order_items;

alter table tile_order_items drop column if exists stage;
drop type if exists tile_item_stage;

alter table tile_order_items
  add column if not exists boxes_ordered numeric(12, 2),
  add column if not exists released_at timestamptz,
  add column if not exists released_by uuid references profiles (id) on delete set null;

create table if not exists tile_dispatches (
  id uuid primary key default gen_random_uuid(),
  floor_id text not null references floors (id),
  tile_order_id uuid not null references tile_orders (id) on delete cascade,
  dispatch_number text not null unique,
  chalan_number text not null unique,
  from_location text not null default 'released' check (from_location in ('released', 'godown')),
  vehicle text,
  driver text,
  status text not null default 'dispatched' check (status in ('dispatched', 'delivered')),
  dispatched_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists tile_dispatches_order_idx on tile_dispatches (tile_order_id);
create index if not exists tile_dispatches_floor_idx on tile_dispatches (floor_id);

create table if not exists tile_dispatch_items (
  id uuid primary key default gen_random_uuid(),
  tile_dispatch_id uuid not null references tile_dispatches (id) on delete cascade,
  tile_order_item_id uuid not null references tile_order_items (id) on delete cascade,
  boxes numeric(12, 2) not null check (boxes > 0)
);

create index if not exists tile_dispatch_items_dispatch_idx on tile_dispatch_items (tile_dispatch_id);
create index if not exists tile_dispatch_items_order_item_idx on tile_dispatch_items (tile_order_item_id);

create sequence if not exists tile_dispatch_number_seq start 1;
create sequence if not exists tile_chalan_number_seq start 1;

create or replace function generate_dispatch_number()
returns text
language sql
as $$
  select 'BCH/DSP/' || current_fiscal_year_label() || '/' || lpad(nextval('tile_dispatch_number_seq')::text, 4, '0');
$$;

create or replace function generate_chalan_number()
returns text
language sql
as $$
  select 'BCH/CH/' || current_fiscal_year_label() || '/' || lpad(nextval('tile_chalan_number_seq')::text, 4, '0');
$$;

create policy "tile_order_items_select" on tile_order_items for select using (
  exists (select 1 from tile_orders o where o.id = tile_order_id and has_floor_access(o.floor_id))
);
create policy "tile_order_items_write" on tile_order_items for all using (
  exists (select 1 from tile_orders o where o.id = tile_order_id and can_write_floor(o.floor_id))
) with check (
  exists (select 1 from tile_orders o where o.id = tile_order_id and can_write_floor(o.floor_id))
);

alter table tile_dispatches enable row level security;
create policy "tile_dispatches_select" on tile_dispatches for select using (has_floor_access(floor_id));
create policy "tile_dispatches_write" on tile_dispatches for all using (can_write_floor(floor_id)) with check (can_write_floor(floor_id));

alter table tile_dispatch_items enable row level security;
create policy "tile_dispatch_items_select" on tile_dispatch_items for select using (
  exists (select 1 from tile_dispatches d where d.id = tile_dispatch_id and has_floor_access(d.floor_id))
);
create policy "tile_dispatch_items_write" on tile_dispatch_items for all using (
  exists (select 1 from tile_dispatches d where d.id = tile_dispatch_id and can_write_floor(d.floor_id))
) with check (
  exists (select 1 from tile_dispatches d where d.id = tile_dispatch_id and can_write_floor(d.floor_id))
);
