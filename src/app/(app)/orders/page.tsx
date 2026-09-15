import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { findBadgeClass, findLabel, ORDER_PAYMENT_STATUSES, TILE_ORDER_STATUSES } from "@/lib/constants";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { OrdersList } from "@/components/orders/orders-list";

export default async function OrdersPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.tileOrders);
  await requirePageAccess(floor, profile, "page.tile_orders");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("tile_orders")
    .select("id, order_number, status, payment_status, order_value, created_at, customers(name)")
    .eq("floor_id", floor.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <PageHeader title="Tile Orders" description="Orders placed from quotations, tracked through to delivery." />
      <OrdersList
        rows={(orders ?? []).map((o) => {
          const customer = o.customers as unknown as { name: string } | null;
          return {
            id: o.id,
            order_number: o.order_number,
            customer_name: customer?.name ?? "",
            order_value: o.order_value,
            statusLabel: findLabel(TILE_ORDER_STATUSES, o.status),
            statusClass: findBadgeClass(TILE_ORDER_STATUSES, o.status),
            paymentLabel: findLabel(ORDER_PAYMENT_STATUSES, o.payment_status),
            paymentClass: findBadgeClass(ORDER_PAYMENT_STATUSES, o.payment_status),
            dateLabel: formatDate(o.created_at),
          };
        })}
      />
    </div>
  );
}
