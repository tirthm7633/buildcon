import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  phone: z.string().trim().min(10, "Enter a valid phone number").max(15, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  company_name: z.string().trim().optional().or(z.literal("")),
  address: z.string().trim().optional().or(z.literal("")),
  delivery_location: z.string().trim().optional().or(z.literal("")),
  gstin: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
  tier: z.enum(["vip", "trade", "retail"]),
});

export type CustomerFormValues = z.infer<typeof customerSchema>;
