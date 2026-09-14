import { Package } from "lucide-react";

import { formatINR } from "@/lib/format";
import type { CatalogueItem } from "@/lib/supabase/types";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CatalogForm } from "@/components/catalog/catalog-form";
import { Button } from "@/components/ui/button";

export interface CatalogCardData extends CatalogueItem {
  imageUrl: string | null;
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
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{item.size ?? "—"}</span>
          <span className="font-medium text-foreground">{formatINR(item.selling_price)} /{item.unit}</span>
        </div>
        <CatalogForm
          item={item}
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
