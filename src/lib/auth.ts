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

/** Viewers can read every floor they're granted, but never write. */
export async function canWrite() {
  const profile = await getCurrentProfile();
  return !!profile && profile.role !== "viewer";
}
