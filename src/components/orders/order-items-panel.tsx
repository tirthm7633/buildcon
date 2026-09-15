"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { advanceItemStage } from "@/lib/actions/orders";
import { findBadgeClass, findLabel, nextTileItemStage, TILE_ITEM_STAGES } from "@/lib/constants";
import { formatINR } from "@/lib/format";
import type { TileOrderItem } from "@/lib/supabase/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";

export function OrderItemsPanel({ orderId, items }: { orderId: string; items: TileOrderItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function advance(itemId: string) {
    setPendingId(itemId);
    startTransition(async () => {
      const result = await advanceItemStage(itemId, orderId);
      setPendingId(null);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="divide-y divide-border rounded-lg border border-border">
      {items.map((item) => {
        const next = nextTileItemStage(item.stage);
        return (
          <div key={item.id} className="flex flex-col gap-2 p-3">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 text-sm font-medium text-foreground">{item.description}</p>
              <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">{formatINR(item.amount)}</p>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Area: {item.section ?? "—"}</span>
              <span>Size: {item.size ?? "—"}</span>
              <span>Qty: {item.quantity}</span>
              <span>Rate: {formatINR(item.rate, { precise: true })}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <StatusBadge label={findLabel(TILE_ITEM_STAGES, item.stage)} className={findBadgeClass(TILE_ITEM_STAGES, item.stage)} />
              {next ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs"
                  onClick={() => advance(item.id)}
                  disabled={isPending}
                >
                  {isPending && pendingId === item.id ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="size-3.5" />
                  )}
                  Mark {findLabel(TILE_ITEM_STAGES, next)}
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
