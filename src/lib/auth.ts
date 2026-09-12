import "server-only";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { FLOORS } from "@/lib/floors";
import type { FloorId, Profile, UserRole } from "@/lib/supabase/types";

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

/** Owner or Manager — the two roles with unrestricted page access (Manager's
 * one carve-out, Sales Data, is enforced separately in role_permissions). */
export async function canManageTeam() {
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
 * Whether the signed-in user can edit `targetRole`'s permission toggles on
 * `floorId`. Owner can edit any role. Head can edit Manager or Staff on a
 * floor they've been granted (Head is per-floor) — but never Head itself,
 * to avoid a Head self-editing or peer-editing another floor's Head.
 * Manager and Staff are never admins of this, regardless of target.
 */
export async function canManagePermissions(floorId: FloorId, targetRole: UserRole) {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  if (profile.role === "owner") return true;
  if (profile.role !== "head") return false;
  if (targetRole !== "manager" && targetRole !== "staff") return false;
  return canAccessFloor(floorId);
}
