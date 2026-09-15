"use client";

import { useEffect, useState } from "react";
import { Package, Search } from "lucide-react";

import { searchCatalogItems } from "@/lib/actions/catalog";
import { formatINR } from "@/lib/format";
import type { FloorId } from "@/lib/supabase/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type CatalogSearchResult = Awaited<ReturnType<typeof searchCatalogItems>>[number];

/** Full-screen-on-mobile, large-modal-on-desktop product browser — replaces
 * a cramped dropdown that only showed one result at a time with a grid
 * showing several matches (and near-matches sharing the search term) side
 * by side, photo included, so you can actually compare before picking. */
export function ProductPickerDialog({
  open,
  onOpenChange,
  floorId,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  floorId: FloorId;
  onSelect: (product: CatalogSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      setQuery("");
      setResults([]);
      setLoading(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(async () => {
      const r = await searchCatalogItems(floorId, query);
      setResults(r);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, floorId]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex h-[95vh] max-h-[95vh] w-[calc(100%-1rem)] flex-col gap-0 p-0 sm:h-[85vh] sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b border-border p-4">
          <DialogTitle>Choose a product</DialogTitle>
          <div className="relative mt-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setLoading(true);
              }}
              placeholder="Search by name, SKU, or brand…"
              className="pl-8"
            />
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Searching…</p>
          ) : results.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelect(p)}
                  className="flex flex-col items-start gap-2 rounded-lg border border-border p-2 text-left transition-colors hover:border-primary hover:bg-muted/50"
                >
                  <div className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.imageUrl} alt="" className="size-full object-cover" />
                    ) : (
                      <Package className="size-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="w-full min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.brand ? `${p.brand} · ` : ""}
                      {p.sku}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.sizes.length > 1
                        ? `${p.sizes.length} sizes, from ${formatINR(Math.min(...p.sizes.map((s) => s.rate)))}/${p.unit}`
                        : p.sizes.length === 1
                          ? `${p.sizes[0].size} · ${formatINR(p.sizes[0].rate)}/${p.unit}`
                          : "No sizes set up"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="py-16 text-center text-sm text-muted-foreground">
              {query ? "No products match this search." : "Start typing to search the catalog."}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
