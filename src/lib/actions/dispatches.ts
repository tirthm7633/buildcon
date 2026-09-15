"use server";

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { FloorId } from "@/lib/supabase/types";

function revalidateDispatchPaths(orderId: string) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/orders/dispatches");
  revalidatePath("/orders/register");
}

/** Ships some or all of a released product's remaining boxes to the
 * customer — a product commonly leaves in more than one batch, so this can
 * be called again later for whatever's left. Each call is its own dispatch
 * with its own chalan, the real paperwork that travels with the shipment. */
export async function createDispatch(
  orderId: string,
  itemId: string,
  boxes: number,
  vehicle: string,
  driver: string
) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };
  if (!(boxes > 0)) return { error: "Enter a box count greater than 0." };

  const supabase = await createClient();

  const { data: item, error: itemError } = await supabase
    .from("tile_order_items")
    .select("boxes_ordered, released_at, tile_order_id, tile_orders(floor_id)")
    .eq("id", itemId)
    .single();
  if (itemError || !item) return { error: itemError?.message ?? "Item not found." };
  if (!item.released_at) return { error: "Release this product before dispatching it." };

  const floorId = (item.tile_orders as unknown as { floor_id: FloorId } | null)?.floor_id;
  if (!floorId) return { error: "Order not found." };

  const { data: priorItems, error: priorError } = await supabase
    .from("tile_dispatch_items")
    .select("boxes")
    .eq("tile_order_item_id", itemId);
  if (priorError) return { error: priorError.message };

  const alreadyDispatched = (priorItems ?? []).reduce((sum, d) => sum + Number(d.boxes), 0);
  const remaining = Number(item.boxes_ordered ?? 0) - alreadyDispatched;
  if (boxes > remaining) return { error: `Only ${remaining} box(es) remain to dispatch on this product.` };

  const [{ data: dispatchNumber, error: dispatchNumberError }, { data: chalanNumber, error: chalanNumberError }] =
    await Promise.all([supabase.rpc("generate_dispatch_number"), supabase.rpc("generate_chalan_number")]);
  if (dispatchNumberError) return { error: dispatchNumberError.message };
  if (chalanNumberError) return { error: chalanNumberError.message };

  const { data: dispatch, error: dispatchError } = await supabase
    .from("tile_dispatches")
    .insert({
      floor_id: floorId,
      tile_order_id: orderId,
      dispatch_number: dispatchNumber as string,
      chalan_number: chalanNumber as string,
      vehicle: vehicle || null,
      driver: driver || null,
      created_by: profile.id,
    })
    .select("id")
    .single();
  if (dispatchError) return { error: dispatchError.message };

  const { error: dispatchItemError } = await supabase
    .from("tile_dispatch_items")
    .insert({ tile_dispatch_id: dispatch.id, tile_order_item_id: itemId, boxes });
  if (dispatchItemError) return { error: dispatchItemError.message };

  revalidateDispatchPaths(orderId);
  return { error: null, dispatchId: dispatch.id as string };
}

/** Confirms a dispatch actually reached the customer — separate from
 * leaving the warehouse, since a truck in transit isn't delivered yet. */
export async function markDispatchDelivered(dispatchId: string, orderId: string) {
  const profile = await getCurrentProfile();
  if (!profile) return { error: "You must be signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("tile_dispatches")
    .update({ status: "delivered", delivered_at: new Date().toISOString() })
    .eq("id", dispatchId);
  if (error) return { error: error.message };

  revalidateDispatchPaths(orderId);
  return { error: null };
}
