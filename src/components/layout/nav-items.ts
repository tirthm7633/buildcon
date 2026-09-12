import {
  BarChart3,
  Bell,
  BookOpen,
  Footprints,
  ListChecks,
  Receipt,
  Settings,
  ShoppingCart,
  Sun,
  Truck,
  Users,
  Users2,
  Wallet,
  FileText,
  type LucideIcon,
} from "lucide-react";

import type { FloorConfig } from "@/lib/floors";
import type { PageFeatureKey, UserRole } from "@/lib/supabase/types";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** role_permissions key gating this item — every item has one, since
   * every page is individually toggleable per role. */
  permissionKey: PageFeatureKey;
  /** Access when no role_permissions row overrides it yet, per gated role.
   * A role not listed here (e.g. Head, until it gets its own spec) defaults
   * to full access — see resolveFeatureAccess in lib/permissions.ts. */
  defaults?: Partial<Record<UserRole, boolean>>;
}

// The three default shapes every page falls into today. Named so a new
// page's own default is a one-word decision, not a guess.
const CORE_TO_STAFF = { staff: true, manager: true };
const RESTRICTED_FOR_STAFF = { staff: false, manager: true };
const MANAGERS_ONE_EXCEPTION = { staff: false, manager: false };

export function getNavItems(floor: FloorConfig): NavItem[] {
  const items: NavItem[] = [];
  const m = floor.modules;

  if (m.today) items.push({ href: "/", label: "Today", icon: Sun, permissionKey: "page.today", defaults: CORE_TO_STAFF });
  items.push({
    href: "/walk-ins",
    label: m.walkInsLabel,
    icon: Footprints,
    permissionKey: "page.walk_ins",
    defaults: CORE_TO_STAFF,
  });
  if (m.catalog)
    items.push({ href: "/catalog", label: "Catalog", icon: BookOpen, permissionKey: "page.catalog", defaults: CORE_TO_STAFF });
  if (m.customers)
    items.push({
      href: "/customers",
      label: "Customers",
      icon: Users,
      permissionKey: "page.customers",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.payments)
    items.push({
      href: "/payments",
      label: "Payments",
      icon: Wallet,
      permissionKey: "page.payments",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.paymentList)
    items.push({
      href: "/payment-list",
      label: "Payment List",
      icon: Receipt,
      permissionKey: "page.payment_list",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.purchases)
    items.push({
      href: "/purchases",
      label: "Purchases",
      icon: ShoppingCart,
      permissionKey: "page.purchases",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.followUps)
    items.push({
      href: "/follow-ups",
      label: "Follow-ups",
      icon: ListChecks,
      permissionKey: "page.follow_ups",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.quotationsLabel)
    items.push({
      href: "/quotations",
      label: m.quotationsLabel,
      icon: FileText,
      permissionKey: "page.quotations",
      defaults: CORE_TO_STAFF,
    });
  if (m.tileOrders)
    items.push({
      href: "/orders",
      label: "Tile Orders",
      icon: Truck,
      permissionKey: "page.tile_orders",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.notifications)
    items.push({
      href: "/notifications",
      label: "Notifications",
      icon: Bell,
      permissionKey: "page.notifications",
      defaults: RESTRICTED_FOR_STAFF,
    });
  if (m.salesData)
    items.push({
      href: "/sales-data",
      label: "Sales Data",
      icon: BarChart3,
      permissionKey: "page.sales_data",
      defaults: MANAGERS_ONE_EXCEPTION,
    });
  if (m.team)
    items.push({ href: "/team", label: "Team", icon: Users2, permissionKey: "page.team", defaults: RESTRICTED_FOR_STAFF });
  if (m.settings)
    items.push({
      href: "/settings",
      label: "Settings",
      icon: Settings,
      permissionKey: "page.settings",
      defaults: RESTRICTED_FOR_STAFF,
    });

  return items;
}

/** Drops items gated by a key present in `disabledKeys` — pass [] for
 * Owner (and for any role with nothing disabled) so nothing is filtered. */
export function filterNavItemsByDisabledKeys(items: NavItem[], disabledKeys: string[]): NavItem[] {
  if (!disabledKeys.length) return items;
  const disabled = new Set(disabledKeys);
  return items.filter((item) => !disabled.has(item.permissionKey));
}
