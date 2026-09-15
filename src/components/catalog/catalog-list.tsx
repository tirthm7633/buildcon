"use client";

import { useMemo, useState } from "react";
import { Grid2x2, Grid3x3, Package, Search, Square } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogCard, type CatalogCardData } from "@/components/catalog/catalog-card";
import { Input } from "@/components/ui/input";

const GRID_DENSITIES = [
  { cols: 1, icon: Square, label: "1 per row" },
  { cols: 2, icon: Grid2x2, label: "2 per row" },
  { cols: 3, icon: Grid3x3, label: "3 per row" },
] as const;

export function CatalogList({ items }: { items: CatalogCardData[] }) {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<string | null>(null);
  const [cols, setCols] = useState<1 | 2 | 3>(2);

  const brands = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const b = item.brand?.trim();
      if (!b) continue;
      counts.set(b, (counts.get(b) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((i) => {
      if (brand && i.brand !== brand) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q) || (i.brand ?? "").toLowerCase().includes(q);
    });
  }, [items, search, brand]);

  if (!items.length) {
    return <EmptyState icon={Package} title="No products yet" description="Add your first product to start building selections." />;
  }

  return (
    <div>
      {brands.length ? (
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setBrand(null)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              brand === null
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:text-foreground"
            )}
          >
            All brands ({items.length})
          </button>
          {brands.map(([name, count]) => (
            <button
              key={name}
              type="button"
              onClick={() => setBrand(name)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                brand === name
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              {name} ({count})
            </button>
          ))}
        </div>
      ) : null}

      <div className="mb-5 flex items-center gap-2">
        <div className="relative min-w-0 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or brand…"
            className="pl-8"
          />
        </div>
        <div className="flex shrink-0 items-center gap-0.5 rounded-lg border border-border bg-muted p-1">
          {GRID_DENSITIES.map(({ cols: n, icon: Icon, label }) => (
            <button
              key={n}
              type="button"
              onClick={() => setCols(n)}
              aria-label={label}
              aria-pressed={cols === n}
              className={cn(
                "flex size-8 items-center justify-center rounded-md transition-colors",
                cols === n ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-4" />
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {filtered.map((item) => (
            <CatalogCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <p className="py-12 text-center text-sm text-muted-foreground">No products match {brand ? `"${brand}"` : "this search"}.</p>
      )}
    </div>
  );
}
