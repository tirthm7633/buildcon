"use server";

import { revalidatePath } from "next/cache";

import { canManagePermissions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  setUserFeaturePermissionSchema,
  setUserFloorAccessSchema,
  setUserWalkInsDataScopeSchema,
  type SetUserFeaturePermissionValues,
  type SetUserFloorAccessValues,
  type SetUserWalkInsDataScopeValues,
} from "@/lib/validations/permissions";

export async function setUserFeaturePermission(values: SetUserFeaturePermissionValues) {
  const parsed = setUserFeaturePermissionSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid input" };
  const { userId, floorId, key, enabled } = parsed.data;

  if (!(await canManagePermissions(floorId, userId))) {
    return { error: "You don't have permission to change this." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_permissions")
    .upsert(
      { user_id: userId, floor_id: floorId, permission_key: key, value: enabled },
      { onConflict: "user_id,floor_id,permission_key" }
    );
  if (error) return { error: error.message };

  revalidatePath("/team");
  revalidatePath("/", "layout");
  return { error: null };
}

/** Staff-only by design — Owner/Manager/Head always see every walk-in, and
 * nothing in the Manager or Head specs asked for this control. */
export async function setUserWalkInsDataScope(values: SetUserWalkInsDataScopeValues) {
  const parsed = setUserWalkInsDataScopeSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid input" };
  const { userId, floorId, scope } = parsed.data;

  if (!(await canManagePermissions(floorId, userId))) {
    return { error: "You don't have permission to change this." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("user_permissions")
    .upsert(
      { user_id: userId, floor_id: floorId, permission_key: "walk_ins.data_scope", value: scope },
      { onConflict: "user_id,floor_id,permission_key" }
    );
  if (error) return { error: error.message };

  revalidatePath("/team");
  revalidatePath("/walk-ins");
  return { error: null };
}

/** Grants or revokes ONE floor for ONE person — deliberately not a
 * bulk-replace of their whole floor list. A Head editing this person's
 * Tiles access must never be able to silently wipe a Sanitary grant they
 * have no authority over just because that floor wasn't in the Head's own
 * form state. */
export async function setUserFloorAccess(values: SetUserFloorAccessValues) {
  const parsed = setUserFloorAccessSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid input" };
  const { userId, floorId, enabled } = parsed.data;

  if (!(await canManagePermissions(floorId, userId))) {
    return { error: "You don't have permission to change this." };
  }

  const supabase = await createClient();
  if (enabled) {
    const { error } = await supabase.from("user_floor_access").upsert(
      { user_id: userId, floor_id: floorId },
      { onConflict: "user_id,floor_id" }
    );
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("user_floor_access").delete().eq("user_id", userId).eq("floor_id", floorId);
    if (error) return { error: error.message };
  }

  revalidatePath("/team");
  revalidatePath("/", "layout");
  return { error: null };
}
