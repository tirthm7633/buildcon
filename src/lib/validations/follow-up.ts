import { z } from "zod";

export const followUpSchema = z.object({
  entity_type: z.enum(["walk_in", "customer", "quotation", "tile_order", "purchase", "payment"]),
  entity_id: z.string().uuid(),
  customer_id: z.string().uuid().optional().nullable(),
  due_at: z.string().min(1, "Pick a due date and time"),
  assigned_to: z.string().uuid().optional().nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  type: z.enum([
    "call",
    "whatsapp",
    "email",
    "showroom_visit",
    "quotation_follow_up",
    "payment_reminder",
    "delivery_confirmation",
    "other",
  ]),
  notes: z.string().trim().optional().or(z.literal("")),
});

export type FollowUpFormValues = z.infer<typeof followUpSchema>;
