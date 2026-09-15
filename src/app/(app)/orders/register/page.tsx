import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { MovementRegister, type MovementRow } from "@/components/orders/movement-register";
import { OrdersTabNav } from "@/components/orders/orders-tab-nav";

export default async function MovementRegisterPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.tileOrders);
  await requirePageAccess(floor, profile, "page.tile_orders");

  const supabase = await createClient();

  const { data: ordersRaw } = await supabase
    .from("tile_orders")
    .select("id, order_number, created_at, created_by, customers(name)")
    .eq("floor_id", floor.id);
  const orders = ordersRaw ?? [];
  const orderIds = orders.map((o) => o.id);
  const orderById = new Map(orders.map((o) => [o.id, o]));

  const [{ data: itemsRaw }, { data: dispatchesRaw }, { data: profiles }] = await Promise.all([
    orderIds.length
      ? supabase.from("tile_order_items").select("*, catalogue_items(brand)").in("tile_order_id", orderIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? supabase
          .from("tile_dispatches")
          .select("*, tile_dispatch_items(boxes, tile_order_items(description, catalogue_items(brand)))")
          .in("tile_order_id", orderIds)
      : Promise.resolve({ data: [] }),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const items = itemsRaw ?? [];
  const dispatches = dispatchesRaw ?? [];
  const userName = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows: MovementRow[] = [];

  for (const item of items) {
    const order = orderById.get(item.tile_order_id);
    if (!order) continue;
    const customerName = (order.customers as unknown as { name: string } | null)?.name ?? "";
    const brand = (item.catalogue_items as unknown as { brand: string | null } | null)?.brand;
    const itemLabel = brand ? `${brand} – ${item.description}` : item.description;

    rows.push({
      id: `order-${item.id}`,
      timestamp: order.created_at,
      customerName,
      itemLabel,
      movement: "Order Created",
      qty: item.boxes_ordered ?? 0,
      from: "—",
      to: "—",
      reference: order.order_number,
      user: (order.created_by && userName.get(order.created_by)) || "—",
    });

    if (item.released_at) {
      rows.push({
        id: `release-${item.id}`,
        timestamp: item.released_at,
        customerName,
        itemLabel,
        movement: "Release",
        qty: item.boxes_ordered ?? 0,
        from: "Brand",
        to: "BuildCon",
        reference: "—",
        user: (item.released_by && userName.get(item.released_by)) || "—",
      });
    }
  }

  for (const d of dispatches) {
    const order = orderById.get(d.tile_order_id);
    if (!order) continue;
    const customerName = (order.customers as unknown as { name: string } | null)?.name ?? "";
    const dispatchItems = d.tile_dispatch_items as unknown as {
      boxes: number;
      tile_order_items: { description: string; catalogue_items: { brand: string | null } | null } | null;
    }[];
    const totalBoxes = dispatchItems.reduce((sum, di) => sum + Number(di.boxes), 0);
    const itemLabel = dispatchItems
      .map((di) => {
        const brand = di.tile_order_items?.catalogue_items?.brand;
        const desc = di.tile_order_items?.description ?? "—";
        return brand ? `${brand} – ${desc}` : desc;
      })
      .join(", ");
    const fromLabel = d.from_location === "godown" ? "Godown" : "Released";

    rows.push({
      id: `dispatch-${d.id}`,
      timestamp: d.dispatched_at,
      customerName,
      itemLabel,
      movement: `Dispatch from ${fromLabel}`,
      qty: totalBoxes,
      from: fromLabel,
      to: customerName || "Customer",
      reference: d.chalan_number,
      user: (d.created_by && userName.get(d.created_by)) || "—",
    });

    if (d.delivered_at) {
      rows.push({
        id: `delivered-${d.id}`,
        timestamp: d.delivered_at,
        customerName,
        itemLabel,
        movement: "Delivered",
        qty: totalBoxes,
        from: "In Transit",
        to: customerName || "Customer",
        reference: d.chalan_number,
        user: (d.created_by && userName.get(d.created_by)) || "—",
      });
    }
  }

  rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return (
    <div>
      <PageHeader title="Tile Orders" description="Operations queue — release, dispatch, and audit in one workspace." />
      <OrdersTabNav active="/orders/register" />
      <MovementRegister rows={rows} />
    </div>
  );
}
