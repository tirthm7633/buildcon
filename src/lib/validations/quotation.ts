import { z } from "zod";

export const selectionHeaderSchema = z.object({
  customer_id: z.string().uuid().optional().nullable(),
  customer_name: z.string().trim().min(2, "Customer name is required"),
  customer_phone: z.string().trim().min(10, "Enter a valid phone number").max(15, "Enter a valid phone number"),
  customer_address: z.string().trim().optional().or(z.literal("")),
  reference: z.string().trim().optional().or(z.literal("")),
  /** "none" or a Head/Manager's profile id — never empty, same pattern as
   * walk_ins.attended_by. */
  attended_by: z.string().min(1, "Select who attended, or choose None"),
});

export type SelectionHeaderValues = z.infer<typeof selectionHeaderSchema>;

export const selectionItemSchema = z.object({
  catalogue_item_id: z.string().uuid("Select a product"),
  description: z.string().trim().min(1, "Product is required"),
  section: z.string().trim().optional().or(z.literal("")),
  rate: z.number().nonnegative("Enter a valid rate"),
});

export type SelectionItemValues = z.infer<typeof selectionItemSchema>;
