"use server";

import { revalidatePath } from "next/cache";

import { canAccessFloor, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { createClient } from "@/lib/supabase/server";
import type { FloorId } from "@/lib/supabase/types";
import { walkInSchema, type WalkInFormValues } from "@/lib/validations/walk-in";

function clean(values: WalkInFormValues) {
  return {
    ...values,
    whatsapp: values.whatsapp || null,
    email: values.email || null,
    company_name: values.company_name || null,
    address: values.address || null,
    category: values.category || null,
    requirements: values.requirements || null,
    budget_estimate: values.budget_estimate ?? null,
    expected_purchase_date: values.expected_purchase_date || null,
    follow_up_at: values.follow_up_at ? new Date(values.follow_up_at).toISOString() : null,
    assigned_to: values.assigned_to || null,
  };
}

export async function findDuplicateWalkIns(floorId: FloorId, phone: string, whatsapp?: string, email?: string) {
  const supabase = await createClient();
  const filters = [`phone.eq.${phone}`];
  if (whatsapp) filters.push(`whatsapp.eq.${whatsapp}`);
  if (email) filters.push(`email.eq.${email}`);

  const { data } = await supabase
    .from("walk_ins")
    .select("id, name, phone, status, created_at")
    .eq("floor_id", floorId)
    .or(filters.join(","))
    .limit(5);

  return data ?? [];
}

export async function createWalkIn(values: WalkInFormValues) {
  const parsed = walkInSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const floorId = await getActiveFloorId();
  if (!(await canAccessFloor(floorId))) return { error: "You don't have access to this floor." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("walk_ins")
    .insert({ ...clean(parsed.data), floor_id: floorId, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/walk-ins");
  revalidatePath("/");
  return { error: null, id: data.id as string };
}

export async function updateWalkIn(id: string, values: WalkInFormValues) {
  const parsed = walkInSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("walk_ins").select("status, floor_id").eq("id", id).single();

  const { error } = await supabase.from("walk_ins").update(clean(parsed.data)).eq("id", id);
  if (error) return { error: error.message };

  if (existing && existing.status !== parsed.data.status) {
    await supabase.from("activities").insert({
      floor_id: existing.floor_id,
      actor_id: profile.id,
      entity_type: "walk_in",
      entity_id: id,
      action: "status_changed",
      meta: { from: existing.status, to: parsed.data.status },
    });
  }

  revalidatePath("/walk-ins");
  revalidatePath(`/walk-ins/${id}`);
  revalidatePath("/");
  return { error: null };
}

export async function setWalkInStatus(id: string, status: WalkInFormValues["status"]) {
  const supabase = await createClient();
  const { error } = await supabase.from("walk_ins").update({ status }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/walk-ins");
  revalidatePath(`/walk-ins/${id}`);
  revalidatePath("/");
  return { error: null };
}

export async function deleteWalkIn(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("walk_ins").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/walk-ins");
  return { error: null };
}

export async function convertWalkInToCustomer(walkInId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data: walkIn, error: walkInError } = await supabase
    .from("walk_ins")
    .select("*")
    .eq("id", walkInId)
    .single();

  if (walkInError || !walkIn) return { error: walkInError?.message ?? "Walk-in not found" };
  if (walkIn.customer_id) return { error: null, id: walkIn.customer_id as string };

  const { data: customer, error } = await supabase
    .from("customers")
    .insert({
      floor_id: walkIn.floor_id,
      name: walkIn.name,
      phone: walkIn.phone,
      whatsapp: walkIn.whatsapp,
      email: walkIn.email,
      company_name: walkIn.company_name,
      address: walkIn.address,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("walk_ins").update({ customer_id: customer.id }).eq("id", walkInId);
  await supabase.from("activities").insert({
    floor_id: walkIn.floor_id,
    entity_type: "customer",
    entity_id: customer.id,
    actor_id: profile.id,
    action: "converted_from_walkin",
  });

  revalidatePath("/walk-ins");
  revalidatePath("/customers");
  return { error: null, id: customer.id as string };
}

export async function addWalkInActivity(walkInId: string, floorId: FloorId, note: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase.from("activities").insert({
    floor_id: floorId,
    entity_type: "walk_in",
    entity_id: walkInId,
    actor_id: profile.id,
    action: "note_added",
    meta: { note },
  });

  if (error) return { error: error.message };
  revalidatePath(`/walk-ins/${walkInId}`);
  return { error: null };
}
