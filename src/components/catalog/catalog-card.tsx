import { Package } from "lucide-react";

import { formatINR } from "@/lib/format";
import type { CatalogueItem, CatalogueItemSize } from "@/lib/supabase/types";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CatalogForm } from "@/components/catalog/catalog-form";
import { Button } from "@/components/ui/button";

export interface CatalogCardData extends CatalogueItem {
  imageUrl: string | null;
  sizes: CatalogueItemSize[];
}

export function CatalogCard({ item }: { item: CatalogCardData }) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <Package className="size-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <CardTitle className="truncate text-lg leading-snug">{item.name}</CardTitle>
            <p className="truncate text-xs text-muted-foreground">{item.sku}</p>
          </div>
        </div>
        <CardAction>
          {!item.is_active ? (
            <Badge variant="outline" className="text-muted-foreground">
              Inactive
            </Badge>
          ) : null}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3">
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
