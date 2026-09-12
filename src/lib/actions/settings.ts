"use server";

import { revalidatePath } from "next/cache";

import { canManageTeam, isOwner } from "@/lib/auth";
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
  if (!(await canManageTeam())) return { error: "Only the owner or a manager can invite staff." };

  const parsed = inviteStaffSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  if (parsed.data.role === "owner") return { error: "Ownership can't be granted through an invite." };

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
  if (!(await canManageTeam())) return { error: "Only the owner or a manager can change roles." };
  if (role === "owner") return { error: "Ownership can't be reassigned here." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", id).single();
  if (target?.role === "owner") return { error: "The owner's role can't be changed." };

  const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

export async function setStaffActive(id: string, isActive: boolean) {
  if (!(await canManageTeam())) return { error: "Only the owner or a manager can update staff." };

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", id).single();
  if (target?.role === "owner") return { error: "The owner's status can't be changed." };

  const { error } = await supabase.from("profiles").update({ is_active: isActive }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/settings");
  return { error: null };
}

/** No owner-targeting guard needed here, unlike the actions above — Owner's
 * floor access is never read from this table (getAccessibleFloorIds short-
 * circuits to all floors for role === 'owner'), so editing it is a no-op. */
export async function setStaffFloorAccess(userId: string, floorIds: FloorId[]) {
  if (!(await canManageTeam())) return { error: "Only the owner or a manager can update floor access." };

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
