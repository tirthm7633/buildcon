import type {
  CustomerTier,
  DiscountType,
  FollowUpPriority,
  FollowUpType,
  OrderPaymentStatus,
  PaymentMethod,
  PurchaseStatus,
  QuotationStatus,
  TileItemStatus,
  UserRole,
  WalkinSource,
  WalkinStatus,
} from "@/lib/supabase/types";

/** Highest value first — matches how the tier filter tabs and badges order. */
export const CUSTOMER_TIERS: { value: CustomerTier; label: string; badgeClass: string }[] = [
  { value: "vip", label: "VIP", badgeClass: "bg-accent text-accent-foreground border-accent" },
  { value: "trade", label: "Trade", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "retail", label: "Retail", badgeClass: "bg-secondary text-secondary-foreground border-border" },
];

export const WALKIN_STATUSES: { value: WalkinStatus; label: string; badgeClass: string }[] = [
  { value: "new", label: "New", badgeClass: "bg-secondary text-secondary-foreground border-border" },
  { value: "contacted", label: "Contacted", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "visit_completed", label: "Visit Completed", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "quotation_required", label: "Quotation Required", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "quotation_sent", label: "Quotation Sent", badgeClass: "bg-accent text-accent-foreground border-accent" },
  { value: "negotiation", label: "Negotiation", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "won", label: "Converted", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "lost", label: "Lost", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
];

export const WALKIN_SOURCES: { value: WalkinSource; label: string }[] = [
  { value: "walk_in", label: "Walk-in" },
  { value: "referral", label: "Referral" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "website", label: "Website" },
  { value: "call", label: "Call" },
  { value: "architect", label: "Architect" },
  { value: "builder", label: "Builder" },
  { value: "other", label: "Other" },
];

export const QUOTATION_STATUSES: { value: QuotationStatus; label: string; badgeClass: string }[] = [
  { value: "draft", label: "Draft", badgeClass: "bg-secondary text-secondary-foreground border-border" },
  { value: "awaiting_approval", label: "Awaiting Approval", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "sent", label: "Sent", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "viewed", label: "Viewed", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "follow_up_due", label: "Follow-up Due", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "negotiation", label: "Negotiation", badgeClass: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "accepted", label: "Accepted", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "rejected", label: "Rejected", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "expired", label: "Expired", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "revised", label: "Revised", badgeClass: "bg-secondary text-secondary-foreground border-border" },
];

export const DISCOUNT_TYPES: { value: DiscountType; label: string }[] = [
  { value: "flat", label: "Flat amount (₹)" },
  { value: "percent", label: "Percentage (%)" },
];

/** Least to most advanced — order matters, callers rely on array position
 * for bottleneckTileItemStatus. Unlike the old fixed pipeline, this is
 * computed per item from released_at + how many of its boxes have shipped
 * across its dispatches (see tileItemStatus), not a field you advance. */
export const TILE_ITEM_STATUSES: { value: TileItemStatus; label: string; badgeClass: string }[] = [
  { value: "pending", label: "Pending Release", badgeClass: "bg-secondary text-secondary-foreground border-border" },
  { value: "released", label: "Released", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "partially_dispatched", label: "Partially Dispatched", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "dispatched", label: "Dispatched", badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { value: "delivered", label: "Delivered", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

/** boxesDispatched/boxesDelivered are sums across the item's dispatches —
 * "delivered" only once every dispatch covering it has been confirmed
 * delivered, not merely sent. */
export function tileItemStatus(
  item: { boxes_ordered: number | null; released_at: string | null },
  boxesDispatched: number,
  boxesDelivered: number
): TileItemStatus {
  if (!item.released_at) return "pending";
  const ordered = item.boxes_ordered ?? 0;
  if (ordered > 0 && boxesDelivered >= ordered) return "delivered";
  if (boxesDispatched <= 0) return "released";
  if (ordered > 0 && boxesDispatched >= ordered) return "dispatched";
  return "partially_dispatched";
}

export function tileItemStatusIndex(status: TileItemStatus): number {
  return TILE_ITEM_STATUSES.findIndex((s) => s.value === status);
}

/** An order's overall progress is only as far along as its least-advanced
 * product. */
export function bottleneckTileItemStatus(statuses: TileItemStatus[]): TileItemStatus | null {
  if (!statuses.length) return null;
  return statuses.reduce((earliest, s) => (tileItemStatusIndex(s) < tileItemStatusIndex(earliest) ? s : earliest));
}

export const PURCHASE_STATUSES: { value: PurchaseStatus; label: string; badgeClass: string }[] = [
  { value: "draft", label: "Draft", badgeClass: "bg-secondary text-secondary-foreground border-border" },
  { value: "ordered", label: "Ordered", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "partially_received", label: "Partially Received", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "received", label: "Received", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { value: "cancelled", label: "Cancelled", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
];

export const ORDER_PAYMENT_STATUSES: { value: OrderPaymentStatus; label: string; badgeClass: string }[] = [
  { value: "unpaid", label: "Unpaid", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
  { value: "partially_paid", label: "Partially Paid", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "paid", label: "Paid", badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200" },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export const FOLLOW_UP_TYPES: { value: FollowUpType; label: string }[] = [
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "showroom_visit", label: "Showroom Visit" },
  { value: "quotation_follow_up", label: "Quotation Follow-up" },
  { value: "payment_reminder", label: "Payment Reminder" },
  { value: "delivery_confirmation", label: "Delivery Confirmation" },
  { value: "other", label: "Other" },
];

export const FOLLOW_UP_PRIORITIES: { value: FollowUpPriority; label: string; badgeClass: string }[] = [
  { value: "low", label: "Low", badgeClass: "bg-secondary text-secondary-foreground border-border" },
  { value: "normal", label: "Normal", badgeClass: "bg-sky-50 text-sky-700 border-sky-200" },
  { value: "high", label: "High", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "urgent", label: "Urgent", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
];

/** Highest seniority first — matches the per-floor hierarchy (Staff < Manager < Head < Owner). */
export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "head", label: "Head" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

export const ROLE_RANK: Record<UserRole, number> = { owner: 0, head: 1, manager: 2, staff: 3 };

export function findLabel<T extends { value: string; label: string }>(list: readonly T[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export function findBadgeClass<T extends { value: string; badgeClass: string }>(
  list: readonly T[],
  value: string
) {
  return list.find((item) => item.value === value)?.badgeClass ?? "bg-secondary text-secondary-foreground border-border";
}
