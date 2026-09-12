import { z } from "zod";

export const companySettingsSchema = z.object({
  company_name: z.string().trim().min(2, "Company name is required"),
  address: z.string().trim().optional().or(z.literal("")),
  city: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  gstin: z.string().trim().optional().or(z.literal("")),
  website: z.string().trim().optional().or(z.literal("")),
  bank_name: z.string().trim().optional().or(z.literal("")),
  bank_account_no: z.string().trim().optional().or(z.literal("")),
  bank_ifsc: z.string().trim().optional().or(z.literal("")),
  upi_id: z.string().trim().optional().or(z.literal("")),
  default_tax_percent: z.number().min(0).max(100),
  follow_up_default_days: z.number().min(0).max(60),
  quotation_terms: z.string().trim().optional().or(z.literal("")),
});

export type CompanySettingsFormValues = z.infer<typeof companySettingsSchema>;

export const inviteStaffSchema = z.object({
  full_name: z.string().trim().min(2, "Name is required"),
  email: z.string().trim().email("Enter a valid email"),
  role: z.enum(["owner", "floor_manager", "sales_executive", "accountant", "viewer"]),
  phone: z.string().trim().optional().or(z.literal("")),
  floor_ids: z.array(z.enum(["tiles", "sanitary", "kitchen", "furniture"])),
});

export type InviteStaffFormValues = z.infer<typeof inviteStaffSchema>;
