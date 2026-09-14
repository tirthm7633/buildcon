"use client";

import { useMemo, useState } from "react";
import { Package, Search } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { CatalogCard, type CatalogCardData } from "@/components/catalog/catalog-card";
import { Input } from "@/components/ui/input";

export function CatalogList({ items }: { items: CatalogCardData[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        (i.brand ?? "").toLowerCase().includes(q)
    );
  }, [items, search]);

  if (!items.length) {
    return <EmptyState icon={Package} title="No products yet" description="Add your first product to start building selections." />;
  }

  return (
    <div>
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
        <p className="py-12 text-center text-sm text-muted-foreground">No products match this search.</p>
      )}
    </div>
  );
}
