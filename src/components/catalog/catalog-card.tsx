import { formatINR } from "@/lib/format";
import type { CatalogueItem, CatalogueItemSize } from "@/lib/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CatalogForm } from "@/components/catalog/catalog-form";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/shared/product-image";

export interface CatalogCardData extends CatalogueItem {
  imageUrl: string | null;
  sizes: CatalogueItemSize[];
}

export function CatalogCard({ item }: { item: CatalogCardData }) {
  return (
    <Card className="gap-3 pt-0">
      <div className="relative">
        <ProductImage
          src={item.imageUrl}
          alt={item.name}
          className="aspect-square w-full rounded-none rounded-t-xl border-0"
          iconClassName="size-10"
        />
        {!item.is_active ? (
          <Badge variant="outline" className="absolute top-2 right-2 bg-background text-muted-foreground">
            Inactive
          </Badge>
        ) : null}
      </div>
      <CardContent className="space-y-3">
        <div className="min-w-0">
          <p className="truncate font-heading text-lg font-medium leading-snug text-foreground">{item.name}</p>
          <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
        </div>
        {item.sizes.length > 1 ? (
          <div className="space-y-1 text-sm">
            {item.sizes.map((s) => (
              <div key={s.id} className="flex items-center justify-between">
                <span className="text-muted-foreground">{s.size}</span>
                <span className="font-medium text-foreground">
                  {formatINR(s.rate)} /{item.unit}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{item.sizes[0]?.size ?? "—"}</span>
            <span className="font-medium text-foreground">
              {formatINR(item.sizes[0]?.rate ?? 0)} /{item.unit}
            </span>
          </div>
        )}
        <CatalogForm
          item={item}
          sizes={item.sizes}
          imageUrl={item.imageUrl}
          trigger={
            <Button variant="outline" size="sm" className="w-full">
              Edit
            </Button>
          }
        />
      </CardContent>
    </Card>
  );
}
