"use client";

import { useRouter } from "next/navigation";
import { Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";

export interface OrderListRow {
  id: string;
  order_number: string;
  customer_name: string;
  order_value: number;
  statusLabel: string;
  statusClass: string;
  paymentLabel: string;
  paymentClass: string;
  dateLabel: string;
}

export function OrdersList({ rows }: { rows: OrderListRow[] }) {
  const router = useRouter();

  if (!rows.length) {
    return <EmptyState icon={Truck} title="No orders yet" description="Orders placed from a quotation will show up here." />;
  }

  return (
    <div className="rounded-lg border border-border">
      <table className="w-full table-fixed text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="w-[22%] p-3 sm:w-[18%]">Order No.</th>
            <th className="w-[28%] p-3 sm:w-[22%]">Customer</th>
            <th className="w-[24%] p-3 sm:w-[16%]">Status</th>
            <th className="hidden p-3 sm:table-cell sm:w-[16%]">Payment</th>
            <th className="w-[26%] p-3 text-right sm:w-[14%]">Amount</th>
            <th className="hidden p-3 lg:table-cell lg:w-[14%]">Date</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              role="link"
              onClick={() => router.push(`/orders/${row.id}`)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  router.push(`/orders/${row.id}`);
                }
              }}
              className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
            >
              <td className="truncate p-3 font-mono text-xs font-medium text-foreground">{row.order_number}</td>
              <td className="truncate p-3 text-foreground">{row.customer_name || "—"}</td>
              <td className="p-3">
                <StatusBadge label={row.statusLabel} className={cn(row.statusClass, "h-auto w-fit max-w-full whitespace-normal text-center leading-tight")} />
              </td>
              <td className="hidden p-3 sm:table-cell">
                <StatusBadge label={row.paymentLabel} className={row.paymentClass} />
              </td>
              <td className="p-3 text-right font-medium tabular-nums text-foreground">{formatINR(row.order_value)}</td>
              <td className="hidden p-3 text-muted-foreground lg:table-cell">{row.dateLabel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
