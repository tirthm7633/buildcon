import "server-only";
import { redirect } from "next/navigation";

import { getNavItems, type NavItem } from "@/components/layout/nav-items";
import { createClient } from "@/lib/supabase/server";
import type { FloorConfig } from "@/lib/floors";
import type { FloorId, PageFeatureKey, Profile, UserRole } from "@/lib/supabase/types";

export type UserPermissionMap = Map<string, unknown>;

/**
 * One specific person's permission overrides on a floor. Owner is never
 * gated — callers should skip fetching entirely for it.
 */
export async function getUserPermissions(floorId: FloorId, userId: string): Promise<UserPermissionMap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_permissions")
    .select("permission_key, value")
    .eq("floor_id", floorId)
    .eq("user_id", userId);

  return new Map((data ?? []).map((row) => [row.permission_key, row.value]));
}

/**
 * Whether this person can see `item`: their own explicit override on this
 * floor wins if one exists; otherwise falls back to the item's coded
 * default for their role (from nav-items.ts) — a brand-new grant starts
 * from a sensible role-shaped default rather than everything off, so
 * Owner/Head only need to touch the toggles they want to change.
 */
export function resolveFeatureAccess(
  map: UserPermissionMap,
  role: UserRole,
  item: Pick<NavItem, "permissionKey" | "defaults">
): boolean {
  const value = map.get(item.permissionKey);
  if (value === undefined) return item.defaults?.[role] ?? true;
  return value === true;
}

/** Plain string[] of every key disabled for this person on this floor —
 * safe to pass from a Server Component into a Client Component (a Map
 * isn't). Owner is never gated. */
export function disabledKeysForUser(floor: FloorConfig, role: UserRole, map: UserPermissionMap): string[] {
  if (role === "owner") return [];
  return getNavItems(floor)
    .filter((item) => !resolveFeatureAccess(map, role, item))
    .map((item) => item.permissionKey);
}

/** Staff-only by design — see walk_ins.data_scope in the Team detail UI. */
export function resolveWalkInDataScope(map: UserPermissionMap): "all" | "own" {
  return map.get("walk_ins.data_scope") === "own" ? "own" : "all";
}

/**
 * Redirects home if this person doesn't have `key` enabled on this floor.
 * Call from any gated page, right after requireFloor(). Owner always
 * passes. The Today page (`/`) can't use this itself — see its own
 * fallback logic for what happens when Today itself is disabled.
 */
export async function requirePageAccess(
  floor: FloorConfig,
  profile: Pick<Profile, "id" | "role">,
  key: PageFeatureKey
): Promise<void> {
  if (profile.role === "owner") return;
  const item = getNavItems(floor).find((i) => i.permissionKey === key);
  if (!item) return;

  const map = await getUserPermissions(floor.id, profile.id);
  if (!resolveFeatureAccess(map, profile.role, item)) redirect("/");
}
