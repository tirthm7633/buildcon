import { z } from "zod";

export const catalogItemSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  sku: z.string().trim().min(1, "SKU is required"),
  brand: z.string().trim().optional().or(z.literal("")),
  category: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().optional().or(z.literal("")),
  unit: z.string().trim().min(1, "Unit is required"),
  selling_price: z.number().nonnegative("Enter a valid rate"),
  gst_rate: z.number().nonnegative().max(100),
  image_url: z.string().trim().optional().or(z.literal("")),
});

export type CatalogItemFormValues = z.infer<typeof catalogItemSchema>;
