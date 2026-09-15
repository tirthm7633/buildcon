"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Transfers a Quotation into a real Tile Order — a different table, not
 * another status on the same row, so this genuinely copies data across
 * (unlike the Selection→Quotation move, which is just a status flip on one
 * row). Once placed, the Quotation is marked 'accepted' so it drops out of
 * both the Selections and Quotations views; the order is what's tracked
 * from here on. A Quotation can exist with only a name/phone snapshot, but
 * tile_orders requires a real Customer, so one is created from that
 * snapshot first if the Quotation was never linked to one. */
export async function placeOrder(quotationId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();

  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", quotationId)
    .single();
  if (quotationError || !quotation) return { error: quotationError?.message ?? "Quotation not found." };

  const { data: itemsRaw, error: itemsError } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", quotationId)
    .order("position");
  if (itemsError) return { error: itemsError.message };
  const items = itemsRaw ?? [];
  if (!items.length) return { error: "Add at least one product before placing the order." };

  let customerId = quotation.customer_id;
  if (!customerId) {
    const { data: newCustomer, error: customerError } = await supabase
      .from("customers")
      .insert({
        floor_id: quotation.floor_id,
        name: quotation.customer_name,
        phone: quotation.customer_phone,
        address: quotation.customer_address,
        created_by: profile.id,
      })
      .select("id")
      .single();
    if (customerError) return { error: customerError.message };
    customerId = newCustomer.id as string;
  }

  const { data: numberData, error: numberError } = await supabase.rpc("generate_order_number");
  if (numberError) return { error: numberError.message };

  // quotations.total isn't kept in sync as items are added/removed, so it
  // can't be trusted here — sum the items' own generated `amount` instead.
  const orderValue = items.reduce((sum, item) => sum + Number(item.amount), 0);

  const { data: order, error: orderError } = await supabase
    .from("tile_orders")
    .insert({
      floor_id: quotation.floor_id,
      order_number: numberData as string,
      customer_id: customerId,
      quotation_id: quotation.id,
      order_value: orderValue,
      delivery_address: quotation.customer_address,
      sales_executive: quotation.attended_by,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (orderError) return { error: orderError.message };

  const orderItems = items.map((item) => ({
    tile_order_id: order.id,
    catalogue_item_id: item.catalogue_item_id,
    description: item.description,
    size: item.size,
    section: item.section,
    unit: item.unit,
    quantity: item.quantity,
    rate: item.rate,
  }));
  const { error: orderItemsError } = await supabase.from("tile_order_items").insert(orderItems);
  if (orderItemsError) return { error: orderItemsError.message };

  const { error: updateError } = await supabase
    .from("quotations")
    .update({
      status: "accepted",
      decided_at: new Date().toISOString(),
      locked_at: quotation.locked_at ?? new Date().toISOString(),
      customer_id: customerId,
    })
    .eq("id", quotationId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/quotations");
  revalidatePath("/orders");
  return { error: null, orderId: order.id as string };
}
