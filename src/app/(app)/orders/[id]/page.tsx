import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { bottleneckTileItemStatus, findBadgeClass, findLabel, ORDER_PAYMENT_STATUSES, TILE_ITEM_STATUSES, tileItemStatus } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OrderItemsPanel, type ItemDispatchEntry } from "@/components/orders/order-items-panel";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profile, floor } = await requireFloor((f) => f.modules.tileOrders);
  await requirePageAccess(floor, profile, "page.tile_orders");

  const supabase = await createClient();

  const { data: order } = await supabase
    .from("tile_orders")
    .select("*, customers(id, name, phone, address), quotations(id, quotation_number)")
    .eq("id", id)
    .eq("floor_id", floor.id)
    .single();
  if (!order) notFound();

  const [{ data: items }, { data: dispatchesRaw }] = await Promise.all([
    supabase.from("tile_order_items").select("*").eq("tile_order_id", id),
    supabase
      .from("tile_dispatches")
      .select("*, tile_dispatch_items(id, tile_order_item_id, boxes)")
      .eq("tile_order_id", id)
      .order("dispatched_at", { ascending: false }),
  ]);

  const dispatchesByItem: Record<string, ItemDispatchEntry[]> = {};
  for (const d of dispatchesRaw ?? []) {
    const dispatchItems = d.tile_dispatch_items as unknown as { tile_order_item_id: string; boxes: number }[];
    for (const di of dispatchItems) {
      (dispatchesByItem[di.tile_order_item_id] ??= []).push({
        id: d.id,
        dispatch_number: d.dispatch_number,
        chalan_number: d.chalan_number,
        status: d.status,
        boxes: di.boxes,
        dispatched_at: d.dispatched_at,
        delivered_at: d.delivered_at,
      });
    }
  }

  const customer = order.customers as unknown as { id: string; name: string; phone: string; address: string | null } | null;
  const quotation = order.quotations as unknown as { id: string; quotation_number: string } | null;

  const statuses = (items ?? []).map((item) => {
    const entries = dispatchesByItem[item.id] ?? [];
    const dispatched = entries.reduce((sum, e) => sum + Number(e.boxes), 0);
    const delivered = entries.filter((e) => e.status === "delivered").reduce((sum, e) => sum + Number(e.boxes), 0);
    return tileItemStatus(item, dispatched, delivered);
  });
  const bottleneck = bottleneckTileItemStatus(statuses);

  return (
    <div className="space-y-6">
      <PageHeader
        title={order.order_number}
        description={customer ? <Link href={`/customers/${customer.id}`} className="hover:underline">{customer.name}</Link> : undefined}
        actions={
          <div className="flex items-center gap-2">
            {bottleneck ? (
              <StatusBadge label={findLabel(TILE_ITEM_STATUSES, bottleneck)} className={findBadgeClass(TILE_ITEM_STATUSES, bottleneck)} />
            ) : null}
            <StatusBadge
              label={findLabel(ORDER_PAYMENT_STATUSES, order.payment_status)}
              className={findBadgeClass(ORDER_PAYMENT_STATUSES, order.payment_status)}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Items</CardTitle>
          </CardHeader>
          <CardContent>
            {items && items.length ? (
              <OrderItemsPanel orderId={order.id} items={items} dispatchesByItem={dispatchesByItem} />
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No items on this order.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order value</span>
                <span className="font-medium">{formatINR(order.order_value)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount paid</span>
                <span>{formatINR(order.amount_paid)}</span>
              </div>
              {customer?.phone ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span>{customer.phone}</span>
                </div>
              ) : null}
              {order.delivery_address ? (
                <div className="flex justify-between gap-4">
                  <span className="shrink-0 text-muted-foreground">Delivery</span>
                  <span className="text-right">{order.delivery_address}</span>
                </div>
              ) : null}
              {order.expected_delivery_date ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected delivery</span>
                  <span>{formatDate(order.expected_delivery_date)}</span>
                </div>
              ) : null}
              {order.sales_executive ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sales executive</span>
                  <span>{order.sales_executive}</span>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placed on</span>
                <span>{formatDate(order.created_at)}</span>
              </div>
              {quotation ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From quotation</span>
                  <Link href={`/quotations/${quotation.id}`} className="font-mono text-xs hover:underline">
                    {quotation.quotation_number}
                  </Link>
                </div>
              ) : null}
              {order.notes ? (
                <div className="pt-2">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="text-foreground/80">{order.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
