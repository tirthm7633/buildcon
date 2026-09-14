"use server";

import { revalidatePath } from "next/cache";

import { canAccessFloor, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { createClient } from "@/lib/supabase/server";
import type { FloorId } from "@/lib/supabase/types";
import { selectionHeaderSchema, selectionItemSchema, type SelectionHeaderValues } from "@/lib/validations/quotation";

function cleanHeader(values: SelectionHeaderValues) {
  return {
    customer_id: values.customer_id || null,
    customer_name: values.customer_name,
    customer_phone: values.customer_phone,
    customer_address: values.customer_address || null,
    reference: values.reference || null,
    attended_by: values.attended_by === "none" ? null : values.attended_by,
  };
}

/** Creates a Selection — a quotations row in status 'draft'. Reserves a
 * real quotation number immediately (the same per-floor sequence already
 * used everywhere else) since "Selection/Quotation No." is one number for
 * the document's whole lifecycle, not reissued when it's later approved. */
export async function createSelection(values: SelectionHeaderValues) {
  const parsed = selectionHeaderSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const floorId = await getActiveFloorId();
  if (!(await canAccessFloor(floorId))) return { error: "You don't have access to this floor." };

  const supabase = await createClient();
  const { data: numberData, error: numberError } = await supabase.rpc("generate_quotation_number", {
    p_floor_id: floorId,
  });
  if (numberError) return { error: numberError.message };

  const { data, error } = await supabase
    .from("quotations")
    .insert({
      ...cleanHeader(parsed.data),
      floor_id: floorId,
      quotation_number: numberData as string,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/quotations");
  return { error: null, id: data.id as string };
}

export async function updateSelectionHeader(id: string, values: SelectionHeaderValues) {
  const parsed = selectionHeaderSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase.from("quotations").update(cleanHeader(parsed.data)).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { error: null };
}

export async function addSelectionItem(quotationId: string, values: unknown, position: number) {
  const parsed = selectionItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quotation_items")
    .insert({
      quotation_id: quotationId,
      catalogue_item_id: parsed.data.catalogue_item_id,
      description: parsed.data.description,
      section: parsed.data.section || null,
      rate: parsed.data.rate,
      unit: "sq.ft",
      position,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotationId}`);
  return { error: null, id: data.id as string };
}

export async function updateSelectionItem(itemId: string, quotationId: string, values: unknown) {
  const parsed = selectionItemSchema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("quotation_items")
    .update({
      catalogue_item_id: parsed.data.catalogue_item_id,
      description: parsed.data.description,
      section: parsed.data.section || null,
      rate: parsed.data.rate,
    })
    .eq("id", itemId);

  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotationId}`);
  return { error: null };
}

export async function removeSelectionItem(itemId: string, quotationId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("quotation_items").delete().eq("id", itemId);
  if (error) return { error: error.message };

  revalidatePath(`/quotations/${quotationId}`);
  return { error: null };
}

/** The only status transition this feature needs: draft (Selection) →
 * awaiting_approval (Quotation). Nothing is copied or deleted — the same
 * row just now shows up in the Quotations view instead of Selections,
 * since those are just two filtered views of quotations.status. */
export async function approveSelection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("quotations").update({ status: "awaiting_approval" }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { error: null };
}

/** Live search for the customer picker — floor-scoped, matched on name or
 * phone. Selecting a result prefills the editable name/phone/address
 * snapshot; it isn't a lock to that record. */
export async function searchCustomers(floorId: FloorId, query: string) {
  const supabase = await createClient();
  let builder = supabase
    .from("customers")
    .select("id, name, phone, address")
    .eq("floor_id", floorId)
    .eq("is_archived", false)
    .order("name")
    .limit(20);

  const q = query.trim();
  if (q) builder = builder.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);

  const { data } = await builder;
  return data ?? [];
}
