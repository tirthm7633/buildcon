import "server-only";
import { redirect } from "next/navigation";

import { getNavItems, type NavItem } from "@/components/layout/nav-items";
import { createClient } from "@/lib/supabase/server";
import type { FloorConfig } from "@/lib/floors";
import type { FloorId, PageFeatureKey, UserRole } from "@/lib/supabase/types";

export type RolePermissionMap = Map<string, unknown>;

/**
 * The configured role_permissions overrides for a given role on a floor.
 * Owner is never gated — callers should skip fetching entirely for it.
 */
export async function getRolePermissions(floorId: FloorId, role: UserRole): Promise<RolePermissionMap> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("role_permissions")
    .select("permission_key, value")
    .eq("floor_id", floorId)
    .eq("role", role);

  return new Map((data ?? []).map((row) => [row.permission_key, row.value]));
}

/**
 * Whether `role` can see `item`, using the item's own coded default (from
 * nav-items.ts) when role_permissions has no override row yet. A role with
 * no entry in the item's `defaults` (e.g. Head, until it has its own spec)
 * defaults to full access — nothing is restricted until someone toggles it.
 */
export function resolveFeatureAccess(
  map: RolePermissionMap,
  role: UserRole,
  item: Pick<NavItem, "permissionKey" | "defaults">
): boolean {
  const value = map.get(item.permissionKey);
  if (value === undefined) return item.defaults?.[role] ?? true;
  return value === true;
}

/** Plain string[] of every key disabled for `role` on this floor — safe to
 * pass from a Server Component into a Client Component (a Map isn't).
 * Owner is never gated. */
export function disabledKeysForRole(floor: FloorConfig, role: UserRole, map: RolePermissionMap): string[] {
  if (role === "owner") return [];
  return getNavItems(floor)
    .filter((item) => !resolveFeatureAccess(map, role, item))
    .map((item) => item.permissionKey);
}

export function resolveWalkInDataScope(map: RolePermissionMap): "all" | "own" {
  return map.get("walk_ins.data_scope") === "own" ? "own" : "all";
}

/**
 * Redirects home if `role` doesn't have `key` enabled on this floor. Call
 * from any gated page, right after requireFloor(). Owner always passes.
 * The Today page (`/`) can't use this itself — see its own fallback logic
 * for what happens when Today itself is disabled for a role.
 */
export async function requirePageAccess(floor: FloorConfig, role: UserRole, key: PageFeatureKey): Promise<void> {
  if (role === "owner") return;
  const item = getNavItems(floor).find((i) => i.permissionKey === key);
  if (!item) return;

  const map = await getRolePermissions(floor.id, role);
  if (!resolveFeatureAccess(map, role, item)) redirect("/");
}
