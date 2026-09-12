"use server";

import { revalidatePath } from "next/cache";

import { getActiveFloorId } from "@/lib/floor-context";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FollowUpStatus } from "@/lib/supabase/types";
import { followUpSchema, type FollowUpFormValues } from "@/lib/validations/follow-up";

function clean(values: FollowUpFormValues) {
  return {
    ...values,
    customer_id: values.customer_id || null,
    assigned_to: values.assigned_to || null,
    notes: values.notes || null,
    due_at: new Date(values.due_at).toISOString(),
  };
}

export async function createFollowUp(values: FollowUpFormValues) {
  const parsed = followUpSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const floorId = await getActiveFloorId();
  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_ups")
    .insert({ ...clean(parsed.data), floor_id: floorId, created_by: profile.id });

  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { error: null };
}

export async function updateFollowUp(id: string, values: FollowUpFormValues) {
  const parsed = followUpSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").update(clean(parsed.data)).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { error: null };
}

export async function completeFollowUp(id: string, outcomeNote?: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_ups")
    .update({ status: "completed", completed_at: new Date().toISOString(), outcome_note: outcomeNote || null })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { error: null };
}

export async function setFollowUpStatus(id: string, status: FollowUpStatus) {
  const supabase = await createClient();
  const patch: { status: FollowUpStatus; completed_at?: string | null } = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();
  if (status === "pending") patch.completed_at = null;

  const { error } = await supabase.from("follow_ups").update(patch).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { error: null };
}

export async function rescheduleFollowUp(id: string, dueAtLocal: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("follow_ups")
    .update({ due_at: new Date(dueAtLocal).toISOString() })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { error: null };
}

export async function reassignFollowUp(id: string, assignedTo: string | null) {
  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").update({ assigned_to: assignedTo }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  return { error: null };
}

export async function deleteFollowUp(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("follow_ups").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/follow-ups");
  revalidatePath("/");
  return { error: null };
}
