"use client";

import { useState } from "react";
import { Package } from "lucide-react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/** A thumbnail that opens a large preview on click — used anywhere a
 * product image shows up (Catalog, Selections, Quotations) so people can
 * actually see the tile/design before picking it. */
export function ProductImage({
  src,
  alt = "",
  className,
  iconClassName,
}: {
  src: string | null;
  alt?: string;
  className?: string;
  iconClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => src && setOpen(true)}
        disabled={!src}
        className={cn(
          "flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted",
          src && "cursor-zoom-in",
          className
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="size-full object-cover" />
        ) : (
          <Package className={cn("size-6 text-muted-foreground", iconClassName)} />
        )}
      </button>

      {src ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-3xl bg-transparent p-0 ring-0" showCloseButton>
            <DialogTitle className="sr-only">{alt || "Product image"}</DialogTitle>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className="max-h-[85vh] w-full rounded-xl object-contain" />
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
