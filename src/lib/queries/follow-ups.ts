import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getFollowUpEntityHref } from "@/lib/follow-up-links";
import type { FollowUp, FloorId } from "@/lib/supabase/types";

export interface FollowUpWithContext extends FollowUp {
  entityLabel: string;
  href: string;
  assigneeName: string | null;
}

export async function getFollowUpsForFloor(floorId: FloorId): Promise<FollowUpWithContext[]> {
  const supabase = await createClient();

  const [{ data: followUps }, { data: staff }] = await Promise.all([
    supabase.from("follow_ups").select("*").eq("floor_id", floorId).order("due_at", { ascending: true }),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const rows = followUps ?? [];
  const staffById = new Map((staff ?? []).map((s) => [s.id, s.full_name]));

  const idsByType: Record<string, string[]> = {};
  for (const f of rows) {
    idsByType[f.entity_type] = idsByType[f.entity_type] ?? [];
    idsByType[f.entity_type].push(f.entity_id);
  }

  const [walkIns, customers, quotations, orders, purchases] = await Promise.all([
    idsByType.walk_in?.length
      ? supabase.from("walk_ins").select("id, name").in("id", idsByType.walk_in)
      : Promise.resolve({ data: [] }),
    idsByType.customer?.length
      ? supabase.from("customers").select("id, name").in("id", idsByType.customer)
      : Promise.resolve({ data: [] }),
    idsByType.quotation?.length
      ? supabase.from("quotations").select("id, quotation_number").in("id", idsByType.quotation)
      : Promise.resolve({ data: [] }),
    idsByType.tile_order?.length
      ? supabase.from("tile_orders").select("id, order_number").in("id", idsByType.tile_order)
      : Promise.resolve({ data: [] }),
    idsByType.purchase?.length
      ? supabase.from("purchases").select("id, purchase_number").in("id", idsByType.purchase)
      : Promise.resolve({ data: [] }),
  ]);

  const labelMaps: Record<string, Map<string, string>> = {
    walk_in: new Map((walkIns.data ?? []).map((r) => [r.id, r.name])),
    customer: new Map((customers.data ?? []).map((r) => [r.id, r.name])),
    quotation: new Map((quotations.data ?? []).map((r) => [r.id, r.quotation_number])),
    tile_order: new Map((orders.data ?? []).map((r) => [r.id, r.order_number])),
    purchase: new Map((purchases.data ?? []).map((r) => [r.id, r.purchase_number])),
  };

  return rows.map((f) => ({
    ...f,
    entityLabel: labelMaps[f.entity_type]?.get(f.entity_id) ?? f.entity_type.replace("_", " "),
    href: getFollowUpEntityHref(f.entity_type, f.entity_id),
    assigneeName: f.assigned_to ? staffById.get(f.assigned_to) ?? null : null,
  }));
}
