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
  // products now in the catalog, a plain select silently truncates. Page
  // through with .range() until a batch comes back short of the page size.
  const PAGE_SIZE = 1000;
  const items: NonNullable<Awaited<ReturnType<typeof fetchPage>>["data"]> = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page } = await fetchPage(from, from + PAGE_SIZE - 1);
    if (!page?.length) break;
    items.push(...page);
    if (page.length < PAGE_SIZE) break;
  }

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
