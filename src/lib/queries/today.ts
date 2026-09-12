import "server-only";

import { ROLE_RANK } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { FollowUp, FollowUpEntity, FollowUpType, FloorId, Profile } from "@/lib/supabase/types";

// Follow-ups with no resolvable creator (or one outside owner/head/manager) sort
// after every named-assigner group, one rank below the lowest role rank.
const UNASSIGNED_RANK = Math.max(...Object.values(ROLE_RANK)) + 1;

const HANDLE_MINUTES: Record<FollowUpType, number> = {
  call: 10,
  whatsapp: 5,
  email: 5,
  showroom_visit: 30,
  quotation_follow_up: 15,
  payment_reminder: 10,
  delivery_confirmation: 10,
  other: 10,
};

const PRIORITY_WEIGHT: Record<string, number> = { urgent: 3, high: 2, normal: 1, low: 0 };

export interface FollowUpWithValue extends FollowUp {
  value: number;
  entityLabel: string;
}

function startOfMonthISO() {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getTodayDashboardData(floorId: FloorId, profile: Profile) {
  const supabase = await createClient();
  const monthStart = startOfMonthISO();
  const today = new Date().toISOString().slice(0, 10);

  const [
    followUpsRes,
    quotationsRes,
    paymentsRes,
    ordersRes,
    purchasesRes,
  ] = await Promise.all([
    supabase
      .from("follow_ups")
      .select("*")
      .eq("floor_id", floorId)
      .eq("status", "pending")
      .or(`assigned_to.eq.${profile.id},assigned_to.is.null`)
      .order("due_at", { ascending: true }),
    supabase.from("quotations").select("id, status, total, created_at, decided_at").eq("floor_id", floorId),
    supabase.from("payments").select("id, amount, payment_date").eq("floor_id", floorId).gte("payment_date", monthStart.slice(0, 10)),
    floorId === "tiles"
      ? supabase.from("tile_orders").select("id, status, expected_delivery_date, order_value, amount_paid").eq("floor_id", floorId)
      : Promise.resolve({ data: [] as { id: string; status: string; expected_delivery_date: string | null; order_value: number; amount_paid: number }[] }),
    floorId === "sanitary"
      ? supabase.from("purchases").select("id, status, expected_arrival_date").eq("floor_id", floorId)
      : Promise.resolve({ data: [] as { id: string; status: string; expected_arrival_date: string | null }[] }),
  ]);

  const followUps = followUpsRes.data ?? [];
  const quotations = quotationsRes.data ?? [];
  const payments = paymentsRes.data ?? [];
  const orders = ordersRes.data ?? [];
  const purchases = purchasesRes.data ?? [];

  // Resolve a rupee "value at stake" for each follow-up from its linked entity.
  const quotationIds = followUps.filter((f) => f.entity_type === "quotation").map((f) => f.entity_id);
  const walkInIds = followUps.filter((f) => f.entity_type === "walk_in").map((f) => f.entity_id);
  const orderIds = followUps.filter((f) => f.entity_type === "tile_order").map((f) => f.entity_id);
  const creatorIds = [...new Set(followUps.map((f) => f.created_by).filter((id): id is string => Boolean(id)))];

  const [quotationValues, walkInValues, orderValues, creatorProfiles] = await Promise.all([
    quotationIds.length
      ? supabase.from("quotations").select("id, total, customer_id, quotation_number").in("id", quotationIds)
      : Promise.resolve({ data: [] }),
    walkInIds.length
      ? supabase.from("walk_ins").select("id, budget_estimate, name").in("id", walkInIds)
      : Promise.resolve({ data: [] }),
    orderIds.length
      ? supabase.from("tile_orders").select("id, order_value, order_number").in("id", orderIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("profiles").select("id, role").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
  ]);

  const quotationValueMap = new Map((quotationValues.data ?? []).map((q) => [q.id, q]));
  const walkInValueMap = new Map((walkInValues.data ?? []).map((w) => [w.id, w]));
  const orderValueMap = new Map((orderValues.data ?? []).map((o) => [o.id, o]));
  const creatorRoleMap = new Map((creatorProfiles.data ?? []).map((p) => [p.id, p.role]));

  function assignerRank(createdBy: string | null): number {
    if (!createdBy) return UNASSIGNED_RANK;
    const role = creatorRoleMap.get(createdBy);
    return role ? (ROLE_RANK[role] ?? UNASSIGNED_RANK) : UNASSIGNED_RANK;
  }

  function resolveValueAndLabel(entityType: FollowUpEntity, entityId: string): { value: number; label: string } {
    if (entityType === "quotation") {
      const q = quotationValueMap.get(entityId);
      return { value: q?.total ?? 0, label: q?.quotation_number ?? "Quotation" };
    }
    if (entityType === "walk_in") {
      const w = walkInValueMap.get(entityId);
      return { value: w?.budget_estimate ?? 0, label: w?.name ?? "Walk-in" };
    }
    if (entityType === "tile_order") {
      const o = orderValueMap.get(entityId);
      return { value: o?.order_value ?? 0, label: o?.order_number ?? "Order" };
    }
    return { value: 0, label: entityType.replace("_", " ") };
  }

  const enrichedFollowUps: FollowUpWithValue[] = followUps.map((f) => {
    const { value, label } = resolveValueAndLabel(f.entity_type, f.entity_id);
    return { ...f, value, entityLabel: label };
  });

  const sorted = [...enrichedFollowUps].sort((a, b) => {
    // Owner-assigned tasks always first, then Head-, then Manager-assigned —
    // dominates the overdue/priority/due-date tiebreakers below.
    const rankDiff = assignerRank(a.created_by) - assignerRank(b.created_by);
    if (rankDiff !== 0) return rankDiff;
    const overdueA = new Date(a.due_at).getTime() < Date.now() ? 1 : 0;
    const overdueB = new Date(b.due_at).getTime() < Date.now() ? 1 : 0;
    if (overdueA !== overdueB) return overdueB - overdueA;
    const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
    if (pw !== 0) return pw;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  const totalValueAtStake = enrichedFollowUps.reduce((sum, f) => sum + f.value, 0);
  const totalMinutes = enrichedFollowUps.reduce((sum, f) => sum + HANDLE_MINUTES[f.type], 0);

  const acceptedQuotations = quotations.filter((q) => q.status === "accepted");
  const acceptedIds = acceptedQuotations.map((q) => q.id);
  const { data: quotationPayments } = acceptedIds.length
    ? await supabase.from("payments").select("amount, quotation_id").in("quotation_id", acceptedIds)
    : { data: [] as { amount: number; quotation_id: string | null }[] };

  const paidByQuotation = new Map<string, number>();
  for (const p of quotationPayments ?? []) {
    if (!p.quotation_id) continue;
    paidByQuotation.set(p.quotation_id, (paidByQuotation.get(p.quotation_id) ?? 0) + Number(p.amount));
  }
  const outstandingAmount = acceptedQuotations.reduce((sum, q) => {
    const paid = paidByQuotation.get(q.id) ?? 0;
    return sum + Math.max(Number(q.total) - paid, 0);
  }, 0);

  const overdueOrders = orders.filter(
    (o) => o.expected_delivery_date && o.expected_delivery_date < today && !["delivered", "cancelled"].includes(o.status)
  ).length;
  const overduePurchases = purchases.filter(
    (p) => p.expected_arrival_date && p.expected_arrival_date < today && !["received", "cancelled"].includes(p.status)
  ).length;

  const openQuotations = quotations.filter((q) => !["accepted", "rejected", "expired"].includes(q.status));
  const openPipelineValue = openQuotations.reduce((sum, q) => sum + Number(q.total), 0);
  const quotationsThisMonth = quotations.filter((q) => q.created_at >= monthStart).length;
  const wonThisMonth = quotations.filter((q) => q.status === "accepted" && q.decided_at && q.decided_at >= monthStart).length;
  const awaitingApproval = quotations.filter((q) => q.status === "awaiting_approval").length;

  const collectedThisMonth = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  const { data: pipelineQuotationsRaw } = await supabase
    .from("quotations")
    .select("id, quotation_number, status, total, created_at, customer_id")
    .eq("floor_id", floorId)
    .order("created_at", { ascending: false })
    .limit(6);

  const pipelineCustomerIds = (pipelineQuotationsRaw ?? []).map((q) => q.customer_id);
  const { data: pipelineCustomers } = pipelineCustomerIds.length
    ? await supabase.from("customers").select("id, name").in("id", pipelineCustomerIds)
    : { data: [] as { id: string; name: string }[] };
  const pipelineCustomerNames = new Map((pipelineCustomers ?? []).map((c) => [c.id, c.name]));

  const pipelineQuotations = (pipelineQuotationsRaw ?? []).map((q) => ({
    ...q,
    customers: { name: pipelineCustomerNames.get(q.customer_id) ?? "Unknown" },
  }));

  return {
    followUps: sorted,
    totalValueAtStake,
    totalMinutes,
    stats: {
      collectedThisMonth,
      paymentsReceivedCount: payments.length,
      outstandingAmount,
      overdueOrders: floorId === "tiles" ? overdueOrders : overduePurchases,
      openPipelineValue,
      quotationsThisMonth,
      wonThisMonth,
      awaitingApproval,
    },
    pipeline: pipelineQuotations ?? [],
  };
}
