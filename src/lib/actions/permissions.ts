"use server";

import { revalidatePath } from "next/cache";

import { canManagePermissions } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  setFeaturePermissionSchema,
  setWalkInsDataScopeSchema,
  type SetFeaturePermissionValues,
  type SetWalkInsDataScopeValues,
} from "@/lib/validations/permissions";

export async function setFeaturePermission(values: SetFeaturePermissionValues) {
  const parsed = setFeaturePermissionSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid input" };
  const { floorId, role, key, enabled } = parsed.data;

  if (!(await canManagePermissions(floorId, role))) {
    return { error: "You don't have permission to change this." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .upsert({ floor_id: floorId, role, permission_key: key, value: enabled }, { onConflict: "floor_id,role,permission_key" });
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { error: null };
}

/** Staff-only by design — Owner/Manager/Head always see every walk-in, and
 * nothing in the Manager or Head specs asked for this control. */
export async function setWalkInsDataScope(values: SetWalkInsDataScopeValues) {
  const parsed = setWalkInsDataScopeSchema.safeParse(values);
  if (!parsed.success) return { error: "Invalid input" };
  const { floorId, scope } = parsed.data;

  if (!(await canManagePermissions(floorId, "staff"))) {
    return { error: "Only the owner or this floor's head can change staff permissions." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("role_permissions")
    .upsert(
      { floor_id: floorId, role: "staff", permission_key: "walk_ins.data_scope", value: scope },
      { onConflict: "floor_id,role,permission_key" }
    );
  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/walk-ins");
  return { error: null };
}
