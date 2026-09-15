import { z } from "zod";

export const selectionItemSchema = z.object({
  catalogue_item_id: z.string().uuid("Select a product"),
  description: z.string().trim().min(1, "Product is required"),
  section: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().optional().or(z.literal("")),
  rate: z.number().nonnegative("Enter a valid rate"),
});

export type SelectionItemValues = z.infer<typeof selectionItemSchema>;
