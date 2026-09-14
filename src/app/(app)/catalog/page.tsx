import { Plus } from "lucide-react";

import { requirePageAccess } from "@/lib/permissions";
import { requireFloor } from "@/lib/require-floor";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { CatalogForm } from "@/components/catalog/catalog-form";
import { CatalogList } from "@/components/catalog/catalog-list";
import type { CatalogCardData } from "@/components/catalog/catalog-card";

export default async function CatalogPage() {
  const { profile, floor } = await requireFloor((f) => f.modules.catalog);
  await requirePageAccess(floor, profile, "page.catalog");

  const supabase = await createClient();
  const { data: items } = await supabase
    .from("catalogue_items")
    .select("*, catalogue_images(url, position)")
    .eq("floor_id", floor.id)
    .order("name");

  const rows: CatalogCardData[] = (items ?? []).map((item) => {
    const images = (item.catalogue_images as unknown as { url: string; position: number }[]) ?? [];
    const sorted = [...images].sort((a, b) => a.position - b.position);
    return { ...item, imageUrl: sorted[0]?.url ?? null };
  });

  return (
    <div>
      <PageHeader
        title="Catalog"
        description="Products available for selections and quotations on this floor."
        actions={
          <CatalogForm
            trigger={
              <Button>
                <Plus className="size-4" />
                Add product
              </Button>
            }
          />
        }
      />
      <CatalogList items={rows} />
    </div>
  );
}
