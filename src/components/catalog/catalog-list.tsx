"use client";

import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { CatalogCard, type CatalogCardData } from "@/components/catalog/catalog-card";
import { Input } from "@/components/ui/input";

export function CatalogList({ items }: { items: CatalogCardData[] }) {
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState<string | null>(null);

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
        <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:px-0 sm:pb-0">
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

      <div className="relative mb-5 max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, SKU, or brand…"
          className="pl-8"
        />
      </div>

      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
