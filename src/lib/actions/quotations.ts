"use server";

import { revalidatePath } from "next/cache";

import { canAccessFloor, getCurrentProfile } from "@/lib/auth";
import { getActiveFloorId } from "@/lib/floor-context";
import { createClient } from "@/lib/supabase/server";
import type { FloorId } from "@/lib/supabase/types";
import { selectionItemSchema } from "@/lib/validations/quotation";

/** Creates an empty Selection — a quotations row in status 'draft' — or,
 * when `startAsQuotation` is set, the same row starting directly at
 * 'awaiting_approval' for a customer who doesn't need the Selection stage.
 * Nothing is asked upfront: the document opens immediately with its number
 * already reserved (the same per-floor sequence used everywhere else, one
 * number for the whole document lifecycle) and every field — customer
 * included — is filled in afterward, in place, on the document itself. */
export async function createEmptyQuotation(startAsQuotation = false) {
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
      floor_id: floorId,
      quotation_number: numberData as string,
      created_by: profile.id,
      customer_name: "",
      customer_phone: "",
      ...(startAsQuotation ? { status: "awaiting_approval" as const } : {}),
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/quotations");
  return { error: null, id: data.id as string };
}

type QuotationTextField = "customer_name" | "customer_phone" | "customer_address" | "reference" | "attended_by";

/** Saves one header field in place — the document has no separate "edit
 * form" to submit, each field commits on its own as soon as you leave it,
 * the same pattern already used for a line item's Area/Size. */
export async function updateQuotationField(id: string, field: QuotationTextField, value: string) {
  const supabase = await createClient();
  const table = supabase.from("quotations");

  const { error } =
    field === "customer_name"
      ? await table.update({ customer_name: value }).eq("id", id)
      : field === "customer_phone"
        ? await table.update({ customer_phone: value }).eq("id", id)
        : field === "customer_address"
          ? await table.update({ customer_address: value || null }).eq("id", id)
          : field === "reference"
            ? await table.update({ reference: value || null }).eq("id", id)
            : await table.update({ attended_by: value === "none" || !value ? null : value }).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { error: null };
}

/** Picking an existing customer sets name/phone/address together in one
 * save — the fields stay editable snapshots afterward, not locked to the
 * customer record. */
export async function applyCustomerPick(
  id: string,
  customer: { id: string; name: string; phone: string; address: string | null }
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .update({
      customer_id: customer.id,
      customer_name: customer.name,
      customer_phone: customer.phone,
      customer_address: customer.address ?? null,
    })
    .eq("id", id);
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
      size: parsed.data.size || null,
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
      size: parsed.data.size || null,
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

/** Locks the document from further editing and — for a Selection still in
 * draft — moves it into the Quotations view. A Quotation created directly
 * (skipping the Selection stage) is already in that view but starts
 * unlocked, since it's still empty; this is what finalizes it. Nothing is
 * copied or deleted either way — the same row just changes in place.
 * `locked_at` (not status) is the actual "locked" marker, since a direct
 * Quotation and an approved Selection both end up at the same status. */
export async function approveSelection(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quotations")
    .update({ status: "awaiting_approval", locked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
  return { error: null };
}

/** Permanently removes a Quotation (and its line items, via cascade). RLS
 * is the real gate here (Owner/Head/Manager, not Staff — see migration
 * 0015); this action just surfaces whatever the database decides. */
export async function deleteQuotation(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/quotations");
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
