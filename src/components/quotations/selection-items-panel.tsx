"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { addSelectionItem, removeSelectionItem, updateSelectionItem } from "@/lib/actions/quotations";
import { searchCatalogItems } from "@/lib/actions/catalog";
import { formatINR } from "@/lib/format";
import type { FloorId, QuotationItem } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchPicker } from "@/components/shared/search-picker";

export interface SelectionItemRow extends QuotationItem {
  imageUrl: string | null;
  size: string | null;
}

export function SelectionItemsPanel({
  quotationId,
  floorId,
  items,
  editable,
}: {
  quotationId: string;
  floorId: FloorId;
  items: SelectionItemRow[];
  editable: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [adding, setAdding] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<{
    catalogue_item_id: string;
    description: string;
    rate: number;
    size: string | null;
    imageUrl: string | null;
  } | null>(null);
  const [area, setArea] = useState("");

  function confirmAdd() {
    if (!pendingProduct) return;
    startTransition(async () => {
      const result = await addSelectionItem(
        quotationId,
        {
          catalogue_item_id: pendingProduct.catalogue_item_id,
          description: pendingProduct.description,
          rate: pendingProduct.rate,
          section: area,
        },
        items.length
      );
      if (result.error) {
        toast.error(result.error);
        return;
      }
      setPendingProduct(null);
      setArea("");
      setAdding(false);
      router.refresh();
    });
  }

  function saveArea(item: SelectionItemRow, nextArea: string) {
    if (nextArea === (item.section ?? "")) return;
    startTransition(async () => {
      const result = await updateSelectionItem(item.id, quotationId, {
        catalogue_item_id: item.catalogue_item_id,
        description: item.description,
        rate: item.rate,
        section: nextArea,
      });
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  function remove(itemId: string) {
    startTransition(async () => {
      const result = await removeSelectionItem(itemId, quotationId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <th className="p-3">Sr.</th>
            <th className="p-3">Image</th>
            <th className="p-3">Area</th>
            <th className="p-3">Product detail</th>
            <th className="p-3">Size</th>
            <th className="p-3 text-right">Rate/sq.ft</th>
            {editable ? <th className="p-3" /> : null}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={item.id} className="border-b border-border last:border-0">
              <td className="p-3 text-muted-foreground">{i + 1}</td>
              <td className="p-3">
                <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {item.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Package className="size-4 text-muted-foreground" />
                  )}
                </div>
              </td>
              <td className="p-3">
                {editable ? (
                  <Input
                    defaultValue={item.section ?? ""}
                    onBlur={(e) => saveArea(item, e.target.value)}
                    placeholder="e.g. Living Room"
                    className="h-8 w-32 text-sm"
                  />
                ) : (
                  (item.section ?? "—")
                )}
              </td>
              <td className="p-3 text-foreground">{item.description}</td>
              <td className="p-3 text-muted-foreground">{item.size ?? "—"}</td>
              <td className="p-3 text-right text-foreground">{formatINR(item.rate)}</td>
              {editable ? (
                <td className="p-3 text-right">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => remove(item.id)} disabled={isPending}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>

      {editable ? (
        <div className="border-t border-border p-3">
          {adding ? (
            <div className="space-y-3">
              {pendingProduct ? (
                <div className="flex items-center gap-3 rounded-md border border-border p-2">
                  <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {pendingProduct.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={pendingProduct.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{pendingProduct.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {pendingProduct.size ?? "—"} · {formatINR(pendingProduct.rate)}/sq.ft
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setPendingProduct(null)}>
                    Change
                  </Button>
                </div>
              ) : (
                <SearchPicker
                  placeholder="Search products by name or SKU…"
                  onSearch={(q) => searchCatalogItems(floorId, q)}
                  resultKey={(p) => p.id}
                  renderResult={(p) => (
                    <div>
                      <p className="font-medium text-foreground">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.sku} · {p.size ?? "—"} · {formatINR(p.selling_price)}/{p.unit}
                      </p>
                    </div>
                  )}
                  onSelect={(p) =>
                    setPendingProduct({
                      catalogue_item_id: p.id,
                      description: p.name,
                      rate: p.selling_price,
                      size: p.size,
                      imageUrl: p.imageUrl,
                    })
                  }
                />
              )}

              <div className="flex items-center gap-2">
                <Input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="Area, e.g. Living Room"
                  className="h-9"
                />
                <Button size="sm" onClick={confirmAdd} disabled={!pendingProduct || isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Add
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setAdding(false);
                    setPendingProduct(null);
                    setArea("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add product
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
