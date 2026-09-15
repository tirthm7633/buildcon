import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { bottleneckTileItemStatus, findBadgeClass, findLabel, TILE_ITEM_STATUSES, tileItemStatus } from "@/lib/constants";
import { PageHeader } from "@/components/shared/page-header";
import { OrdersList, type OrderListRow } from "@/components/orders/orders-list";
import { OrdersTabNav } from "@/components/orders/orders-tab-nav";

export default async function OrdersPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.tileOrders);
  await requirePageAccess(floor, profile, "page.tile_orders");

  const supabase = await createClient();

  const { data: ordersRaw } = await supabase
    .from("tile_orders")
    .select("id, order_number, order_value, created_at, customers(name)")
    .eq("floor_id", floor.id)
    .order("created_at", { ascending: false });
  const orders = ordersRaw ?? [];
  const orderIds = orders.map((o) => o.id);

  const { data: itemsRaw } = orderIds.length
    ? await supabase.from("tile_order_items").select("*, catalogue_items(brand)").in("tile_order_id", orderIds)
    : { data: [] };
  const items = itemsRaw ?? [];
  const itemIds = items.map((i) => i.id);

  const { data: dispatchItemsRaw } = itemIds.length
    ? await supabase
        .from("tile_dispatch_items")
        .select("tile_order_item_id, boxes, tile_dispatches(status)")
        .in("tile_order_item_id", itemIds)
    : { data: [] };
  const dispatchItems = dispatchItemsRaw ?? [];

  const dispatchedByItem = new Map<string, { dispatched: number; delivered: number }>();
  for (const di of dispatchItems) {
    const dispatchStatus = (di.tile_dispatches as unknown as { status: string } | null)?.status;
    const entry = dispatchedByItem.get(di.tile_order_item_id) ?? { dispatched: 0, delivered: 0 };
    entry.dispatched += Number(di.boxes);
    if (dispatchStatus === "delivered") entry.delivered += Number(di.boxes);
    dispatchedByItem.set(di.tile_order_item_id, entry);
  }

  const itemsByOrder = new Map<string, typeof items>();
  for (const item of items) {
    const existing = itemsByOrder.get(item.tile_order_id);
    if (existing) existing.push(item);
    else itemsByOrder.set(item.tile_order_id, [item]);
  }

  const now = new Date().getTime();
  const rows: OrderListRow[] = orders.map((o) => {
    const orderItems = itemsByOrder.get(o.id) ?? [];
    const brands = [...new Set(orderItems.map((i) => (i.catalogue_items as unknown as { brand: string | null } | null)?.brand).filter((b): b is string => !!b))];
    const statuses = orderItems.map((i) => {
      const d = dispatchedByItem.get(i.id) ?? { dispatched: 0, delivered: 0 };
      return tileItemStatus(i, d.dispatched, d.delivered);
    });
    const status = bottleneckTileItemStatus(statuses);
    const totalBoxes = orderItems.reduce((sum, i) => sum + (i.boxes_ordered ?? 0), 0);
    const dispatchedBoxes = orderItems.reduce((sum, i) => sum + (dispatchedByItem.get(i.id)?.dispatched ?? 0), 0);
    const waitingDays = Math.max(0, Math.floor((now - new Date(o.created_at).getTime()) / 86400000));

    return {
      id: o.id,
      order_number: o.order_number,
      customer_name: (o.customers as unknown as { name: string } | null)?.name ?? "",
      order_value: o.order_value,
      brands,
      productCount: orderItems.length,
      totalBoxes,
      status,
      statusLabel: status ? findLabel(TILE_ITEM_STATUSES, status) : "No items",
      statusClass: status ? findBadgeClass(TILE_ITEM_STATUSES, status) : "bg-secondary text-secondary-foreground border-border",
      waitingDays,
      progressPct: totalBoxes > 0 ? Math.round((dispatchedBoxes / totalBoxes) * 100) : 0,
    };
  });

  return (
    <div>
      <PageHeader title="Tile Orders" description="Operations queue — release, dispatch, and audit in one workspace." />
      <OrdersTabNav active="/orders" />
      <OrdersList rows={rows} />
    </div>
  );
}
