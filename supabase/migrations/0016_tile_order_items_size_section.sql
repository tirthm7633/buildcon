-- quotation_items already carries size (the chosen catalog variant) and
-- section (the "Area" label, e.g. "Living Room") — tile_order_items predates
-- both and would silently drop them when a Quotation transfers into an
-- order. Add the same two columns so nothing is lost in that transfer.
alter table tile_order_items add column if not exists size text;
alter table tile_order_items add column if not exists section text;
