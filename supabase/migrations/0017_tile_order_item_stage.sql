-- Per-product fulfillment pipeline for tile orders. Replaces the old
-- order-level status (Pending Confirmation/Confirmed/...) in the UI — each
-- product line now tracks its own progress through the real warehouse
-- workflow, since different items on the same order can be at different
-- points (one already dispatched, another still sitting in the godown).
create type tile_item_stage as enum (
  'quotation',
  'brand_release',
  'released',
  'godown',
  'dispatched',
  'register',
  'chalan',
  'delivered'
);

alter table tile_order_items
  add column if not exists stage tile_item_stage not null default 'quotation';
