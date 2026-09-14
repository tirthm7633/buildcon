import { z } from "zod";

export const walkInSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(15, "Enter a valid phone number"),
  alternate_phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  company_name: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().min(1, "Address is required"),
  city: z.string().trim().min(1, "City is required"),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter a valid 6-digit pincode")
    .optional()
    .or(z.literal("")),
  referred_by: z.string().trim().optional().or(z.literal("")),
  source: z.enum(["walk_in", "referral", "instagram", "whatsapp", "website", "call", "architect", "builder", "other"]),
  category: z.string().trim().optional().or(z.literal("")),
  requirements: z.string().trim().optional().or(z.literal("")),
  budget_estimate: z.number().nonnegative().optional().nullable(),
  expected_purchase_date: z.string().optional().or(z.literal("")),
  status: z.enum([
    "new",
    "contacted",
    "visit_completed",
    "quotation_required",
    "quotation_sent",
    "negotiation",
    "won",
    "lost",
  ]),
  follow_up_at: z.string().optional().or(z.literal("")),
  /** "none" or a Head/Manager's profile id — never empty. The Select has
   * no default value on create, so an untouched field fails this and
   * blocks submission, same as any other required field. */
  attended_by: z.string().min(1, "Select who attended, or choose None"),
});

export type WalkInFormValues = z.infer<typeof walkInSchema>;
