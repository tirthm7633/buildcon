"use server";

import { revalidatePath } from "next/cache";

import { isOwner } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FloorId, UserRole } from "@/lib/supabase/types";
import {
  companySettingsSchema,
  inviteStaffSchema,
  type CompanySettingsFormValues,
  type InviteStaffFormValues,
} from "@/lib/validations/settings";

function clean(values: CompanySettingsFormValues) {
  return {
    ...values,
    address: values.address || null,
    city: values.city || null,
    phone: values.phone || null,
    email: values.email || null,
    gstin: values.gstin || null,
    website: values.website || null,
    bank_name: values.bank_name || null,
    bank_account_no: values.bank_account_no || null,
    bank_ifsc: values.bank_ifsc || null,
    upi_id: values.upi_id || null,
    quotation_terms: values.quotation_terms || null,
  };
}

export async function updateCompanySettings(values: CompanySettingsFormValues) {
  if (!(await isOwner())) return { error: "Only the owner can update company settings." };

  const parsed = companySettingsSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("company_settings").update(clean(parsed.data)).eq("id", true);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function updateCompanyLogo(logoUrl: string) {
  if (!(await isOwner())) return { error: "Only the owner can update company settings." };

  const supabase = await createClient();
  const { error } = await supabase.from("company_settings").update({ logo_url: logoUrl }).eq("id", true);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function inviteStaffMember(values: InviteStaffFormValues) {
  if (!(await isOwner())) return { error: "Only the owner can invite staff." };

  const parsed = inviteStaffSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const admin = createAdminClient();
  const { data: invited, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: { full_name: parsed.data.full_name, role: parsed.data.role },
  });

  if (error) return { error: error.message };

  if (invited.user && parsed.data.floor_ids.length) {
    const supabase = await createClient();
    await supabase
      .from("user_floor_access")
      .insert(parsed.data.floor_ids.map((floor_id) => ({ user_id: invited.user!.id, floor_id })));
  }

  revalidatePath("/settings");
  return { error: null };
}

export async function updateStaffRole(id: string, role: UserRole) {
  if (!(await isOwner())) return { error: "Only the owner can change roles." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function setStaffActive(id: string, isActive: boolean) {
  if (!(await isOwner())) return { error: "Only the owner can update staff." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function setStaffFloorAccess(userId: string, floorIds: FloorId[]) {
  if (!(await isOwner())) return { error: "Only the owner can update floor access." };

  const supabase = await createClient();
  await supabase.from("user_floor_access").delete().eq("user_id", userId);
  if (floorIds.length) {
    const { error } = await supabase
      .from("user_floor_access")
      .insert(floorIds.map((floor_id) => ({ user_id: userId, floor_id })));
    if (error) return { error: error.message };
  }

  revalidatePath("/settings");
  return { error: null };
}
