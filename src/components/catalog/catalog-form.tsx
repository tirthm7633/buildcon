"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import { createCatalogItem, updateCatalogItem } from "@/lib/actions/catalog";
import { catalogItemSchema, type CatalogItemFormValues } from "@/lib/validations/catalog";
import { createClient } from "@/lib/supabase/client";
import type { CatalogueItem, CatalogueItemSize } from "@/lib/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

function toFormValues(item?: CatalogueItem, sizes?: CatalogueItemSize[], imageUrl?: string | null): CatalogItemFormValues {
  return {
    name: item?.name ?? "",
    sku: item?.sku ?? "",
    brand: item?.brand ?? "",
    category: item?.category ?? "",
    unit: item?.unit ?? "sq.ft",
    gst_rate: item?.gst_rate ?? 18,
    image_url: imageUrl ?? "",
    sizes: sizes?.length
      ? sizes.map((s) => ({ size: s.size, sku: s.sku ?? "", rate: s.rate }))
      : [{ size: "", sku: "", rate: 0 }],
  };
}

export function CatalogForm({
  item,
  sizes,
  imageUrl,
  trigger,
}: {
  item?: CatalogueItem;
  sizes?: CatalogueItemSize[];
  imageUrl?: string | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(imageUrl ?? "");
  const fileRef = useRef<HTMLInputElement>(null);

  const form = useForm<CatalogItemFormValues>({
    resolver: zodResolver(catalogItemSchema),
    defaultValues: toFormValues(item, sizes, imageUrl),
  });
  const sizeFields = useFieldArray({ control: form.control, name: "sizes" });

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      form.reset(toFormValues(item, sizes, imageUrl));
      setPreviewUrl(imageUrl ?? "");
    }
  }

  async function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const supabase = createClient();
    const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "-")}`;
    const { error } = await supabase.storage.from("catalogue").upload(path, file, { upsert: true });
    setIsUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const { data } = supabase.storage.from("catalogue").getPublicUrl(path);
    form.setValue("image_url", data.publicUrl);
    setPreviewUrl(data.publicUrl);
  }

  function onSubmit(values: CatalogItemFormValues) {
    startTransition(async () => {
      const result = item ? await updateCatalogItem(item.id, values) : await createCatalogItem(values);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success(item ? "Product updated" : "Product added");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? "Edit product" : "Add a product"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="size-full object-cover" />
                ) : (
                  <Upload className="size-5 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  Upload image
                </Button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Product name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="sq.ft" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="gst_rate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>GST %</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <FormLabel>Sizes &amp; rates</FormLabel>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => sizeFields.append({ size: "", sku: "", rate: 0 })}
                >
                  <Plus className="size-4" />
                  Add another size
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add one row per size this design comes in — e.g. 600x600mm and 800x800mm at different rates.
              </p>

              {sizeFields.fields.map((sizeField, index) => (
                <div key={sizeField.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.size`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="e.g. 600x600mm" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`sizes.${index}.rate`}
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Rate / sq.ft"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value === "" ? 0 : Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="mt-0.5"
                    onClick={() => sizeFields.remove(index)}
                    disabled={sizeFields.fields.length === 1}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || isUploading}>
                {isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                {item ? "Save changes" : "Add product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
