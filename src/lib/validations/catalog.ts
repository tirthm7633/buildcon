import { z } from "zod";

export const catalogItemSizeSchema = z.object({
  size: z.string().trim().min(1, "Size is required"),
  sku: z.string().trim().optional().or(z.literal("")),
  rate: z.number().nonnegative("Enter a valid rate"),
});

export type CatalogItemSizeValues = z.infer<typeof catalogItemSizeSchema>;

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  brand: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().min(1, "Unit is required"),
  gst_rate: z.number().nonnegative().max(100),
  image_url: z.string().trim().optional().or(z.literal("")),
  sizes: z.array(catalogItemSizeSchema).min(1, "Add at least one size"),
});

export type CatalogItemFormValues = z.infer<typeof catalogItemSchema>;
