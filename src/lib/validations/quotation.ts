import { z } from "zod";

import type { Quotation } from "@/lib/supabase/types";

export const selectionItemSchema = z.object({
  catalogue_item_id: z.string().uuid("Select a product"),
  description: z.string().trim().min(1, "Product is required"),
  section: z.string().trim().optional().or(z.literal("")),
  size: z.string().trim().optional().or(z.literal("")),
  rate: z.number().nonnegative("Enter a valid rate"),
});

export type SelectionItemValues = z.infer<typeof selectionItemSchema>;

/** Customer name/phone/address and attended-by are what the customer and
 * staff both need to have supplied before a document is finalized. Shared
 * between the server action (the actual gate) and the client action button
 * (instant feedback, no round trip) — not a "use server" export, since a
 * plain sync helper can't be imported from one into a client component. */
export function quotationRequiredFieldsError(
  q: Pick<Quotation, "customer_name" | "customer_phone" | "customer_address" | "attended_by">
): string | null {
  if (!q.customer_name?.trim()) return "Customer name is required.";
  if (!q.customer_phone?.trim()) return "Contact number is required.";
  if (!q.customer_address?.trim()) return "Address is required.";
  if (!q.attended_by) return "Attended by is required.";
  return null;
}
