import type { FollowUpEntity } from "@/lib/supabase/types";

export function getFollowUpEntityHref(entityType: FollowUpEntity, entityId: string) {
  switch (entityType) {
    case "walk_in":
      return `/walk-ins/${entityId}`;
    case "customer":
      return `/customers/${entityId}`;
    case "quotation":
      return `/quotations/${entityId}`;
    case "tile_order":
      return `/orders/${entityId}`;
    case "purchase":
      return `/purchases/${entityId}`;
    case "payment":
      return `/payment-list`;
    default:
      return "/follow-ups";
  }
}
