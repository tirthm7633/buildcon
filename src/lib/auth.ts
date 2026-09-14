import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { FLOORS } from "@/lib/floors";
import type { FloorId, Profile } from "@/lib/supabase/types";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  return data;
});

export async function isOwner() {
  const profile = await getCurrentProfile();
  return profile?.role === "owner";
}

/** Owner, Manager, and Head can all reach the Team section — Owner and
 * Manager see everyone, Head sees people sharing a floor with them (see
 * getManagedTeamMembers). Sales Data's Manager carve-out is unrelated,
 * enforced separately via nav-items.ts defaults. */
export async function canManageTeam() {
  const profile = await getCurrentProfile();
  return profile?.role === "owner" || profile?.role === "manager" || profile?.role === "head";
}

/** Narrower than canManageTeam — role changes, active/inactive status, and
 * inviting new people stay Owner/Manager only. Head's new capability is
 * scoped to floor access and feature permissions (see canManagePermissions),
 * not identity or membership changes. */
export async function canManageRoleAndStatus() {
  const profile = await getCurrentProfile();
  return profile?.role === "owner" || profile?.role === "manager";
}

export const getAccessibleFloorIds = cache(async (): Promise<FloorId[]> => {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  if (profile.role === "owner") return FLOORS.map((f) => f.id);

  const supabase = await createClient();
  const { data } = await supabase.from("user_floor_access").select("floor_id").eq("user_id", profile.id);
  return (data ?? []).map((row) => row.floor_id);
});

export async function canAccessFloor(floorId: FloorId) {
  const floors = await getAccessibleFloorIds();
  return floors.includes(floorId);
}

/**
 * Whether the signed-in user can set a customer's tier (VIP/Trade/Retail)
 * on `floorId`. Owner always can; Head only on a floor they themselves
 * have access to; Manager and Staff never. This mirrors the DB-level
 * guard on the customers table (see 0011_customer_tier.sql) — this
 * function only drives whether the UI shows the control as editable, the
 * trigger is the actual enforcement.
 */
export async function canManageCustomerTier(floorId: FloorId) {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  if (profile.role === "owner") return true;
  if (profile.role !== "head") return false;
  return canAccessFloor(floorId);
}

/**
 * Whether the signed-in user can edit `targetUserId`'s permissions on
 * `floorId` — both floor access itself and feature toggles within a floor
 * they already have. Owner can edit anyone. Head can edit a Staff or
 * Manager on a floor the Head themselves has access to — canAccessFloor
 * is inherently "a floor I have access to", so this can't reach outside
 * the Head's own floors — but never another Head or Owner, to avoid a
 * Head self-editing or peer-editing. Manager and Staff are never admins
 * of this, regardless of target.
 */
export async function canManagePermissions(floorId: FloorId, targetUserId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  if (profile.role === "owner") return true;
  if (profile.role !== "head") return false;
  if (!(await canAccessFloor(floorId))) return false;

  const supabase = await createClient();
  const { data: target } = await supabase.from("profiles").select("role").eq("id", targetUserId).single();
  return target?.role === "manager" || target?.role === "staff";
}

/**
 * People this viewer can see/manage on the Team section. Owner and Manager
 * see everyone. Head sees only Staff/Manager who share at least one floor
 * with them — not the whole company, and never another Head or Owner.
 */
export async function getManagedTeamMemberIds(): Promise<"all" | string[]> {
  const profile = await getCurrentProfile();
  if (!profile) return [];
  if (profile.role === "owner" || profile.role === "manager") return "all";
  if (profile.role !== "head") return [];

  const headFloors = await getAccessibleFloorIds();
  if (headFloors.length === 0) return [];

  const supabase = await createClient();
  const { data: access } = await supabase.from("user_floor_access").select("user_id").in("floor_id", headFloors);
  const candidateIds = [...new Set((access ?? []).map((row) => row.user_id))];
  if (candidateIds.length === 0) return [];

  const { data: eligible } = await supabase
    .from("profiles")
    .select("id")
    .in("id", candidateIds)
    .in("role", ["staff", "manager"]);

  return (eligible ?? []).map((row) => row.id);
}
