import "server-only";
import { redirect } from "next/navigation";

import { canAccessFloor, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { getFloorConfig, type FloorConfig } from "@/lib/floors";
import type { Profile } from "@/lib/supabase/types";

/**
 * Resolves the signed-in profile and the active floor for a page, redirecting
 * home if the user lacks access to the floor or the floor doesn't expose the
 * module the page belongs to (e.g. /catalog on the Kitchen floor).
 */
export async function requireFloor(moduleCheck?: (floor: FloorConfig) => boolean): Promise<{
  profile: Profile;
  floor: FloorConfig;
}> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const floorId = await getActiveFloorId();
  if (!(await canAccessFloor(floorId))) redirect("/");

  const floor = getFloorConfig(floorId);
  if (moduleCheck && !moduleCheck(floor)) redirect("/");

  return { profile, floor };
}
