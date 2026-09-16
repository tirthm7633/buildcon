import { Plus } from "lucide-react";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CatalogForm } from "@/components/catalog/catalog-form";
import { CatalogImportDialog } from "@/components/catalog/catalog-import-dialog";
import { CatalogList } from "@/components/catalog/catalog-list";
import type { CatalogCardData } from "@/components/catalog/catalog-card";

export default async function CatalogPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.catalog);
  await requirePageAccess(floor, profile, "page.catalog");

  const supabase = await createClient();
  const fetchPage = (from: number, to: number) =>
    supabase
      .from("catalogue_items")
      .select("*, catalogue_images(url, position), catalogue_item_sizes(id, catalogue_item_id, size, sku, rate, position, created_at)")
      .eq("floor_id", floor.id)
      .order("name")
      .range(from, to);

  // PostgREST caps a single response at 1000 rows by default — with 1600+
  // products now in the catalog, a plain select silently truncates. Get the
  // real count first, then fire every page's request at once instead of
  // waiting on each in turn — with ~1,600 rows that's the difference
  // between one round trip and two back-to-back ones.
  const PAGE_SIZE = 1000;
  const { count } = await supabase
    .from("catalogue_items")
    .select("id", { count: "exact", head: true })
    .eq("floor_id", floor.id);

  const pageCount = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) => fetchPage(i * PAGE_SIZE, (i + 1) * PAGE_SIZE - 1))
  );
  const items = pages.flatMap((p) => p.data ?? []);

  const rows: CatalogCardData[] = (items ?? []).map(({ catalogue_images, catalogue_item_sizes, ...item }) => {
    const images = (catalogue_images as unknown as { url: string; position: number }[]) ?? [];
    const sorted = [...images].sort((a, b) => a.position - b.position);
    const sizes = ((catalogue_item_sizes as unknown as CatalogCardData["sizes"]) ?? []).slice().sort((a, b) => a.position - b.position);
    return { ...item, imageUrl: sorted[0]?.url ?? null, sizes };
  });

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Products available for selections and quotations on this floor."
        actions={
          <div className="flex items-center gap-2">
            <CatalogImportDialog />
            <CatalogForm
              trigger={
                <Button>
                  <Plus className="size-4" />
                  Add product
                </Button>
              }
            />
          </div>
        }
      />
      <CatalogList items={rows} />
    </div>
  );
}
