"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Loader2, Search, Truck } from "lucide-react";
import { toast } from "sonner";

import { markDispatchDelivered } from "@/lib/actions/dispatches";
import { cn } from "@/lib/utils";
import type { ChalanItem } from "@/components/orders/chalan-pdf";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface DispatchListRow {
  id: string;
  orderId: string;
  orderNumber: string;
  dispatchNumber: string;
  chalanNumber: string;
  customerName: string;
  customerAddress: string | null;
  itemsLabel: string;
  items: ChalanItem[];
  totalBoxes: number;
  route: string;
  vehicle: string | null;
  driver: string | null;
  status: "dispatched" | "delivered";
  dispatchedAt: string;
  dispatchedAtLabel: string;
}

const FILTERS = [
  { value: "all", label: "All" },
  { value: "dispatched", label: "Dispatched" },
  { value: "delivered", label: "Delivered" },
] as const;

export function DispatchesList({
  rows,
  companyName,
  companyAddress,
}: {
  rows: DispatchListRow[];
  companyName: string;
  companyAddress: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!q) return true;
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.dispatchNumber.toLowerCase().includes(q) ||
        r.chalanNumber.toLowerCase().includes(q) ||
        r.itemsLabel.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filter]);

  function deliver(dispatchId: string, orderId: string) {
    startTransition(async () => {
      const result = await markDispatchDelivered(dispatchId, orderId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function downloadChalan(row: DispatchListRow) {
    setDownloadingId(row.id);
    try {
      const [{ pdf }, { ChalanPdfDocument }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("@/components/orders/chalan-pdf"),
      ]);
      const blob = await pdf(
        <ChalanPdfDocument
          companyName={companyName}
          companyAddress={companyAddress}
          chalanNumber={row.chalanNumber}
          dispatchNumber={row.dispatchNumber}
          orderNumber={row.orderNumber}
          dispatchedAt={row.dispatchedAt}
          customerName={row.customerName}
          customerAddress={row.customerAddress}
          vehicle={row.vehicle}
          driver={row.driver}
          route={row.route}
          items={row.items}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.chalanNumber.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't generate the chalan");
    } finally {
      setDownloadingId(null);
    }
  }

  if (!rows.length) {
    return <EmptyState icon={Truck} title="No dispatches yet" description="Dispatches created from an order will show up here." />;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, dispatch, or chalan number…"
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
            <div key={row.id} className="flex flex-col gap-2 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{row.customerName || "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{row.itemsLabel}</p>
                </div>
                <StatusBadge
                  label={row.status === "delivered" ? "Delivered" : "Dispatched"}
                  className={
                    row.status === "delivered"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }
                />
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="font-mono">{row.dispatchNumber}</span>
                <span>{row.totalBoxes} boxes</span>
                <span>{row.route}</span>
                {row.vehicle ? <span>Vehicle: {row.vehicle}</span> : null}
                {row.driver ? <span>Driver: {row.driver}</span> : null}
                <span>{row.dispatchedAtLabel}</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link href={`/orders/${row.orderId}`} className="text-xs font-medium text-primary hover:underline">
                  View Order
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-xs text-primary hover:text-primary"
                  onClick={() => downloadChalan(row)}
                  disabled={downloadingId === row.id}
                >
                  {downloadingId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
                  Chalan ({row.chalanNumber})
                </Button>
                {row.status === "dispatched" ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    onClick={() => deliver(row.id, row.orderId)}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="size-3.5 animate-spin" /> : "Mark Delivered"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No dispatches match these filters.</p>
      )}
    </div>
  );
}
