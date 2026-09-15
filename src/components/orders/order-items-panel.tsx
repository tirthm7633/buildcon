"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronDown, ChevronUp, Loader2, Truck } from "lucide-react";
import { toast } from "sonner";

import { createDispatch, markDispatchDelivered } from "@/lib/actions/dispatches";
import { releaseItem, updateItemBoxes } from "@/lib/actions/orders";
import { findBadgeClass, findLabel, TILE_ITEM_STATUSES, tileItemStatus } from "@/lib/constants";
import { formatDate, formatINR } from "@/lib/format";
import type { TileDispatchStatus, TileOrderItem } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ItemDispatchEntry = {
  id: string;
  dispatch_number: string;
  chalan_number: string;
  status: TileDispatchStatus;
  boxes: number;
  dispatched_at: string;
  delivered_at: string | null;
};

export function OrderItemsPanel({
  orderId,
  items,
  dispatchesByItem,
}: {
  orderId: string;
  items: TileOrderItem[];
  dispatchesByItem: Record<string, ItemDispatchEntry[]>;
}) {
  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {items.map((item) => (
        <ItemCard key={item.id} orderId={orderId} item={item} dispatches={dispatchesByItem[item.id] ?? []} />
      ))}
    </div>
  );
}

function ItemCard({ orderId, item, dispatches }: { orderId: string; item: TileOrderItem; dispatches: ItemDispatchEntry[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchBoxes, setDispatchBoxes] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [driver, setDriver] = useState("");

  const boxesDispatched = dispatches.reduce((sum, d) => sum + Number(d.boxes), 0);
  const boxesDelivered = dispatches.filter((d) => d.status === "delivered").reduce((sum, d) => sum + Number(d.boxes), 0);
  const status = tileItemStatus(item, boxesDispatched, boxesDelivered);
  const remaining = (item.boxes_ordered ?? 0) - boxesDispatched;

  function saveBoxes(value: string) {
    const boxes = Number(value);
    if (!boxes || boxes === item.boxes_ordered) return;
    startTransition(async () => {
      const result = await updateItemBoxes(item.id, orderId, boxes);
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  function release() {
    startTransition(async () => {
      const result = await releaseItem(item.id, orderId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Marked released");
      router.refresh();
    });
  }

  function submitDispatch() {
    const boxes = Number(dispatchBoxes);
    if (!boxes) {
      toast.error("Enter a box count.");
      return;
    }
    startTransition(async () => {
      const result = await createDispatch(orderId, item.id, boxes, vehicle, driver);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Dispatch created");
      setDispatchOpen(false);
      setDispatchBoxes("");
      setVehicle("");
      setDriver("");
      router.refresh();
    });
  }

  function deliver(dispatchId: string) {
    startTransition(async () => {
      const result = await markDispatchDelivered(dispatchId, orderId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-sm font-medium text-foreground">{item.description}</p>
        <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">{formatINR(item.amount)}</p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>Area: {item.section ?? "—"}</span>
        <span>Size: {item.size ?? "—"}</span>
        <span>Qty: {item.quantity} {item.unit}</span>
        <span>Rate: {formatINR(item.rate, { precise: true })}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <StatusBadge label={findLabel(TILE_ITEM_STATUSES, status)} className={findBadgeClass(TILE_ITEM_STATUSES, status)} />

        {!item.released_at ? (
          <>
            <Input
              defaultValue={item.boxes_ordered ?? ""}
              onBlur={(e) => saveBoxes(e.target.value)}
              type="number"
              min={1}
              placeholder="Boxes"
              className="h-7 w-24 text-xs"
            />
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={release}
              disabled={isPending || !item.boxes_ordered}
            >
              {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
              Mark Released
            </Button>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">
            {boxesDispatched} / {item.boxes_ordered} boxes dispatched
          </span>
        )}

        {item.released_at && remaining > 0 ? (
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => setDispatchOpen((o) => !o)}
          >
            <Truck className="size-3.5" />
            Dispatch
            {dispatchOpen ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        ) : null}
      </div>

      {dispatchOpen ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md bg-muted/30 p-2.5">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Boxes (max {remaining})</label>
            <Input
              value={dispatchBoxes}
              onChange={(e) => setDispatchBoxes(e.target.value)}
              type="number"
              min={1}
              max={remaining}
              className="h-8 w-24 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Vehicle</label>
            <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} className="h-8 w-28 text-sm" />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Driver</label>
            <Input value={driver} onChange={(e) => setDriver(e.target.value)} className="h-8 w-28 text-sm" />
          </div>
          <Button size="sm" className="h-8 px-3" onClick={submitDispatch} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Create Dispatch"}
          </Button>
        </div>
      ) : null}

      {dispatches.length ? (
        <div className="mt-1 space-y-1.5 border-t border-border pt-2">
          {dispatches.map((d) => (
            <div key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="font-mono text-muted-foreground">{d.dispatch_number}</span>
              <span className="text-foreground">{d.boxes} boxes</span>
              <span className="font-mono text-muted-foreground">{d.chalan_number}</span>
              <span className="text-muted-foreground">{formatDate(d.dispatched_at)}</span>
              <StatusBadge
                label={d.status === "delivered" ? "Delivered" : "Dispatched"}
                className={
                  d.status === "delivered"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-indigo-50 text-indigo-700 border-indigo-200"
                }
              />
              {d.status === "dispatched" ? (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => deliver(d.id)} disabled={isPending}>
                  Mark Delivered
                </Button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
