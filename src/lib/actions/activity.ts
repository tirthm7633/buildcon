"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FloorId } from "@/lib/supabase/types";

/** Staff/medium/timestamp record for the accountability timeline — who
 * reached out, how, and when. Call/WhatsApp fire this alongside their
 * tel:/wa.me navigation (best-effort proxy for "contact was initiated";
 * there's no way to confirm a call was answered). In-person has no
 * browser signal at all, so it's always logged explicitly. Shared across
 * every entity with a timeline (walk-ins, customers, ...) since the
 * activities table is already entity-agnostic. */
export async function logContact(
  entityType: "walk_in" | "customer",
  entityId: string,
  floorId: FloorId,
  medium: "call" | "whatsapp" | "in_person",
  note?: string
) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    floor_id: floorId,
    entity_type: entityType,
    entity_id: entityId,
    actor_id: profile.id,
    action: "contact_logged",
    meta: note ? { medium, note } : { medium },
  });

  if (error) return { error: error.message };

  const basePath = entityType === "walk_in" ? "/walk-ins" : "/customers";
  revalidatePath(`${basePath}/${entityId}`);
  revalidatePath(basePath);
  return { error: null };
}
