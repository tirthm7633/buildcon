"use server";

import { revalidatePath } from "next/cache";

import { canAccessFloor, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { createClient } from "@/lib/supabase/server";
import { customerSchema, type CustomerFormValues } from "@/lib/validations/customer";

function clean(values: CustomerFormValues) {
  return {
    ...values,
    whatsapp: values.whatsapp || null,
    email: values.email || null,
    company_name: values.company_name || null,
    address: values.address || null,
    delivery_location: values.delivery_location || null,
    gstin: values.gstin || null,
    notes: values.notes || null,
  };
}

export async function createCustomer(values: CustomerFormValues) {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const floorId = await getActiveFloorId();
  if (!(await canAccessFloor(floorId))) return { error: "You don't have access to this floor." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ ...clean(parsed.data), floor_id: floorId, created_by: profile.id })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await supabase.from("activities").insert({
    floor_id: floorId,
    entity_type: "customer",
    entity_id: data.id,
    actor_id: profile.id,
    action: "customer_created",
  });

  revalidatePath("/customers");
  return { error: null, id: data.id as string };
}

export async function updateCustomer(id: string, values: CustomerFormValues) {
  const parsed = customerSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").update(clean(parsed.data)).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { error: null };
}

export async function archiveCustomer(id: string, archived: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("customers").update({ is_archived: archived }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
  return { error: null };
}

export async function addCustomerNote(customerId: string, note: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { data: customer } = await supabase.from("customers").select("floor_id").eq("id", customerId).single();
  if (!customer) return { error: "Customer not found" };

  const { error } = await supabase.from("activities").insert({
    floor_id: customer.floor_id,
    entity_type: "customer",
    entity_id: customerId,
    actor_id: profile.id,
    action: "note_added",
    meta: { note },
  });

  if (error) return { error: error.message };
  revalidatePath(`/customers/${customerId}`);
  return { error: null };
}
