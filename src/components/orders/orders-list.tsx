"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Truck } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import type { TileItemStatus } from "@/lib/supabase/types";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Input } from "@/components/ui/input";

export interface OrderListRow {
  id: string;
  order_number: string;
  customer_name: string;
  order_value: number;
  brands: string[];
  productCount: number;
  totalBoxes: number;
  status: TileItemStatus | null;
  statusLabel: string;
  statusClass: string;
  waitingDays: number;
  progressPct: number;
}

const FILTERS = [
  { value: "active", label: "All active" },
  { value: "pending", label: "Awaiting release" },
  { value: "released", label: "Released" },
  { value: "partially_dispatched", label: "Partially dispatched" },
] as const;

export function OrdersList({ rows }: { rows: OrderListRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("active");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "active" && r.status === "delivered") return false;
      if (filter !== "active" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.customer_name.toLowerCase().includes(q) ||
        r.order_number.toLowerCase().includes(q) ||
        r.brands.some((b) => b.toLowerCase().includes(q))
      );
    });
  }, [rows, search, filter]);

  if (!rows.length) {
    return <EmptyState icon={Truck} title="No orders yet" description="Orders placed from a quotation will show up here." />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, order number, or brand…"
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filter === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="divide-y divide-border rounded-lg border border-border">
          {filtered.map((row) => (
            <div
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
              className="flex cursor-pointer flex-col gap-2 p-3 hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{row.customer_name || "—"}</p>
                  <p className="font-mono text-xs text-muted-foreground">{row.order_number}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge label={row.statusLabel} className={row.statusClass} />
                  <span className="text-xs text-muted-foreground">{row.waitingDays}d waiting</span>
                </div>
              </div>

              {row.brands.length ? (
                <p className="truncate text-xs text-muted-foreground">{row.brands.join(", ")}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>
                  {row.productCount} product{row.productCount === 1 ? "" : "s"}
                </span>
                <span>{row.totalBoxes} boxes</span>
                <span className="font-medium text-foreground">{formatINR(row.order_value)}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${row.progressPct}%` }} />
                </div>
                <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{row.progressPct}%</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No orders match these filters.</p>
      )}
    </div>
  );
}
