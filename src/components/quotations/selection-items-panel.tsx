"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { addSelectionItem, removeSelectionItem, updateSelectionItem } from "@/lib/actions/quotations";
import { formatINR } from "@/lib/format";
import type { FloorId, QuotationItem } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ProductPickerDialog } from "@/components/quotations/product-picker-dialog";

type SizeOption = { id: string; size: string; rate: number };

export interface SelectionItemRow extends QuotationItem {
  imageUrl: string | null;
  /** Every size option the underlying catalog design currently has — used
   * to power the size dropdown. A row keeps its own size/rate snapshot
   * regardless of what this list says, so it still renders sensibly even
   * if the catalog item was later deleted (empty array) or changed. */
  sizeOptions: SizeOption[];
}

type PendingProduct = {
  catalogue_item_id: string;
  description: string;
  imageUrl: string | null;
  sizes: SizeOption[];
  selectedSizeId: string | null;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </div>
  );
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
  const [pendingProduct, setPendingProduct] = useState<PendingProduct | null>(null);
  const [area, setArea] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);

  const selectedSize = pendingProduct?.sizes.find((s) => s.id === pendingProduct.selectedSizeId) ?? null;

  function confirmAdd() {
    if (!pendingProduct || !selectedSize) return;
    startTransition(async () => {
      const result = await addSelectionItem(
        quotationId,
        {
          catalogue_item_id: pendingProduct.catalogue_item_id,
          description: pendingProduct.description,
          rate: selectedSize.rate,
          size: selectedSize.size,
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
        size: item.size,
        section: nextArea,
      });
      if (result.error) toast.error(result.error);
      router.refresh();
    });
  }

  function changeSize(item: SelectionItemRow, sizeOption: SizeOption) {
    if (sizeOption.size === item.size) return;
    startTransition(async () => {
      const result = await updateSelectionItem(item.id, quotationId, {
        catalogue_item_id: item.catalogue_item_id,
        description: item.description,
        rate: sizeOption.rate,
        size: sizeOption.size,
        section: item.section ?? "",
      });
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(`Size changed to ${sizeOption.size} — rate updated to ${formatINR(sizeOption.rate)}/sq.ft`);
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
    <>
      <div className="rounded-lg border border-border">
        <div className="divide-y divide-border">
          {items.map((item, i) => (
            <div key={item.id} className="flex gap-3 p-3">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Package className="size-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 text-sm font-medium text-foreground">
                    <span className="mr-1.5 text-xs text-muted-foreground">{i + 1}.</span>
                    {item.description}
                  </p>
                  {editable ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0"
                      onClick={() => remove(item.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Field label="Area">
                    {editable ? (
                      <Input
                        defaultValue={item.section ?? ""}
                        onBlur={(e) => saveArea(item, e.target.value)}
                        placeholder="e.g. Living Room"
                        className="h-8 w-32 text-sm"
                      />
                    ) : (
                      <span className="text-sm text-foreground">{item.section ?? "—"}</span>
                    )}
                  </Field>
                  <Field label="Size">
                    {editable && item.sizeOptions.length > 1 ? (
                      <Select
                        value={item.size ?? undefined}
                        onValueChange={(v) => {
                          const opt = item.sizeOptions.find((s) => s.size === v);
                          if (opt) changeSize(item, opt);
                        }}
                      >
                        <SelectTrigger className="h-8 w-28 text-sm">
                          <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                          {item.sizeOptions.map((s) => (
                            <SelectItem key={s.id} value={s.size}>
                              {s.size}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-foreground">{item.size ?? "—"}</span>
                    )}
                  </Field>
                  <Field label="Rate/sq.ft">
                    <span className="text-sm font-medium tabular-nums text-foreground">{formatINR(item.rate)}</span>
                  </Field>
                </div>
              </div>
            </div>
          ))}

          {editable && adding ? (
            <div className="flex flex-col gap-3 bg-muted/20 p-3">
              <div className="flex items-start gap-3">
                <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                  {pendingProduct?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={pendingProduct.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <Package className="size-5 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {pendingProduct ? (
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{pendingProduct.description}</span>
                      <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={() => setPendingProduct(null)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 px-3 text-muted-foreground"
                      onClick={() => setPickerOpen(true)}
                    >
                      <Search className="size-3.5" />
                      Search products…
                    </Button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <Field label="Area">
                  <Input
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Living Room"
                    className="h-8 w-32 text-sm"
                  />
                </Field>
                <Field label="Size">
                  {pendingProduct && pendingProduct.sizes.length > 1 ? (
                    <Select
                      value={pendingProduct.selectedSizeId ?? undefined}
                      onValueChange={(v) => setPendingProduct({ ...pendingProduct, selectedSizeId: v })}
                    >
                      <SelectTrigger className="h-8 w-40 text-sm">
                        <SelectValue placeholder="Choose size" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingProduct.sizes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.size} — {formatINR(s.rate)}/sq.ft
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-sm text-foreground">{selectedSize?.size ?? "—"}</span>
                  )}
                </Field>
                <Field label="Rate/sq.ft">
                  <span className="text-sm font-medium tabular-nums text-foreground">
                    {selectedSize ? formatINR(selectedSize.rate) : "—"}
                  </span>
                </Field>
              </div>

              <div className="flex items-center gap-1.5">
                <Button size="sm" className="h-8 px-3" onClick={confirmAdd} disabled={!selectedSize || isPending}>
                  {isPending ? <Loader2 className="size-4 animate-spin" /> : "Add"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3"
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
          ) : null}
        </div>

        {editable && !adding ? (
          <div className="border-t border-border p-3">
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus className="size-4" />
              Add product
            </Button>
          </div>
        ) : null}
      </div>

      <ProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        floorId={floorId}
        onSelect={(p) => {
          setPendingProduct({
            catalogue_item_id: p.id,
            description: p.name,
            imageUrl: p.imageUrl,
            sizes: p.sizes,
            selectedSizeId: p.sizes.length === 1 ? p.sizes[0].id : null,
          });
          setPickerOpen(false);
        }}
      />
    </>
  );
}
