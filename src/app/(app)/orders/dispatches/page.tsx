import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { DispatchesList, type DispatchListRow } from "@/components/orders/dispatches-list";
import { OrdersTabNav } from "@/components/orders/orders-tab-nav";

export default async function DispatchesPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.tileOrders);
  await requirePageAccess(floor, profile, "page.tile_orders");

  const supabase = await createClient();

  const [{ data: dispatchesRaw }, { data: company }] = await Promise.all([
    supabase
      .from("tile_dispatches")
      .select(
        "*, tile_orders(id, order_number, customers(name, address)), tile_dispatch_items(boxes, tile_order_items(description, size, catalogue_items(brand)))"
      )
      .eq("floor_id", floor.id)
      .order("dispatched_at", { ascending: false }),
    supabase.from("company_settings").select("*").eq("id", true).single(),
  ]);

  const rows: DispatchListRow[] = (dispatchesRaw ?? []).map((d) => {
    const order = d.tile_orders as unknown as {
      id: string;
      order_number: string;
      customers: { name: string; address: string | null } | null;
    } | null;
    const dispatchItems = d.tile_dispatch_items as unknown as {
      boxes: number;
      tile_order_items: { description: string; size: string | null; catalogue_items: { brand: string | null } | null } | null;
    }[];

    const items = dispatchItems.map((di) => ({
      description: di.tile_order_items?.description ?? "—",
      size: di.tile_order_items?.size ?? null,
      brand: di.tile_order_items?.catalogue_items?.brand ?? null,
      boxes: Number(di.boxes),
    }));
    const totalBoxes = items.reduce((sum, i) => sum + i.boxes, 0);
    const itemsLabel = items.map((i) => (i.brand ? `${i.brand} – ${i.description}` : i.description)).join(", ");

    return {
      id: d.id,
      orderId: order?.id ?? "",
      orderNumber: order?.order_number ?? "",
      dispatchNumber: d.dispatch_number,
      chalanNumber: d.chalan_number,
      customerName: order?.customers?.name ?? "",
      customerAddress: order?.customers?.address ?? null,
      itemsLabel,
      items,
      totalBoxes,
      route: d.from_location === "godown" ? "Godown → Customer" : "Released → Customer",
      vehicle: d.vehicle,
      driver: d.driver,
      status: d.status,
      dispatchedAt: d.dispatched_at,
      dispatchedAtLabel: formatDate(d.dispatched_at),
    };
  });

  return (
    <div>
      <PageHeader title="Tile Orders" description="Operations queue — release, dispatch, and audit in one workspace." />
      <OrdersTabNav active="/orders/dispatches" />
      <DispatchesList
        rows={rows}
        companyName={company?.company_name || "Buildcon House"}
        companyAddress={company?.address || "Nr. Gujarat Housing Board, Kataria Motors, 2nd 150ft Ring Road, Rajkot-360005"}
      />
    </div>
  );
}
